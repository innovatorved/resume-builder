"use client"

import React from "react"
import type { ResumeData } from "@/types/resume"
import { ResumePreview } from "@/components/resume-preview"

const COLOR_FALLBACKS: Record<string, string> = {
  "--background": "#ffffff",
  "--foreground": "#111827",
  "--color-red-50": "#fef2f2",
  "--color-red-300": "#fca5a5",
  "--color-red-400": "#f87171",
  "--color-red-600": "#dc2626",
  "--color-blue-50": "#eff6ff",
  "--color-blue-300": "#93c5fd",
  "--color-blue-400": "#60a5fa",
  "--color-blue-500": "#3b82f6",
  "--color-blue-600": "#2563eb",
  "--color-blue-700": "#1d4ed8",
  "--color-gray-300": "#d1d5db",
  "--color-gray-600": "#4b5563",
  "--color-gray-700": "#374151",
  "--color-gray-800": "#1f2937",
  "--color-gray-900": "#111827",
  "--color-border": "#e5e7eb",
  "--color-white": "#ffffff",
  "--color-black": "#000000",
}

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
  if (existing) {
    return { element: existing, cleanup: undefined as (() => void) | undefined }
  }

  const container = document.createElement("div")
  container.id = "resume-preview-temp"
  container.style.position = "fixed"
  container.style.top = "-10000px"
  container.style.left = "-10000px"
  container.style.width = "210mm"
  container.style.maxWidth = "none"
  container.style.backgroundColor = "#ffffff"
  container.style.pointerEvents = "none"
  container.style.opacity = "0"
  container.style.zIndex = "-1"
  container.style.colorScheme = "light"

  Object.entries(COLOR_FALLBACKS).forEach(([key, value]) => {
    container.style.setProperty(key, value)
  })

  document.body.appendChild(container)

  const { createRoot } = await import("react-dom/client")
  const root = createRoot(container)

  root.render(
    <div style={{ width: "210mm" }}>
      <ResumePreview data={resumeData} />
    </div>
  )

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

  const element = container.querySelector<HTMLElement>("#resume-preview") ?? container

  if (element instanceof HTMLElement) {
    normalizeElementColors(element)
  }

  const cleanup = () => {
    root.unmount()
    container.remove()
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
