"use client";

import type { ResumeData } from "@/types/resume";

function sanitizeFileName(input: string | undefined): string {
  if (!input) return "resume";

  const safe = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  return safe.length > 0 ? safe : "resume";
}

export async function downloadResumePdf(resumeData: ResumeData) {
  console.log("[downloadResumePdf v2] Starting native browser print...");

  try {
    const { ResumePreview } = await import("@/components/resume-preview");
    const React = await import("react");
    const ReactDOM = await import("react-dom/client");

    // Create a hidden iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      throw new Error("Could not access iframe document");
    }

    // Copy styles from the main document to the iframe
    // This ensures Tailwind and other global styles are applied
    const stylePromises = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map((styleNode) => {
      if (styleNode.tagName === 'LINK') {
        const link = styleNode as HTMLLinkElement;
        // Wait for external stylesheets to load? simpler to just clone
        return new Promise<void>((resolve) => {
          const newLink = doc.createElement('link');
          newLink.rel = 'stylesheet';
          newLink.href = link.href;
          newLink.onload = () => resolve();
          newLink.onerror = () => resolve(); // proceed even if fails
          doc.head.appendChild(newLink);
        });
      } else {
        const newStyle = styleNode.cloneNode(true);
        doc.head.appendChild(newStyle);
        return Promise.resolve();
      }
    });

    // Also add explicit print styles to force background printing
    const printStyle = doc.createElement("style");
    printStyle.textContent = `
      @page {
        size: A4;
        margin: 0;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        html, body {
            width: 210mm;
            height: 297mm;   
            overflow: hidden;
        }
      }
      body {
        margin: 0;
        padding: 0;
        background: white;
        width: 210mm;
        min-height: 297mm;
      }
    `;
    doc.head.appendChild(printStyle);


    // Create a root for the React component
    const rootEl = doc.createElement("div");
    rootEl.id = "print-root";
    doc.body.appendChild(rootEl);

    const root = ReactDOM.createRoot(rootEl);

    // Render the resume
    await new Promise<void>((resolve) => {
      root.render(React.createElement(ResumePreview, { data: resumeData }));
      // Give it a moment to render and for styles to apply
      // We wait for styles + a small timeout
      Promise.all(stylePromises).then(() => {
        setTimeout(resolve, 500);
      });
    });

    // Print
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    // Cleanup (optional, maybe wait a bit or listen for afterprint)
    // For now, we remove it after a delay to ensure print dialog doesn't break
    setTimeout(() => {
      root.unmount();
      document.body.removeChild(iframe);
    }, 1000); // 1 second delay might be enough for the dialog to open

    console.log("[downloadResumePdf v2] Print dialog triggered.");

  } catch (error) {
    console.error("[downloadResumePdf v2] Error:", error);
    throw error;
  }
}

export { sanitizeFileName };
