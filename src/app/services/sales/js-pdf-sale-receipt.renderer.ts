import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { SaleReceiptPdfModel, assertSaleReceiptVariant } from '../../models/sales/sale-receipt-pdf.model';

type PdfDocument = jsPDF & { lastAutoTable?: { finalY: number } };

export function createSaleReceiptPdfDocument(): PdfDocument {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as PdfDocument;
}

@Injectable({ providedIn: 'root' })
export class JsPdfSaleReceiptRenderer {
  render(model: SaleReceiptPdfModel): string {
    assertSaleReceiptVariant(model.variant);

    const doc = this.createDocument();
    this.renderHeader(doc, model);

    if (model.variant === 'linked-summary') {
      this.renderLinkedSummary(doc, model);
    } else {
      this.renderFullReceipt(doc, model);
    }

    doc.save(model.document.fileName);
    return model.document.fileName;
  }

  protected createDocument(): PdfDocument {
    return createSaleReceiptPdfDocument();
  }

  protected renderAutoTable(doc: PdfDocument, options: Parameters<typeof autoTable>[1]): void {
    autoTable(doc, options);
  }

  private renderHeader(doc: PdfDocument, model: SaleReceiptPdfModel): void {
    let y = 13;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(model.company.name, 15, y);

    doc.setFontSize(9);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Direccion:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(model.company.address, 31, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Telefono:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(model.company.phone, 31, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Correo:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(model.company.email, 29, y);

    const rightBoxX = 130;
    const rightBoxY = 10;
    const rightBoxW = 65;
    const rightBoxH = 28;

    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(255, 255, 255);
    doc.rect(rightBoxX, rightBoxY, rightBoxW, rightBoxH, 'FD');

    let boxY = rightBoxY + 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('RUC:', rightBoxX + 18, boxY);
    doc.text(model.company.ruc, rightBoxX + 28, boxY);

    boxY += 7;
    doc.setFontSize(10);
    doc.text(model.document.title, 143, boxY);

    boxY += 6;
    doc.setFontSize(11);
    doc.text(`${model.document.series}-${model.document.number}`, rightBoxX + 20, boxY);
  }

  private renderFullReceipt(doc: PdfDocument, model: SaleReceiptPdfModel): void {
    this.renderAutoTable(doc, {
      startY: 50,
      head: [[{ content: 'Informacion General', colSpan: 6, styles: { fillColor: [88, 88, 88], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' } }]],
      body: [
        [
          { content: 'Cliente:', styles: { fontStyle: 'bold', fillColor: [189, 189, 189] } },
          { content: model.customer.name },
          { content: 'Direccion:', styles: { fontStyle: 'bold', fillColor: [189, 189, 189] } },
          { content: model.customer.address || '-', colSpan: 3 },
        ],
        [
          { content: 'Documento:', styles: { fontStyle: 'bold', fillColor: [189, 189, 189] } },
          { content: model.customer.documentNumber },
          { content: 'Fecha de Emision:', styles: { fontStyle: 'bold', fillColor: [189, 189, 189] } },
          { content: model.document.issueDateLabel, colSpan: 3 },
        ],
        [
          { content: 'Tipo de Pago:', styles: { fontStyle: 'bold', fillColor: [189, 189, 189] } },
          { content: model.payment.methodLabel },
          { content: 'Moneda:', styles: { fontStyle: 'bold', fillColor: [189, 189, 189] } },
          { content: model.payment.currencyLabel, colSpan: 3 },
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
      margin: { left: 15, right: 15 },
    } as never);

    let y = (doc.lastAutoTable?.finalY || 50) + 8;
    doc.setFillColor(88, 88, 88);
    doc.rect(15, y, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');

    doc.text(model.labels.itemIndex, 17, y + 5.5);
    doc.text('Descripcion', 25, y + 5.5);
    doc.text('Und', 115, y + 5.5);
    doc.text('Cant', 135, y + 5.5);
    doc.text('P.Unit', 152, y + 5.5);
    doc.text('Importe', 175, y + 5.5);

    doc.setTextColor(0, 0, 0);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    for (const item of model.items) {
      doc.text(String(item.index), 17, y + 4);
      doc.text(this.truncate(item.description, 45), 25, y + 4);
      doc.text(item.unitLabel, 115, y + 4);
      doc.text(String(item.quantity), 135, y + 4);
      doc.text(item.unitPrice.toFixed(2), 152, y + 4);
      doc.text(item.total.toFixed(2), 175, y + 4);
      y += 6;
    }

    y += 3;
    doc.setDrawColor(200, 200, 200);
    doc.line(120, y, 195, y);
    y += 5;
    doc.setFontSize(9);
    doc.text('Subtotal:', 145, y);
    doc.text(`S/ ${model.totals.subtotal.toFixed(2)}`, 180, y, { align: 'right' });
    y += 4;

    if (model.totals.discount > 0) {
      doc.text('Descuento:', 145, y);
      doc.text(`S/ ${model.totals.discount.toFixed(2)}`, 180, y, { align: 'right' });
      y += 4;
    }

    if (model.totals.tax > 0) {
      doc.text('IGV (18%):', 145, y);
      doc.text(`S/ ${model.totals.tax.toFixed(2)}`, 180, y, { align: 'right' });
      y += 4;
    }

    y += 1;
    doc.setDrawColor(0, 0, 0);
    doc.line(145, y, 195, y);
    y += 4;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 145, y);
    doc.text(`S/ ${model.totals.total.toFixed(2)}`, 180, y, { align: 'right' });

    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('Este documento es una representacion impresa de un comprobante de pago electronico', 105, 275, { align: 'center' });
    doc.text('Generado por Macrochips - Sistema de Gestion', 105, 279, { align: 'center' });
  }

  private renderLinkedSummary(doc: PdfDocument, model: SaleReceiptPdfModel): void {
    this.renderAutoTable(doc, {
      startY: 50,
      head: [[{ content: 'Informacion general', colSpan: 4, styles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' } }]],
      body: [
        [
          { content: 'Cliente:', styles: { fontStyle: 'bold', fillColor: [226, 232, 240] } },
          { content: model.customer.name },
          { content: 'Documento:', styles: { fontStyle: 'bold', fillColor: [226, 232, 240] } },
          { content: model.customer.documentNumber },
        ],
        [
          { content: 'Fecha:', styles: { fontStyle: 'bold', fillColor: [226, 232, 240] } },
          { content: model.document.issueDateLabel },
          { content: 'Pago:', styles: { fontStyle: 'bold', fillColor: [226, 232, 240] } },
          { content: model.payment.methodLabel },
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
      margin: { left: 15, right: 15 },
    } as never);

    this.renderAutoTable(doc, {
      startY: (doc.lastAutoTable?.finalY || 50) + 8,
      head: [[model.labels.itemIndex, 'Descripcion', 'Cant.', 'P. unitario', 'Total']],
      body: model.items.map((item) => [
        String(item.index),
        item.description,
        item.quantity.toFixed(2),
        `S/ ${item.unitPrice.toFixed(2)}`,
        `S/ ${item.total.toFixed(2)}`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [51, 102, 153] },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 15, right: 15 },
    } as never);

    const y = (doc.lastAutoTable?.finalY || 50) + 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: S/ ${model.totals.total.toFixed(2)}`, 195, y, { align: 'right' });
  }

  private truncate(value: string, maxLength: number): string {
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
  }
}
