"use client"

import React from "react"
import type { ResumeData } from "@/types/resume"
import { ResumePreview } from "@/components/resume-preview"

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
  if (existing) {
    return { element: existing, cleanup: undefined as (() => void) | undefined }
  }

  const iframe = document.createElement("iframe")
  iframe.style.position = "fixed"
  iframe.style.top = "-10000px"
  iframe.style.left = "-10000px"
  iframe.style.width = "210mm"
  iframe.style.border = "none"

  // The iframe needs to load before we can access its document
  let iframePromiseResolve: (value: unknown) => void
  const iframePromise = new Promise((resolve) => {
    iframePromiseResolve = resolve
  })
  iframe.onload = iframePromiseResolve
  document.body.appendChild(iframe)
  await iframePromise

  const iframeDoc = iframe.contentDocument
  if (!iframeDoc) {
    throw new Error("Could not access iframe document")
  }

  // Copy stylesheets from the main document to the iframe
  const links = document.querySelectorAll('link[rel="stylesheet"]')
  links.forEach((link) => {
    iframeDoc.head.appendChild(link.cloneNode(true))
  })

  // Copy style tags from the main document to the iframe
  const styles = document.querySelectorAll("style")
  styles.forEach((style) => {
    iframeDoc.head.appendChild(style.cloneNode(true))
  })

  // The container for our React component inside the iframe
  const container = iframeDoc.createElement("div")
  iframeDoc.body.appendChild(container)
  iframeDoc.body.style.margin = "0" // Reset body margin

  const { createRoot } = await import("react-dom/client")
  const root = createRoot(container)

  // We need to wrap the preview in a div that sets the width,
  // as the body of the iframe will be wider.
  root.render(
    <div style={{ width: "210mm" }}>
      <ResumePreview data={resumeData} />
    </div>,
  )

  // Wait for styles and content to be applied.
  // A small delay is often necessary for external resources like fonts.
  await new Promise((resolve) => setTimeout(resolve, 500))

  const element = container.querySelector<HTMLElement>("#resume-preview") ?? container

  const cleanup = () => {
    root.unmount()
    iframe.remove()
  }

  return { element, cleanup }
}

export async function downloadResumePdf(resumeData: ResumeData) {
  const html2canvas = (await import("html2canvas")).default
  const { jsPDF } = await import("jspdf")

  const { element, cleanup } = await ensurePreviewElement(resumeData)

  const scaleBase = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  const scale = Math.min(3, Math.max(scaleBase, 2))

  try {
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
    })

    const imgData = canvas.toDataURL("image/png")

    const orientation = canvas.width >= canvas.height ? "landscape" : "portrait"
    const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const ratio = canvas.height / canvas.width

    let renderWidth = pdfWidth
    let renderHeight = renderWidth * ratio

    if (renderHeight > pdfHeight) {
      renderHeight = pdfHeight
      renderWidth = renderHeight / ratio
    }

    const offsetX = (pdfWidth - renderWidth) / 2
    const offsetY = (pdfHeight - renderHeight) / 2

    pdf.addImage(imgData, "PNG", offsetX, offsetY, renderWidth, renderHeight, undefined, "FAST")

    const fileName = `${sanitize(resumeData.personalInfo.name)}.pdf`
    pdf.save(fileName)
  } finally {
    cleanup?.()
  }
}

export function sanitizeFileName(input: string | undefined) {
  return sanitize(input)
}