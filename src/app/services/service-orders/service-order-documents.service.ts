import { Injectable } from "@angular/core"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { ServiceOrder } from "../../models/service-orders/service-order"
import { ServiceOrderItem, ServiceType } from "../../models/service-orders/service-order-item"
import { ServiceOrderQuote } from "../../models/service-orders/service-quote"

type OrderSummaryContext = {
  serviceOrder: ServiceOrder
  item: ServiceOrderItem
  quote: ServiceOrderQuote | null
}

@Injectable({ providedIn: "root" })
export class ServiceOrderDocumentsService {
  downloadOrderSummaryPdf(context: OrderSummaryContext): void {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const item = context.item
    const serviceOrder = context.serviceOrder
    const quote = context.quote
    const isCommercial = item.serviceType === ServiceType.STANDARD_SERVICE && !!quote

    this.drawHeader(doc, "Resumen de orden de servicio", serviceOrder.code)

    let cursorY = 34
    cursorY = this.drawInfoGrid(doc, cursorY, [
      ["Fecha y hora", this.formatDateTime(serviceOrder.createdAt)],
      ["Estado", this.getOrderStatusLabel(serviceOrder.status)],
      ["Tipo de servicio", this.getServiceTypeLabel(item.serviceType)],
      ["Cliente", this.getClientName(serviceOrder)],
      ["Documento", this.getClientDocument(serviceOrder)],
      ["Teléfono", serviceOrder.clientSnapshotPhone || serviceOrder.contactPhone || "-"],
      ["Correo", serviceOrder.clientSnapshotEmail || serviceOrder.contactEmail || "-"],
      ["Método de pago", isCommercial ? "No registrado" : "No aplica en esta etapa"],
    ])

    cursorY = this.drawSectionTitle(doc, cursorY + 4, "Equipo")
    cursorY = this.drawMultilineBlock(doc, cursorY, [
      `Tipo: ${this.getEquipmentTypeLabel(item)}`,
      `Marca: ${item.brand || "-"}`,
      `Modelo: ${item.model || "-"}`,
      `Serie/Identificador: ${item.serialNumber || "-"}`,
      `Accesorios: ${item.accessories || "-"}`,
      `Notas u observaciones: ${serviceOrder.notes || "-"}`,
    ])

    if (item.serviceType === ServiceType.DIAGNOSIS) {
      cursorY = this.drawSectionTitle(doc, cursorY + 4, "Detalle inicial")
      cursorY = this.drawParagraph(doc, cursorY, item.initialIssue || "Sin detalle registrado.")
    }

    if (isCommercial && quote) {
      cursorY = this.drawSectionTitle(doc, cursorY + 4, "Detalle comercial")
      const rows: Array<Array<string | number>> = []

      quote.productItems.forEach((product) => {
        rows.push([
          "Producto",
          product.productNameSnapshot || "Producto",
          Number(product.quantity || 0).toFixed(2),
          this.formatCurrency(product.unitPrice),
          this.formatCurrency(product.lineTotal),
        ])
      })

      quote.serviceItems.forEach((service) => {
        rows.push([
          "Servicio",
          service.serviceNameSnapshot || "Servicio",
          "1.00",
          this.formatCurrency(service.unitPrice),
          this.formatCurrency(service.lineTotal),
        ])
      })

      autoTable(doc, {
        startY: cursorY,
        head: [["Tipo", "Descripción", "Cantidad", "P. unitario", "Importe"]],
        body: rows,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [31, 64, 104], textColor: 255 },
        margin: { left: 14, right: 14 },
      })

      const finalY = (doc as any).lastAutoTable?.finalY ?? cursorY
      cursorY = finalY + 6
      const subtotal = Number(quote.totalAmount || 0)
      const discount = Number(item.discount || 0)
      const total = Math.max(0, subtotal - discount)

      cursorY = this.drawTotals(doc, cursorY, [
        ["Subtotal", this.formatCurrency(subtotal)],
        ["Descuentos", this.formatCurrency(discount)],
        ["Total", this.formatCurrency(total)],
      ])
    }

