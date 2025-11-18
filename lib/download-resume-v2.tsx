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
  console.log("[downloadResumePdf v2] Starting ATS-compatible PDF generation...");

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

    // Render the ResumePreview component
    const root = ReactDOM.createRoot(container);
    const previewElement = React.createElement(ResumePreview, { data: resumeData });

    await new Promise<void>((resolve) => {
      root.render(previewElement);
      setTimeout(resolve, 500);
    });

    const existingElement = container.querySelector("#resume-preview") as HTMLElement;

    if (!existingElement) {
      throw new Error("Failed to render resume preview for download.");
    }

    // Create PDF with A4 size
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // First, extract all text content in reading order for ATS
    const extractTextContent = (element: HTMLElement): string[] => {
      const lines: string[] = [];
      
      // Helper to recursively get text
      const getText = (node: HTMLElement) => {
        // Get direct text content
        const textContent = Array.from(node.childNodes)
          .filter(child => child.nodeType === Node.TEXT_NODE)
          .map(child => child.textContent?.trim())
          .filter(text => text && text.length > 0)
          .join(" ");
        
        if (textContent) {
          lines.push(textContent);
        }
        
        // Process children
        Array.from(node.children).forEach(child => {
          if (child instanceof HTMLElement) {
            getText(child);
          }
        });
      };
      
      getText(element);
      return lines;
    };

    const textLines = extractTextContent(existingElement);
    
    // Add invisible text layer at the bottom of the page
    // This will be extracted by ATS but not visible
    pdf.setFontSize(1); // Tiny font
    pdf.setTextColor(255, 255, 255); // White text on white background
    let textY = pdfHeight - 2;
    
    for (const line of textLines) {
      if (line.trim()) {
        pdf.text(line, 0.1, textY);
        textY -= 0.5;
        if (textY < 0) break; // Stop if we run out of space
      }
    }

    // Add the background canvas image
    const clone = existingElement.cloneNode(true) as HTMLElement;
    const cloneContainer = document.createElement("div");
    cloneContainer.style.position = "fixed";
    cloneContainer.style.top = "0";
    cloneContainer.style.left = "-10000px";
    cloneContainer.style.width = "210mm";
    cloneContainer.style.height = "auto";
    cloneContainer.style.backgroundColor = "#ffffff";
    cloneContainer.appendChild(clone);
    document.body.appendChild(cloneContainer);

    await new Promise(resolve => setTimeout(resolve, 100));

    const renderedCanvas = await html2canvas(clone, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: clone.scrollWidth,
      height: clone.scrollHeight,
    });

    const imgData = renderedCanvas.toDataURL("image/png", 1.0);
    const canvasAspectRatio = renderedCanvas.width / renderedCanvas.height;
    
    let imgWidth = pdfWidth;
    let imgHeight = pdfWidth / canvasAspectRatio;
    let xOffset = 0;
    let yOffset = 0;

    if (imgHeight > pdfHeight) {
      imgHeight = pdfHeight;
      imgWidth = pdfHeight * canvasAspectRatio;
      xOffset = (pdfWidth - imgWidth) / 2;
    } else {
      yOffset = (pdfHeight - imgHeight) / 2;
    }

    // Add background image
    pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight, undefined, "FAST");

    // Cleanup
    root.unmount();
    container.remove();
    cloneContainer.remove();

    const fileName = `${sanitizeFileName(resumeData.personalInfo.name)}.pdf`;
    console.log("[downloadResumePdf v2] Saving ATS-compatible PDF as:", fileName);
    pdf.save(fileName);

    console.log("[downloadResumePdf v2] ATS-compatible PDF saved successfully!");
  } catch (error) {
    console.error("[downloadResumePdf v2] Error:", error);
    throw error;
  }
}

export { sanitizeFileName };
