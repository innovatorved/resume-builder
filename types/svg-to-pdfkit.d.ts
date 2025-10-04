declare module "svg-to-pdfkit" {
  import type PDFDocument from "pdfkit"

  type SVGToPDFOptions = {
    width?: number
    height?: number
    preserveAspectRatio?: string
    align?: string
    valign?: string
    assumePt?: boolean
    useCSS?: boolean
    compress?: boolean
    precision?: number
    fontCallback?: (family: string, bold: boolean, italic: boolean) => string | undefined
  }

  function svgToPdf(doc: PDFDocument, svg: string, x: number, y: number, options?: SVGToPDFOptions): PDFDocument

  export default svgToPdf
}
