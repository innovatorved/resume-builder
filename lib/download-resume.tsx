"use client"

import React from "react"
import type { ResumeData } from "@/types/resume"
import { ResumePreview } from "@/components/resume-preview"

const COLOR_PROPERTIES: Array<keyof CSSStyleDeclaration> = [
  "color",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "caretColor",
  "columnRuleColor",
]

let colorCanvasCtx: CanvasRenderingContext2D | null = null

function getColorContext() {
  if (colorCanvasCtx) return colorCanvasCtx
  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  colorCanvasCtx = canvas.getContext("2d")
  return colorCanvasCtx
}

function normalizeCssColor(value: string) {
  if (!value || !value.includes("oklch")) return undefined
  const ctx = getColorContext()
  if (!ctx) return undefined
  try {
    ctx.fillStyle = "#000"
    ctx.fillStyle = value
    return ctx.fillStyle
  } catch (error) {
    console.warn("[downloadResumePdf] Unable to normalize color", value, error)
    return undefined
  }
}

function normalizeElementColors(element: HTMLElement) {
  const computed = window.getComputedStyle(element)

  COLOR_PROPERTIES.forEach((property) => {
    const value = computed[property]
    if (typeof value === "string" && value.includes("oklch")) {
      const normalized = normalizeCssColor(value)
      if (normalized) {
        try {
          ;(element.style as unknown as Record<string, string>)[property as string] = normalized
        } catch {}
      }
    }
  })

  const backgroundImage = computed.backgroundImage
  if (typeof backgroundImage === "string" && backgroundImage.includes("oklch")) {
    element.style.backgroundImage = "none"
  }

  Array.from(element.children).forEach((child) => {
    if (child instanceof HTMLElement) {
      normalizeElementColors(child)
    }
  })
}

function sanitize(input: string | undefined) {
  if (!input) {
    return "resume"
  }

  const safe = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")

  return safe.length > 0 ? safe : "resume"
}

async function ensurePreviewElement(resumeData: ResumeData) {
  const existing = document.getElementById("resume-preview") as HTMLElement | null
  if (existing && existing.offsetWidth > 0) {
    console.log("[ensurePreviewElement] Found existing preview element")
    // Clone the existing element to ensure we get all computed styles
    const clone = existing.cloneNode(true) as HTMLElement
    clone.id = "resume-preview-clone"
    
    // Apply all computed styles inline
    const applyComputedStyles = (source: HTMLElement, target: HTMLElement) => {
      const computedStyle = window.getComputedStyle(source)
      const targetStyle = target.style
      
      // Copy all computed styles
      for (let i = 0; i < computedStyle.length; i++) {
        const prop = computedStyle[i]
        targetStyle.setProperty(prop, computedStyle.getPropertyValue(prop))
      }
      
      // Recursively apply to children
      const sourceChildren = Array.from(source.children) as HTMLElement[]
      const targetChildren = Array.from(target.children) as HTMLElement[]
      
      sourceChildren.forEach((sourceChild, index) => {
        if (targetChildren[index]) {
          applyComputedStyles(sourceChild, targetChildren[index])
        }
      })
    }
    
    applyComputedStyles(existing, clone)
    
    // Append clone to body temporarily
    const tempContainer = document.createElement("div")
    tempContainer.style.position = "fixed"
    tempContainer.style.top = "-10000px"
    tempContainer.style.left = "-10000px"
    tempContainer.style.width = "210mm"
    tempContainer.style.backgroundColor = "#ffffff"
    tempContainer.appendChild(clone)
    document.body.appendChild(tempContainer)
    
    const cleanup = () => {
      tempContainer.remove()
    }
    
    return { element: clone, cleanup }
  }

  console.log("[ensurePreviewElement] Creating new preview element")
  
  const container = document.createElement("div")
  container.id = "resume-preview-temp"
  container.style.position = "fixed"
  container.style.top = "-10000px"
  container.style.left = "-10000px"
  container.style.width = "210mm"
  container.style.maxWidth = "none"
  container.style.minHeight = "297mm"
  container.style.backgroundColor = "#ffffff"
  container.style.pointerEvents = "none"
  container.style.opacity = "0"
  container.style.zIndex = "-1"
  container.style.colorScheme = "light"

  document.body.appendChild(container)

  const { createRoot } = await import("react-dom/client")
  const root = createRoot(container)

  root.render(
    <div style={{ width: "210mm", minHeight: "297mm", backgroundColor: "#ffffff" }}>
      <ResumePreview data={resumeData} />
    </div>
  )

  // Wait longer for rendering and styles to be applied
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    }, 500)
  })

  const element = container.querySelector<HTMLElement>("#resume-preview") ?? container

  console.log("[ensurePreviewElement] Element selected:", element.id, element.offsetWidth, "x", element.offsetHeight)

  if (element instanceof HTMLElement) {
    normalizeElementColors(element)
  }

  const cleanup = () => {
    console.log("[ensurePreviewElement] Cleaning up temporary element")
    root.unmount()
    container.remove()
  }

  return { element, cleanup }
}