    doc.save(`${serviceOrder.code}-resumen.pdf`)
  }

  openEquipmentStickerPdf(context: OrderSummaryContext): void {
    const { serviceOrder, item } = context
    const width = 112
    const margin = 2.5
    const maxChars = 48
    const columnChars = 24
    const lineHeight = 4
    const pageLines: string[] = []
    const fields: Array<[string, string]> = [
      ["Tipo", this.getEquipmentTypeLabel(item)],
      ["Marca", item.brand || "-"],
      ["Modelo", item.model || "-"],
      ["Serie", item.serialNumber || "-"],
      ["Accesorios", item.accessories || "-"],
      ["Ingreso", this.formatDateTime(serviceOrder.createdAt)],
      ["Estado", this.getOrderStatusLabel(serviceOrder.status)],
      ["Notas", serviceOrder.notes || "-"],
    ]

    pageLines.push(this.centerThermalText("ORDEN", maxChars))
    pageLines.push(this.centerThermalText(serviceOrder.code, maxChars))
    pageLines.push("-".repeat(maxChars))

    const pendingColumns: string[][] = []

    fields.forEach(([label, value]) => {
      const fieldLines = this.buildThermalFieldLines(label, value, maxChars, columnChars)
      const fitsColumn = fieldLines.every((line) => line.length <= columnChars)

      if (!fitsColumn) {
        if (pendingColumns.length === 1) {
          pageLines.push(this.padThermalText(pendingColumns[0][0] || "", maxChars))
          pendingColumns.length = 0
        }
        pageLines.push(...fieldLines)
        return
      }

      pendingColumns.push(fieldLines)
      if (pendingColumns.length === 2) {
        pageLines.push(...this.composeThermalColumnRow(pendingColumns[0], pendingColumns[1], columnChars))
        pendingColumns.length = 0
      }
    })

    if (pendingColumns.length === 1) {
      pageLines.push(this.padThermalText(pendingColumns[0][0] || "", maxChars))
    }

    pageLines.push("-".repeat(maxChars))

    const pageHeight = Math.max(34, margin * 2 + pageLines.length * lineHeight + 1.5)
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [width, pageHeight] })
    doc.setFont("courier", "normal")
    doc.setFontSize(8.8)

    let currentY = margin + 1.8
    pageLines.forEach((line, index) => {
      doc.text(line, margin, currentY)
      currentY += lineHeight
      if (index === 1) {
        doc.setFont("courier", "normal")
      }
    })

    const blobUrl = doc.output("bloburl")
    window.open(blobUrl, "_blank", "noopener")
  }

  private drawHeader(doc: jsPDF, title: string, code: string): void {
    doc.setFillColor(31, 64, 104)
    doc.rect(0, 0, 210, 22, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(17)
    doc.text(title, 14, 12)
    doc.setFontSize(10)
    doc.text(`Orden ${code}`, 14, 18)
    doc.setTextColor(20, 20, 20)
  }

  private drawInfoGrid(doc: jsPDF, startY: number, rows: string[][]): number {
    let y = startY
    rows.forEach((row, index) => {
      const leftX = index % 2 === 0 ? 14 : 108
      const currentY = y + Math.floor(index / 2) * 11
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.text(row[0], leftX, currentY)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.text(row[1] || "-", leftX, currentY + 5)
    })
    return startY + Math.ceil(rows.length / 2) * 11
  }

  private drawSectionTitle(doc: jsPDF, y: number, title: string): number {
    doc.setDrawColor(220, 226, 232)
    doc.line(14, y, 196, y)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text(title, 14, y + 6)
    return y + 10
  }

  private drawMultilineBlock(doc: jsPDF, startY: number, lines: string[]): number {
    let y = startY
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    lines.forEach((line) => {
      const split = doc.splitTextToSize(line, 180)
      doc.text(split, 14, y)
      y += split.length * 5
    })
    return y
  }

  private drawParagraph(doc: jsPDF, startY: number, text: string): number {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    const split = doc.splitTextToSize(text || "-", 180)
    doc.text(split, 14, startY)
    return startY + split.length * 5
  }

  private drawTotals(doc: jsPDF, startY: number, rows: Array<[string, string]>): number {
    let y = startY
    rows.forEach(([label, value], index) => {
      doc.setFont("helvetica", index === rows.length - 1 ? "bold" : "normal")
      doc.setFontSize(index === rows.length - 1 ? 11 : 10)
      doc.text(label, 142, y)
      doc.text(value, 196, y, { align: "right" })
      y += 6
    })
    return y
  }

  private getClientName(serviceOrder: ServiceOrder): string {
    return serviceOrder.clientSnapshotName || serviceOrder.client?.name || serviceOrder.contactName || "Sin cliente"
  }

  private getClientDocument(serviceOrder: ServiceOrder): string {
    const docType = serviceOrder.clientSnapshotDocumentTypeName || ""
    const docNumber = serviceOrder.clientSnapshotDocumentNumber || serviceOrder.client?.documentNumber || ""
    return [docType, docNumber].filter(Boolean).join(": ") || "-"
  }

  private getEquipmentTypeLabel(item: ServiceOrderItem): string {
    if (item.equipmentType === "OTHER" && item.equipmentTypeOther?.trim()) {
      return item.equipmentTypeOther.trim()
    }
    const labels: Record<string, string> = {
      LAPTOP: "Laptop",
      DESKTOP_PC: "PC de escritorio",
      ALL_IN_ONE: "All in One",
      PRINTER: "Impresora",
      SCANNER: "Escáner",
      PROJECTOR: "Proyector",
      MONITOR: "Monitor",
      SERVER: "Servidor",
      NETWORK_DEVICE: "Equipo de red",
      OTHER: "Otro",
    }
    return labels[item.equipmentType] || item.equipmentType
  }

  private getServiceTypeLabel(type: ServiceType): string {
    const labels: Record<ServiceType, string> = {
      [ServiceType.STANDARD_SERVICE]: "Estándar",
      [ServiceType.DIAGNOSIS]: "Diagnóstico",
      [ServiceType.WARRANTY_SERVICE]: "Garantía",
      [ServiceType.ASSEMBLY]: "Ensamblaje",
      [ServiceType.CUSTOMER_SERVICE]: "Atención al cliente",
    }
    return labels[type] || type
  }

  private getOrderStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      OPEN: "Abierto",
      IN_PROGRESS: "En progreso",
      PARTIALLY_COMPLETED: "Parcialmente completado",
      COMPLETED: "Completado",
      CANCELLED: "Cancelado",
    }
    return labels[status] || status
  }

  private formatCurrency(value: number): string {
    return `S/ ${Number(value || 0).toFixed(2)}`
  }

  private formatDateTime(value: string | Date | null | undefined): string {
    if (!value) return "-"
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("es-PE")
  }

  private formatDate(value: string | Date | null | undefined): string {
    if (!value) return "-"
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("es-PE")
  }

  private formatTime(value: string | Date | null | undefined): string {
    if (!value) return "-"
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? "-"
      : date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  private centerThermalText(value: string, width: number): string {
    const normalized = String(value || "").trim().slice(0, width)
    const leftPadding = Math.max(0, Math.floor((width - normalized.length) / 2))
    const rightPadding = Math.max(0, width - normalized.length - leftPadding)
    return `${" ".repeat(leftPadding)}${normalized}${" ".repeat(rightPadding)}`
  }

  private padThermalText(value: string, width: number): string {
    const normalized = String(value || "")
    return normalized.length >= width ? normalized.slice(0, width) : normalized.padEnd(width, " ")
  }

  private composeThermalColumnRow(leftLines: string[], rightLines: string[], columnChars: number): string[] {
    const rows: string[] = []
    const rowHeight = Math.max(leftLines.length, rightLines.length)

    for (let index = 0; index < rowHeight; index += 1) {
      const left = this.padThermalText(leftLines[index] || "", columnChars)
      const right = this.padThermalText(rightLines[index] || "", columnChars)
      rows.push(`${left}${right}`)
    }

    return rows
  }

  private buildThermalFieldLines(label: string, value: string, maxChars: number, columnChars: number): string[] {
    const normalized = `${label}: ${String(value || "-").replace(/\s+/g, " ").trim()}`
    if (normalized.length <= columnChars) {
      return [normalized]
    }

    return this.wrapThermalText(normalized, maxChars)
  }

  private wrapThermalText(value: string, width: number): string[] {
    const words = String(value || "").split(" ").filter(Boolean)
    if (!words.length) {
      return ["-"]
    }

    const lines: string[] = []
    let current = ""

    words.forEach((word) => {
      if (!current) {
        current = word
        return
      }

      if (`${current} ${word}`.length <= width) {
        current = `${current} ${word}`
        return
      }

      lines.push(current)
      current = word
    })

    if (current) {
      lines.push(current)
    }

    return lines
  }
}
