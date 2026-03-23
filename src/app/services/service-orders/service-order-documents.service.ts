import { Injectable } from "@angular/core"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { EquipmentType, ServiceOrder, ServiceType } from "../../models/service-orders/service-order"
import { ServiceOrderAgreement } from "../../models/service-orders/service-agreement"

type OrderSummaryContext = {
  serviceOrder: ServiceOrder
  agreement: ServiceOrderAgreement | null
}

@Injectable({ providedIn: "root" })
export class ServiceOrderDocumentsService {
  downloadOrderSummaryPdf(context: OrderSummaryContext): void {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const serviceOrder = context.serviceOrder
    const quote = context.agreement
    const isCommercial = serviceOrder.serviceType === ServiceType.STANDARD_SERVICE && !!quote

    this.drawHeader(doc, "Resumen de orden de servicio", serviceOrder.code)

    let cursorY = 30
    cursorY = this.drawInfoGrid(doc, cursorY, [
      ["Fecha y hora", this.formatDateTime(serviceOrder.createdAt)],
      ["Estado", this.getOrderStatusLabel(serviceOrder.status)],
      ["Tipo de servicio", this.getServiceTypeLabel(serviceOrder.serviceType)],
      ["Cliente", this.getClientName(serviceOrder)],
      ["Documento", this.getClientDocument(serviceOrder)],
      ["Telefono", serviceOrder.clientSnapshotPhone || serviceOrder.contactPhone || "-"],
      ["Correo", serviceOrder.clientSnapshotEmail || serviceOrder.contactEmail || "-"],
    ])

    cursorY = this.drawSectionTitle(doc, cursorY + 5, "Equipo")
    cursorY = this.drawMultilineBlock(doc, cursorY, [
      `Tipo: ${this.getEquipmentTypeLabel(serviceOrder.equipmentType, serviceOrder.equipmentTypeOther)}`,
      `Marca: ${serviceOrder.brand || "-"}`,
      `Modelo: ${serviceOrder.model || "-"}`,
      `Serie/Identificador: ${serviceOrder.serialNumber || "-"}`,
      `Accesorios: ${serviceOrder.accessories || "-"}`,
      `Notas u observaciones: ${serviceOrder.notes || "-"}`,
    ])

    if (serviceOrder.serviceType === ServiceType.DIAGNOSIS) {
      cursorY = this.drawSectionTitle(doc, cursorY + 5, "Detalle inicial")
      cursorY = this.drawParagraph(doc, cursorY, serviceOrder.initialIssue || "Sin detalle registrado.")
    }

    if (isCommercial && quote) {
      cursorY = this.drawSectionTitle(doc, cursorY + 5, "Detalle comercial")
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
        head: [["Tipo", "Descripcion", "Cantidad", "P. unitario", "Importe"]],
        body: rows,
        theme: "grid",
        styles: {
          font: "courier",
          fontSize: 9.5,
          cellPadding: 2.3,
          lineColor: [25, 25, 25],
          lineWidth: 0.2,
          textColor: [20, 20, 20],
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [20, 20, 20],
          fontStyle: "bold",
          lineColor: [25, 25, 25],
          lineWidth: 0.25,
        },
        margin: { left: 10, right: 10 },
        tableWidth: 190,
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 86 },
          2: { cellWidth: 22, halign: "right" },
          3: { cellWidth: 30, halign: "right" },
          4: { cellWidth: 30, halign: "right" },
        },
      })

      const finalY = (doc as any).lastAutoTable?.finalY ?? cursorY
      cursorY = finalY + 7
      const subtotal = Number(quote.totalAmount || 0)
      const discount = Number(serviceOrder.discount || 0)
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
    const { serviceOrder } = context
    const width = 118
    const margin = 1.5
    const maxChars = 68
    const columnChars = 34
    const lineHeight = 4
    const pageLines: string[] = []
    const fields: Array<[string, string]> = [
      ["Tipo", this.getEquipmentTypeLabel(serviceOrder.equipmentType, serviceOrder.equipmentTypeOther)],
      ["Marca", serviceOrder.brand || "-"],
      ["Modelo", serviceOrder.model || "-"],
      ["Serie", serviceOrder.serialNumber || "-"],
      ["Accesorios", serviceOrder.accessories || "-"],
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

    const pageHeight = Math.max(30, margin * 2 + pageLines.length * lineHeight + 1.5)
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [width, pageHeight] })
    doc.setFont("courier", "normal")
    doc.setFontSize(8.1)

    let currentY = margin + 1.6
    pageLines.forEach((line) => {
      doc.text(line, margin, currentY)
      currentY += lineHeight
    })

    const blobUrl = doc.output("bloburl")
    window.open(blobUrl, "_blank", "noopener")
  }

  private drawHeader(doc: jsPDF, title: string, code: string): void {
    doc.setDrawColor(20, 20, 20)
    doc.setLineWidth(0.5)
    doc.line(10, 12, 200, 12)
    doc.setFont("courier", "bold")
    doc.setFontSize(16)
    doc.text(title.toUpperCase(), 105, 20, { align: "center" })
    doc.setFontSize(12)
    doc.text(code, 105, 27, { align: "center" })
    doc.line(10, 31, 200, 31)
    doc.setTextColor(20, 20, 20)
  }

  private drawInfoGrid(doc: jsPDF, startY: number, rows: string[][]): number {
    const leftX = 10
    const rightX = 106
    const rowHeight = 10

    rows.forEach((row, index) => {
      const currentX = index % 2 === 0 ? leftX : rightX
      const currentY = startY + Math.floor(index / 2) * rowHeight
      const value = row[1] || "-"

      doc.setFont("courier", "bold")
      doc.setFontSize(9.5)
      doc.text(`${row[0]}:`, currentX, currentY)
      doc.setFont("courier", "normal")
      doc.text(doc.splitTextToSize(value, 84), currentX, currentY + 4.5)
    })

    return startY + Math.ceil(rows.length / 2) * rowHeight + 1
  }

  private drawSectionTitle(doc: jsPDF, y: number, title: string): number {
    doc.setDrawColor(20, 20, 20)
    doc.setLineWidth(0.3)
    doc.line(10, y, 200, y)
    doc.setFont("courier", "bold")
    doc.setFontSize(11)
    doc.text(title.toUpperCase(), 10, y + 6)
    return y + 10
  }

  private drawMultilineBlock(doc: jsPDF, startY: number, lines: string[]): number {
    let y = startY
    doc.setFont("courier", "normal")
    doc.setFontSize(10.5)
    lines.forEach((line) => {
      const split = doc.splitTextToSize(line, 190)
      doc.text(split, 10, y)
      y += split.length * 5.2
    })
    return y
  }

  private drawParagraph(doc: jsPDF, startY: number, text: string): number {
    doc.setFont("courier", "normal")
    doc.setFontSize(10.5)
    const split = doc.splitTextToSize(text || "-", 190)
    doc.text(split, 10, startY)
    return startY + split.length * 5.2
  }

  private drawTotals(doc: jsPDF, startY: number, rows: Array<[string, string]>): number {
    let y = startY
    doc.setDrawColor(20, 20, 20)
    doc.line(128, y - 4, 200, y - 4)
    rows.forEach(([label, value], index) => {
      doc.setFont("courier", index === rows.length - 1 ? "bold" : "normal")
      doc.setFontSize(index === rows.length - 1 ? 11 : 10)
      doc.text(label, 130, y)
      doc.text(value, 200, y, { align: "right" })
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

  private getEquipmentTypeLabel(type?: EquipmentType | null, equipmentTypeOther?: string | null): string {
    if (type === EquipmentType.OTHER && equipmentTypeOther?.trim()) {
      return equipmentTypeOther.trim()
    }
    const labels: Record<string, string> = {
      LAPTOP: "Laptop",
      DESKTOP_PC: "PC de escritorio",
      ALL_IN_ONE: "All in One",
      PRINTER: "Impresora",
      SCANNER: "Escaner",
      PROJECTOR: "Proyector",
      MONITOR: "Monitor",
      SERVER: "Servidor",
      NETWORK_DEVICE: "Equipo de red",
      OTHER: "Otro",
    }
    return labels[String(type ?? "")] || String(type ?? "-")
  }

  private getServiceTypeLabel(type: ServiceType): string {
    const labels: Record<ServiceType, string> = {
      [ServiceType.STANDARD_SERVICE]: "Estandar",
      [ServiceType.DIAGNOSIS]: "Diagnostico",
      [ServiceType.WARRANTY_SERVICE]: "Garantia",
      [ServiceType.ASSEMBLY]: "Ensamblaje",
      [ServiceType.CUSTOMER_SERVICE]: "Atencion al cliente",
    }
    return labels[type] || type
  }

  private getOrderStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      OPEN: "Abierto",
      ACTIVE: "En progreso",
      READY_FOR_PICKUP: "Listo para entrega",
      DELIVERED: "Entregado",
      CANCELLED: "Cancelado",
      CLOSED_NO_SOLUTION: "Sin solucion",
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