export async function downloadResumePdf(resumeData: ResumeData) {
  console.log("[downloadResumePdf] Starting PDF generation process...")
  
  try {
    const html2canvas = (await import("html2canvas-pro")).default
    const { jsPDF } = await import("jspdf")
    console.log("[downloadResumePdf] Libraries loaded successfully")

    const { element, cleanup } = await ensurePreviewElement(resumeData)

    console.log("[downloadResumePdf] Element found:", element)
    console.log("[downloadResumePdf] Element dimensions:", element.offsetWidth, "x", element.offsetHeight)

    if (!element || element.offsetWidth === 0 || element.offsetHeight === 0) {
      throw new Error("Resume preview element not found or has zero dimensions")
    }

    const scale = 3 // Higher quality

    try {
      console.log("[downloadResumePdf] Starting html2canvas with scale:", scale)
      console.log("[downloadResumePdf] Element computed styles:", window.getComputedStyle(element).backgroundColor)
      
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        x: 0,
        y: 0,
        onclone: (clonedDoc) => {
          console.log("[downloadResumePdf] Document cloned for rendering")
          const clonedElement = clonedDoc.getElementById(element.id)
          if (clonedElement) {
            clonedElement.style.display = "block"
            clonedElement.style.position = "relative"
            clonedElement.style.margin = "0"
            clonedElement.style.padding = "0"
          }
        },
      })

      console.log("[downloadResumePdf] Canvas created:", canvas.width, "x", canvas.height)

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("Generated canvas has zero dimensions")
      }

      const imgData = canvas.toDataURL("image/png", 1.0)
      console.log("[downloadResumePdf] Image data length:", imgData.length)

      if (!imgData || imgData === "data:,") {
        throw new Error("Failed to generate image data from canvas")
      }

      const orientation = "portrait"
      const pdf = new jsPDF({ 
        orientation, 
        unit: "mm", 
        format: "a4",
        compress: true
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      console.log("[downloadResumePdf] PDF dimensions:", pdfWidth, "x", pdfHeight)

      // Calculate dimensions to fill PDF page edge-to-edge (no margins)
      const imgAspectRatio = canvas.width / canvas.height
      const pdfAspectRatio = pdfWidth / pdfHeight
      
      let imgWidth = pdfWidth
      let imgHeight = pdfWidth / imgAspectRatio
      let xOffset = 0
      let yOffset = 0
      
      // If image is taller than PDF, fit by height
      if (imgHeight > pdfHeight) {
        imgHeight = pdfHeight
        imgWidth = pdfHeight * imgAspectRatio
        xOffset = (pdfWidth - imgWidth) / 2
      } else {
        // Center vertically if shorter
        yOffset = (pdfHeight - imgHeight) / 2
      }

      console.log("[downloadResumePdf] Adding image to PDF:", {
        x: xOffset,
        y: yOffset,
        width: imgWidth,
        height: imgHeight
      })

      pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight, undefined, "FAST")

      const fileName = `${sanitize(resumeData.personalInfo.name)}.pdf`
      console.log("[downloadResumePdf] Saving as:", fileName)
      pdf.save(fileName)
      console.log("[downloadResumePdf] PDF saved successfully!")
    } catch (error) {
      console.error("[downloadResumePdf] Error during PDF generation:", error)
      throw error
    } finally {
      cleanup?.()
    }
  } catch (error) {
    console.error("[downloadResumePdf] Fatal error:", error)
    throw error
  }
}

export function sanitizeFileName(input: string | undefined) {
  return sanitize(input)
}
