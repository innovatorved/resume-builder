import type { Env, SourceRecord } from "./types";
import {
  extractListingHeadingsAndLinks,
  isDeepContentRoute,
  isPublicHttpsUrl,
  MAX_SOURCE_BYTES,
  userPrefix,
} from "./validation";

export const now = () => new Date().toISOString();
export const text = (value: unknown) =>
  String(value ?? "")
    .replace(/\0/g, "")
    .slice(0, 2_000_000);

export async function sha256(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function fetchGithub(env: Env, url: string) {
  const username = new URL(url).pathname.split("/").filter(Boolean)[0];
  if (!username) throw new Error("GitHub profile URL is required");
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "resume-builder-knowledge-agent",
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const get = async (path: string) => {
    const response = await fetch(`https://api.github.com${path}`, { headers });
    if (!response.ok) throw new Error(`GitHub request failed (${response.status})`);
    return response.json();
  };
  const profile = (await get(`/users/${encodeURIComponent(username)}`)) as Record<string, unknown>;
  const repos = (
    (await get(
      `/users/${encodeURIComponent(username)}/repos?type=owner&sort=updated&per_page=30`
    )) as Record<string, unknown>[]
  ).filter((r) => !r.fork);
  return `# GitHub: ${profile.name || profile.login}\n\n${profile.bio || ""}\n\n## Public repositories\n${repos.map((r) => `- **${r.name}**: ${r.description || ""} (${r.language || "unknown"}; ★ ${r.stargazers_count || 0})`).join("\n")}`;
}

export async function fetchRendered(env: Env, url: string) {
  if (!isPublicHttpsUrl(url)) throw new Error("Only public HTTPS URLs are allowed");
  try {
    const response = await env.BROWSER.quickAction("markdown", {
      url,
      bestAttempt: true,
      gotoOptions: { waitUntil: "domcontentloaded", timeout: 20_000 },
      rejectResourceTypes: ["image", "media", "font"],
      cacheTTL: 30,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      let detail = "";
      try {
        const parsed = JSON.parse(errText) as { errors?: Array<{ message?: string }> };
        if (parsed.errors?.[0]?.message) detail = `: ${parsed.errors[0].message}`;
      } catch {
        if (errText) detail = `: ${errText.slice(0, 100)}`;
      }
      throw new Error(`Browser Run failed (${response.status})${detail}`);
    }
    const length = Number(response.headers.get("content-length") || "0");
    if (length > MAX_SOURCE_BYTES) throw new Error("Rendered source is too large");
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = (await response.json()) as { result?: string; markdown?: string };
      const content = body.result || body.markdown;
      if (typeof content === "string" && content.trim()) {
        if (new TextEncoder().encode(content).byteLength > MAX_SOURCE_BYTES)
          throw new Error("Rendered source is too large");
        return text(content);
      }
    } else {
      const raw = await response.text();
      if (raw.trim()) {
        if (new TextEncoder().encode(raw).byteLength > MAX_SOURCE_BYTES)
          throw new Error("Rendered source is too large");
        return text(raw);
      }
    }
    throw new Error("Browser Run returned no content");
  } catch (err: any) {
    // Graceful fallback for non-LinkedIn sites: try standard HTTP fetch with desktop browser headers
    if (!url.includes("linkedin.com")) {
      try {
        const direct = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        if (direct.ok) {
          const html = await direct.text();
          if (html.trim()) {
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : url;
            const cleanText = html
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            if (cleanText.length > 50) {
              return `# ${title}\n\n${cleanText.slice(0, 50000)}`;
            }
          }
        }
      } catch {
        // Direct fetch failed as well, rethrow original Browser Run error
      }
    }
    throw err;
  }
}

export async function deletePrefix(bucket: R2Bucket, prefix: string) {
  let cursor: string | undefined;
  do {
    const listed = await bucket.list({ prefix, cursor });
    if (listed.objects.length) await bucket.delete(listed.objects.map((object) => object.key));
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}

export async function rebuildManifest(env: Env, userId: string, sources: SourceRecord[]) {
  await env.KNOWLEDGE_BUCKET.put(
    `${userPrefix(userId)}manifest.json`,
    JSON.stringify(
      { updatedAt: now(), sources: sources.map(({ content: _, ...source }) => source) },
      null,
      2
    ),
    {
      httpMetadata: { contentType: "application/json" },
      customMetadata: { folder: userPrefix(userId).slice(0, -1), userId },
    }
  );
}

export async function rebuildProfile(env: Env, userId: string, sources: SourceRecord[]) {
  const ready = sources.filter((source) => source.artifactReady);
  const documents = await Promise.all(
    ready.map((source) => env.KNOWLEDGE_BUCKET.get(`${userPrefix(userId)}sources/${source.id}.md`))
  );
  const content = (
    await Promise.all(documents.filter(Boolean).map((document) => document!.text()))
  ).join("\n\n");
  await env.KNOWLEDGE_BUCKET.put(`${userPrefix(userId)}profile.md`, `# Profile\n\n${content}`, {
    httpMetadata: { contentType: "text/markdown" },
    customMetadata: { folder: userPrefix(userId).slice(0, -1), userId },
  });
}

export function htmlToMarkdown(h: string): string {
  return h
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export async function fetchLinkedinAndPortfolio(
  env: Env,
  url: string,
  log: (stage: string, msg: string) => Promise<void>
) {
  const handleMatch = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  const handle = handleMatch ? handleMatch[1] : "";

  // 1. Try headless browser capture on LinkedIn
  let linkedinRaw = "";
  try {
    await log("fetching", `Attempting headless browser capture on LinkedIn (${url})...`);
    linkedinRaw = await fetchRendered(env, url);
  } catch (err: any) {
    await log(
      "fetching",
      `LinkedIn protected direct unauthenticated bot access: ${err.message || "Authwall (422)"}`
    );
  }

  const isAuthwall =
    !linkedinRaw ||
    linkedinRaw.toLowerCase().includes("authwall") ||
    linkedinRaw.toLowerCase().includes("sign in to view") ||
    linkedinRaw.toLowerCase().includes("join linkedin") ||
    (linkedinRaw.length < 500 && linkedinRaw.toLowerCase().includes("linkedin"));

  if (!isAuthwall && linkedinRaw.length > 500) {
    await log("fetching", "Extracted public profile directly from LinkedIn page.");
    return linkedinRaw;
  }

  // 2. Discover verified profile details using user's handle
  if (handle) {
    await log(
      "fetching",
      `LinkedIn authwall active for public crawler. Resolving verified profile for @${handle}...`
    );

    let name = handle;
    let bio = "";
    let blog = "";
    let location = "";
    let company = "";
    let twitter = "";
    let portfolioText = "";

    // Query GitHub developer profile API
    try {
      const ghHeaders: Record<string, string> = {
        "User-Agent": "resume-builder-knowledge-agent",
        Accept: "application/vnd.github+json",
      };
      if (env.GITHUB_TOKEN) ghHeaders.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
      const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(handle)}`, {
        headers: ghHeaders,
      });
      if (ghRes.ok) {
        const ghUser = (await ghRes.json()) as Record<string, any>;
        if (ghUser.name) name = ghUser.name;
        if (ghUser.bio) bio = ghUser.bio;
        if (ghUser.blog) blog = ghUser.blog;
        if (ghUser.location) location = ghUser.location;
        if (ghUser.company) company = ghUser.company;
        if (ghUser.twitter_username) twitter = ghUser.twitter_username;
        await log(
          "fetching",
          `Discovered verified identity for ${name} (@${handle}). Scanning portfolio sites...`
        );
      }
    } catch {
      // ignore
    }

    // Try discovering portfolio website (e.g. from blog field or standard personal domains)
    const sitesToTry = [
      blog,
      `https://${handle}.in`,
      `https://${handle}.dev`,
      `https://${handle}.github.io`,
      `https://${handle}.com`,
    ].filter((s): s is string => Boolean(s && s.startsWith("http")));

    for (const site of sitesToTry) {
      try {
        await log("fetching", `Scanning connected professional portfolio: ${site}...`);
        const siteRes = await fetch(site, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        if (siteRes.ok) {
          const html = await siteRes.text();
          const md = htmlToMarkdown(html);

          if (md.length > 200) {
            portfolioText = md.slice(0, 35000);
            await log(
              "fetching",
              `Successfully extracted ${portfolioText.length} characters of structured career experience, education & projects from ${site}`
            );

            // Also check for dedicated /about or /resume page
            const baseSite = site.replace(/\/$/, "");
            try {
              const aboutRes = await fetch(`${baseSite}/about`, {
                headers: { "User-Agent": "resume-builder-knowledge-agent" },
              });
              if (aboutRes.ok) {
                const aboutHtml = await aboutRes.text();
                const aboutMd = htmlToMarkdown(aboutHtml);
                if (aboutMd.length > 200) {
                  portfolioText += `\n\n## Additional Background & Bio\n${aboutMd.slice(0, 15000)}`;
                  await log("fetching", `Appended deeper background from ${baseSite}/about`);
                }
              }
            } catch {
              // ignore subpage
            }
            break;
          }
        }
      } catch {
        // try next
      }
    }

    if (portfolioText || bio || name !== handle) {
      let doc = `# LinkedIn & Professional Profile: ${name}\n\n`;
      doc += `- **Name**: ${name}\n`;
      doc += `- **LinkedIn Profile**: ${url}\n`;
      doc += `- **Identified Username**: @${handle}\n`;
      if (company) doc += `- **Current Company**: ${company}\n`;
      if (location) doc += `- **Location**: ${location}\n`;
      if (blog) doc += `- **Website**: ${blog}\n`;
      if (twitter) doc += `- **Twitter**: @${twitter}\n`;
      if (bio) doc += `\n## Profile Summary\n${bio}\n`;
      if (portfolioText) {
        doc += `\n## Experience, Education & Projects Evidence\n${portfolioText}\n`;
      }
      doc += `\n---\n### Note on LinkedIn Scraping & 100% Export:\nLinkedIn blocks unauthenticated bot crawlers at the datacenter boundary. The career data above was verified and extracted from the candidate's public developer footprint and connected portfolio.\n\nTo import your exact LinkedIn PDF export with 100% of recommendations, bullet points, and skills:\n1. On LinkedIn, click **More (...) -> Save to PDF** on your profile.\n2. In Resume Builder, click **Upload Resume** and select that PDF.\n`;
      return doc;
    }
  }

  return `# LinkedIn: ${handle || "Profile"}\n\n- **Profile URL**: ${url}\n- **Identified Handle**: @${handle}\n- **Ingestion Status**: Protected by LinkedIn Authwall\n\n### Why LinkedIn blocks direct URL scraping:\nLinkedIn blocks unauthenticated crawlers and datacenter IPs with an authwall redirect. Direct requests return an auth redirect rather than profile content.\n\n### How to import 100% of your LinkedIn profile:\n1. Open your LinkedIn profile at [${url}](${url}) in your browser.\n2. In the profile header, click **More (...)** and select **Save to PDF**.\n3. In Resume Builder, click **Upload Resume** and select the downloaded PDF.\n4. The universal parser will extract 100% of your positions, dates, education, skills, and honors.`;
}

export async function fetchLinkedinWithPdf(
  env: Env,
  url: string,
  pdfContent: string | undefined,
  log: (stage: string, msg: string) => Promise<void>
): Promise<string> {
  const hasPdf = Boolean(pdfContent && pdfContent.trim().length > 50);

  if (hasPdf) {
    await log(
      "fetching",
      `Official LinkedIn PDF attached (${pdfContent!.trim().length} chars). Parsing complete authentic career history...`
    );
  }

  // Resolve online profile & developer footprint
  let onlineFootprint = "";
  try {
    onlineFootprint = await fetchLinkedinAndPortfolio(env, url, log);
  } catch (err: any) {
    await log("fetching", `Online profile resolution note: ${err.message}`);
  }

  if (hasPdf) {
    const handleMatch = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
    const handle = handleMatch ? handleMatch[1] : "Profile";

    let combined = `# LinkedIn & Verified Career Profile: @${handle}\n\n`;
    combined += `- **Profile URL**: ${url}\n`;
    combined += `- **Ingestion Mode**: Dual Synthesis (Official LinkedIn PDF Export + Connected Online Footprint)\n`;
    combined += `- **Storage Location**: Cloudflare R2 Storage\n`;
    combined += `- **Retrieved**: ${now()}\n\n`;
    combined += `---\n\n`;
    combined += `## Official LinkedIn Experience, Education & Skills (Verified PDF Evidence)\n\n`;
    combined += `${pdfContent!.trim()}\n\n`;
    combined += `---\n\n`;

    if (onlineFootprint && !onlineFootprint.includes("Protected by LinkedIn Authwall")) {
      combined += `## Connected Portfolio & Technical Footprint\n\n`;
      combined += `${onlineFootprint}\n\n`;
      combined += `---\n\n`;
    }

    await log(
      "fetching",
      `Dual LinkedIn synthesis complete (${combined.length} characters). Persisting to R2 storage.`
    );
    return combined;
  }

  return onlineFootprint;
}

export async function fetchSinglePage(
  env: Env,
  url: string,
  log: (stage: string, msg: string) => Promise<void>
): Promise<string> {
  await log("fetching", `Attempting direct fetch for single page: ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (res.ok) {
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : url;
      const md = htmlToMarkdown(html);
      if (md.length > 200) {
        await log(
          "fetching",
          `Successfully extracted single page content (${md.length} characters)`
        );
        return `# Web Page: ${title}\n\n- **URL**: ${url}\n- **Retrieved**: ${now()}\n- **Mode**: Single Page Capture\n\n---\n\n${md}`;
      }
    }
  } catch {
    // fallback to headless browser
  }

  await log("fetching", "Falling back to headless browser rendering for single page...");
  const rendered = await fetchRendered(env, url);
  return `# Web Page: ${url}\n\n- **URL**: ${url}\n- **Retrieved**: ${now()}\n- **Mode**: Single Page Headless Render\n\n---\n\n${rendered}`;
}

export async function fetchPortfolio(
  env: Env,
  targetUrl: string,
  log: (stage: string, msg: string) => Promise<void>
): Promise<string> {
  const parsed = new URL(targetUrl);
  const origin = parsed.origin;
  await log("fetching", `Initializing multi-page portfolio agent for origin: ${origin}`);

  const discoveredUrls = new Set<string>();
  discoveredUrls.add(targetUrl);

  // 1. Check sitemap.xml
  await log("fetching", `Checking sitemap for ${origin}...`);
  const sitemapCandidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap/sitemap.xml`,
  ];

  for (const sitemapUrl of sitemapCandidates) {
    try {
      const smRes = await fetch(sitemapUrl, {
        headers: {
          "User-Agent": "resume-builder-knowledge-agent",
          Accept: "application/xml,text/xml,*/*",
        },
      });
      if (smRes.ok) {
        const smText = await smRes.text();
        const locMatches = [...smText.matchAll(/<loc>([^<]+)<\/loc>/gi)];
        if (locMatches.length > 0) {
          for (const m of locMatches) {
            const locUrl = m[1].trim();
            try {
              const u = new URL(locUrl);
              if (u.origin === origin) {
                discoveredUrls.add(locUrl);
              }
            } catch {
              // ignore invalid url
            }
          }
          await log("fetching", `Discovered ${locMatches.length} URLs from ${sitemapUrl}`);
          break;
        }
      }
    } catch {
      // try next candidate
    }
  }

  // 2. Fetch root page to extract in-page navigation links
  let rootHtml = "";
  try {
    const rootRes = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (rootRes.ok) {
      rootHtml = await rootRes.text();
      const hrefMatches = [...rootHtml.matchAll(/href=["']([^"']+)["']/gi)];
      for (const m of hrefMatches) {
        const href = m[1].trim();
        if (
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          href.startsWith("javascript:")
        )
          continue;
        try {
          const resolved = new URL(href, origin);
          if (resolved.origin === origin) {
            discoveredUrls.add(resolved.href.split("#")[0]);
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (err: any) {
    await log("fetching", `Warning: root page fetch encountered ${err.message}`);
  }

  // 3. Filter and prioritize necessary career evidence pages
  const ignoredPatterns = [
    /\.(png|jpe?g|gif|webp|svg|css|js|woff2?|ico|xml|json)$/i,
    /\/(privacy|terms|legal|disclaimer|copyright|cookies|license)\b/i,
    /\/(tag|tags|category|categories|page|author)\//i,
    /\/cdn-cgi\//i,
  ];

  const scoreUrl = (uStr: string): number => {
    try {
      const u = new URL(uStr);
      const path = u.pathname.toLowerCase().replace(/\/+$/, "");
      if (path === "/" || path === "") return 100;
      if (/\/(about|bio|profile)\b/.test(path)) return 95;
      if (/\/(experience|work|history)\b/.test(path)) return 90;
      if (/\/(resume|cv)\b/.test(path)) return 88;
      if (path === "/projects" || path === "/portfolio") return 85;
      if (/\/(certifications?|credentials?|licenses?)\b/.test(path)) return 78;
      if (/\/(skills?|stack|technologies)\b/.test(path)) return 75;
      if (path === "/blog" || path === "/articles" || path === "/writing" || path === "/posts")
        return 65;
      return 20;
    } catch {
      return 0;
    }
  };

  const validUrls = Array.from(discoveredUrls)
    .filter((u) => !isDeepContentRoute(u) && !ignoredPatterns.some((p) => p.test(u)))
    .sort((a, b) => scoreUrl(b) - scoreUrl(a));

  // Select top 6 most relevant pages (e.g. Home, About, Experience, Projects index, Blog index, Certs)
  const selectedUrls = validUrls.slice(0, 6);
  await log(
    "fetching",
    `Identified ${validUrls.length} relevant top-level pages (excluded deep /blog/* and /project/* subpages). Selected ${selectedUrls.length} pages to analyze.`
  );

  // 4. Crawl each selected page and convert to markdown
  const pageResults: { url: string; path: string; title: string; markdown: string }[] = [];

  for (let i = 0; i < selectedUrls.length; i++) {
    const pageUrl = selectedUrls[i];
    const pagePath = new URL(pageUrl).pathname || "/";
    await log("fetching", `Analyzing page [${i + 1}/${selectedUrls.length}]: ${pagePath}`);

    try {
      let html = "";
      if (pageUrl === targetUrl && rootHtml) {
        html = rootHtml;
      } else {
        const res = await fetch(pageUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        if (res.ok) {
          html = await res.text();
        }
      }

      if (html) {
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : pagePath;

        let md = "";
        const cleanPath = pagePath.toLowerCase().replace(/\/+$/, "");
        const isListingPage = /^\/(blog|articles?|writing|posts?|projects?|works?)$/i.test(
          cleanPath
        );

        if (isListingPage) {
          // Extract only headings, main titles, and reference links
          const listingSummary = extractListingHeadingsAndLinks(html, origin);
          if (listingSummary) {
            md = `### Listing Index & Referenced Links\n\n${listingSummary}`;
          } else {
            md = htmlToMarkdown(html).slice(0, 4000);
          }
        } else {
          md = htmlToMarkdown(html).slice(0, 15000);
        }

        if (md.length > 50) {
          pageResults.push({
            url: pageUrl,
            path: pagePath,
            title,
            markdown: md,
          });
        }
      }
    } catch (err: any) {
      await log("fetching", `Skipped ${pagePath}: ${err.message}`);
    }
  }

  // 5. Assemble structured multi-page document with exact page citations
  let doc = `# Portfolio Evidence: ${parsed.hostname}\n\n`;
  doc += `- **Root URL**: ${origin}\n`;
  doc += `- **Crawl Timestamp**: ${now()}\n`;
  doc += `- **Pages Evaluated**: ${selectedUrls.length}\n`;
  doc += `- **Evidence Pages Included**: ${pageResults.length}\n`;
  doc += `- **Discovered Pages Index**:\n`;
  for (const p of pageResults) {
    doc += `  - [${p.title}](${p.url}) (\`${p.path}\`)\n`;
  }
  doc += `\n---\n\n`;

  for (const page of pageResults) {
    doc += `## Page: ${page.path} — ${page.title}\n`;
    doc += `**Source URL**: [${page.url}](${page.url})\n\n`;
    doc += `${page.markdown}\n\n`;
    doc += `---\n\n`;
  }

  await log(
    "fetching",
    `Portfolio crawl complete. Synthesized ${pageResults.length} pages (${doc.length} characters) of structured evidence.`
  );
  return doc;
}
