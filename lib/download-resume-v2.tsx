"use client"

import type { ResumeData } from "@/types/resume"

function sanitizeFileName(input: string | undefined): string {
  if (!input) return "resume"
  
  const safe = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")

  return safe.length > 0 ? safe : "resume"
}

export async function downloadResumePdf(resumeData: ResumeData) {
  console.log("[downloadResumePdf v2] Starting PDF generation...")
  
  try {
    const html2canvas = (await import("html2canvas-pro")).default
    const { jsPDF } = await import("jspdf")
    
    // Find the existing resume preview element
    const existingElement = document.getElementById("resume-preview")
    
    if (!existingElement) {
      throw new Error("Resume preview element not found. Please view the resume first.")
    }
    
    console.log("[downloadResumePdf v2] Found element:", existingElement.offsetWidth, "x", existingElement.offsetHeight)
    
    // Create a temporary container with the element
    const container = document.createElement("div")
    container.style.position = "fixed"
    container.style.top = "0"
    container.style.left = "-10000px"
    container.style.width = "210mm"
    container.style.backgroundColor = "#ffffff"
    container.style.padding = "0"
    container.style.margin = "0"
    
    // Clone the element and all its styles
    const clone = existingElement.cloneNode(true) as HTMLElement
    
    // Function to copy computed styles to inline styles
    // html2canvas-pro supports modern CSS including oklch colors
    const copyStyles = (source: Element, target: Element) => {
      if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement)) return
      
      const computedStyle = window.getComputedStyle(source)
      
      // Copy important computed style properties
      for (let i = 0; i < computedStyle.length; i++) {
        const prop = computedStyle[i]
        const value = computedStyle.getPropertyValue(prop)
        
        // Skip certain properties that can cause issues
        if (prop.startsWith('webkit') || prop.startsWith('moz') || prop === 'transition') {
          continue
        }
        
        try {
          target.style.setProperty(prop, value, 'important')
        } catch (e) {
          // Ignore errors for properties that can't be set
        }
      }
      
      // Handle children recursively
      const sourceChildren = Array.from(source.children)
      const targetChildren = Array.from(target.children)
      
      sourceChildren.forEach((sourceChild, index) => {
        if (targetChildren[index]) {
          copyStyles(sourceChild, targetChildren[index])
        }
      })
    }
    
    copyStyles(existingElement, clone)
    
    // Ensure the clone has proper dimensions
    clone.style.width = '210mm'
    clone.style.backgroundColor = '#ffffff'
    
    container.appendChild(clone)
    document.body.appendChild(container)
    
    // Wait for styles to be applied and rendering to complete
    await new Promise(resolve => setTimeout(resolve, 500))
    
    console.log("[downloadResumePdf v2] Clone dimensions:", clone.offsetWidth, "x", clone.offsetHeight)
    console.log("[downloadResumePdf v2] Generating canvas...")
    
    const renderedCanvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: clone.scrollWidth,
      height: clone.scrollHeight,
    })
    
    console.log("[downloadResumePdf v2] Canvas created:", renderedCanvas.width, "x", renderedCanvas.height)
    
    // Clean up the temporary container
    container.remove()
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    })
    
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    
    const imgData = renderedCanvas.toDataURL("image/jpeg", 0.95)
    
    // Calculate dimensions to fit the page
    const imgWidth = pdfWidth
    const imgHeight = (renderedCanvas.height * imgWidth) / renderedCanvas.width
    
    if (imgHeight <= pdfHeight) {
      // Single page
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight)
    } else {
      // Multiple pages
      let heightLeft = imgHeight
      let position = 0
      
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
        heightLeft -= pdfHeight
      }
    }
    
    const fileName = `${sanitizeFileName(resumeData.personalInfo.name)}.pdf`
    console.log("[downloadResumePdf v2] Saving as:", fileName)
    pdf.save(fileName)
    
    console.log("[downloadResumePdf v2] PDF saved successfully!")
  } catch (error) {
    console.error("[downloadResumePdf v2] Error:", error)
    throw error
  }
}

export { sanitizeFileName }
