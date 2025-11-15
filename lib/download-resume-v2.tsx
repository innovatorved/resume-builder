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
  console.log("[downloadResumePdf v2] Starting PDF generation...");

  try {
    const html2canvas = (await import("html2canvas-pro")).default;
    const { jsPDF } = await import("jspdf");
    const { ResumePreview } = await import("@/components/resume-preview");
    const React = await import("react");
    const ReactDOM = await import("react-dom/client");

    // Create a temporary container for rendering
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "-10000px";
    container.style.width = "210mm";
    container.style.height = "auto";
    container.style.backgroundColor = "#ffffff";
    container.style.padding = "0";
    container.style.margin = "0";
    container.style.overflow = "visible";
    container.style.boxSizing = "border-box";
    document.body.appendChild(container);

    // Render the ResumePreview component into the container
    const root = ReactDOM.createRoot(container);
    const previewElement = React.createElement(ResumePreview, { data: resumeData });

    // Wait for rendering to complete
    await new Promise<void>((resolve) => {
      root.render(previewElement);
      // Give React time to render and styles to apply
      setTimeout(resolve, 500);
    });

    // Get the rendered element
    const existingElement = container.querySelector("#resume-preview") as HTMLElement;

    if (!existingElement) {
      throw new Error("Failed to render resume preview for download.");
    }

    console.log(
      "[downloadResumePdf v2] Rendered element:",
      existingElement.offsetWidth,
      "x",
      existingElement.offsetHeight
    );

    // Clone the element and all its styles
    const clone = existingElement.cloneNode(true) as HTMLElement;

    // Function to copy computed styles to inline styles
    // html2canvas-pro supports modern CSS including oklch colors
    const copyStyles = (source: Element, target: Element) => {
      if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement)) return;

      const computedStyle = window.getComputedStyle(source);

      // Copy important computed style properties
      for (let i = 0; i < computedStyle.length; i++) {
        const prop = computedStyle[i];
        const value = computedStyle.getPropertyValue(prop);

        // Skip certain properties that can cause issues
        if (prop.startsWith("webkit") || prop.startsWith("moz") || prop === "transition") {
          continue;
        }

        try {
          target.style.setProperty(prop, value, "important");
        } catch (e) {
          // Ignore errors for properties that can't be set
        }
      }

      // Handle children recursively
      const sourceChildren = Array.from(source.children);
      const targetChildren = Array.from(target.children);

      sourceChildren.forEach((sourceChild, index) => {
        if (targetChildren[index]) {
          copyStyles(sourceChild, targetChildren[index]);
        }
      });
    };

    copyStyles(existingElement, clone);

    // Ensure the clone has proper dimensions and no extra spacing
    clone.style.width = "210mm";
    clone.style.height = "auto";
    clone.style.backgroundColor = "#ffffff";
    clone.style.margin = "0";
    clone.style.padding = "0";
    clone.style.boxSizing = "border-box";
    clone.style.display = "block";

    // Create a separate container for the clone to avoid React unmount issues
    const cloneContainer = document.createElement("div");
    cloneContainer.style.position = "fixed";
    cloneContainer.style.top = "0";
    cloneContainer.style.left = "-10000px";
    cloneContainer.style.width = "210mm";
    cloneContainer.style.height = "auto";
    cloneContainer.style.backgroundColor = "#ffffff";
    cloneContainer.appendChild(clone);
    document.body.appendChild(cloneContainer);

    // Wait for styles to be applied and rendering to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log("[downloadResumePdf v2] Clone dimensions:", {
      offsetWidth: clone.offsetWidth,
      offsetHeight: clone.offsetHeight,
      scrollWidth: clone.scrollWidth,
      scrollHeight: clone.scrollHeight,
      margin: window.getComputedStyle(clone).margin,
      padding: window.getComputedStyle(clone).padding,
    });

    const cloneRect = clone.getBoundingClientRect();
    const linkAnnotations = Array.from(clone.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .map((anchor) => {
        const href = anchor.getAttribute("href")?.trim();

        if (!href || href === "#") {
          return null;
        }

        const rect = anchor.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
          return null;
        }

        return {
          href,
          left: rect.left - cloneRect.left,
          top: rect.top - cloneRect.top,
          width: rect.width,
          height: rect.height,
        };
      })
      .filter(
        (
          entry
        ): entry is {
          href: string;
          left: number;
          top: number;
          width: number;
          height: number;
        } => Boolean(entry)
      );

    console.log("[downloadResumePdf v2] Captured anchor annotations:", linkAnnotations.length);
    console.log("[downloadResumePdf v2] Generating canvas...");

    const renderedCanvas = await html2canvas(clone, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: clone.scrollWidth,
      height: clone.scrollHeight,
      windowWidth: clone.scrollWidth,
      windowHeight: clone.scrollHeight,
      x: 0,
      y: 0,
    });

    console.log(
      "[downloadResumePdf v2] Canvas created:",
      renderedCanvas.width,
      "x",
      renderedCanvas.height
    );

    // Clean up both containers
    root.unmount();
    container.remove();
    cloneContainer.remove();

    // Create PDF with no margins
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Use PNG for better quality and transparency handling
    const imgData = renderedCanvas.toDataURL("image/png", 1.0);

    // Calculate dimensions to fill the page edge-to-edge
    const canvasAspectRatio = renderedCanvas.width / renderedCanvas.height;
    const pdfAspectRatio = pdfWidth / pdfHeight;

    let imgWidth = pdfWidth;
    let imgHeight = pdfWidth / canvasAspectRatio;
    let xOffset = 0;
    let yOffset = 0;

    // If image is taller than PDF page, fit by height
    if (imgHeight > pdfHeight) {
      imgHeight = pdfHeight;
      imgWidth = pdfHeight * canvasAspectRatio;
      xOffset = (pdfWidth - imgWidth) / 2;
    } else {
      // Center vertically if image is shorter
      yOffset = (pdfHeight - imgHeight) / 2;
    }

    // Add image with calculated dimensions (no margins)
    pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight, undefined, "FAST");

    console.log("[downloadResumePdf v2] PDF dimensions:", {
      pdfWidth,
      pdfHeight,
      imgWidth,
      imgHeight,
      xOffset,
      yOffset,
    });

    if (linkAnnotations.length > 0 && cloneRect.width > 0 && cloneRect.height > 0) {
      const widthRatio = imgWidth / cloneRect.width;
      const heightRatio = imgHeight / cloneRect.height;

      linkAnnotations.forEach((annotation) => {
        const linkX = xOffset + annotation.left * widthRatio;
        const linkY = yOffset + annotation.top * heightRatio;
        const linkWidth = annotation.width * widthRatio;
        const linkHeight = annotation.height * heightRatio;

        pdf.link(linkX, linkY, linkWidth, linkHeight, { url: annotation.href });
      });

      console.log("[downloadResumePdf v2] Added link annotations to PDF:", linkAnnotations.length);
    }

    const fileName = `${sanitizeFileName(resumeData.personalInfo.name)}.pdf`;
    console.log("[downloadResumePdf v2] Saving as:", fileName);
    pdf.save(fileName);

    console.log("[downloadResumePdf v2] PDF saved successfully!");
  } catch (error) {
    console.error("[downloadResumePdf v2] Error:", error);
    throw error;
  }
}

export { sanitizeFileName };
