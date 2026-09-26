import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { map, Observable, tap } from 'rxjs';
import { ServiceOrder, ServiceOrderItem } from '../../models/service-orders/service-order';
import { config } from '../../../environments/environment';
import { QzTrayPrintService } from '../printing/qz-tray-print.service';

@Injectable({ providedIn: 'root' })
export class ServiceOrderDocumentsService {
  private readonly serviceOrdersUrl = `${config.endpointServices}${config.serviceOrders.serviceOrders}`;

  constructor(
    private readonly http: HttpClient,
    private readonly qzTrayPrint: QzTrayPrintService,
  ) {}

  downloadOrderSummaryPdf(serviceOrderId: number): Observable<void> {
    const fallbackFileName = `SO-${serviceOrderId}-resumen.pdf`;
    return this.http
      .get(`${this.serviceOrdersUrl}/${serviceOrderId}/summary-pdf`, {
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(
        tap((response) => {
          this.triggerBrowserDownload(
            response.body ?? new Blob([], { type: 'application/pdf' }),
            this.resolveDownloadFileName(response, fallbackFileName),
          );
        }),
        map(() => void 0),
      );
  }

  emailOrderSummary(serviceOrderId: number, to?: string): Observable<{
    ok: true;
    serviceOrderId: number;
    to: string;
    message: string;
  }> {
    return this.http.post<{
      ok: true;
      serviceOrderId: number;
      to: string;
      message: string;
    }>(`${this.serviceOrdersUrl}/${serviceOrderId}/summary-email`, {
      ...(to ? { to } : {}),
    });
  }

  async printEquipmentSticker(
    serviceOrder: ServiceOrder,
    item: ServiceOrderItem,
    copies: number,
  ): Promise<string> {
    const widthMm = 54;
    const heightMm = 17;
    const doc = this.buildEquipmentStickerPdf(serviceOrder, item, widthMm, heightMm);
    const dataUri = doc.output('datauristring');

    return this.qzTrayPrint.printPdfLabel({
      base64: dataUri.slice(dataUri.indexOf(',') + 1),
      copies,
      widthMm,
      heightMm,
      jobName: `Sticker ${item.code}`,
    });
  }

  private buildEquipmentStickerPdf(
    serviceOrder: ServiceOrder,
    item: ServiceOrderItem,
    widthMm: number,
    heightMm: number,
  ): jsPDF {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [widthMm, heightMm] });
    const left = 1.8;
    const right = widthMm - 1.8;
    const contentWidth = right - left;
    const receivedAt = new Date(serviceOrder.receivedAt || serviceOrder.createdAt);
    const clientName = (
      serviceOrder.contactName ||
      serviceOrder.clientSnapshotName ||
      serviceOrder.client?.name ||
      'CLIENTE SIN IDENTIFICAR'
    ).trim();
    const equipment = [
      getEquipmentTypeLabel(item.equipmentType, item.equipmentTypeOther),
      item.brand,
      item.model,
    ].filter(Boolean).join(' ');
    const headerDate = Number.isNaN(receivedAt.getTime()) ? '-' :
      new Intl.DateTimeFormat('es-PE', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(receivedAt);

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fitInlineHeaderFontSize(doc, serviceOrder.code, headerDate, contentWidth, 5, 4.5));
    doc.text(serviceOrder.code, left, 2.9);
    doc.text(headerDate, right, 2.9, { align: 'right' });

    doc.setFontSize(fitPdfFontSize(doc, clientName.toUpperCase(), contentWidth, 5.8, 5));
    doc.text(truncatePdfText(doc, clientName.toUpperCase(), contentWidth), left, 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(truncatePdfText(doc, equipment.toUpperCase(), contentWidth), left, 7);
    drawStickerField(doc, 'SERIE', item.serialNumber || 'No registrada', left, contentWidth, 9);
    drawStickerField(doc, 'ACCESORIOS', item.accessories || 'Sin accesorios', left, contentWidth, 11);
    drawStickerField(doc, 'NOTAS', item.notes || 'Sin notas', left, contentWidth, 13);
    drawStickerField(doc, 'FALLA', item.initialIssue || 'Sin falla reportada', left, contentWidth, 15);
    return doc;
  }

  private resolveDownloadFileName(response: HttpResponse<Blob>, fallbackFileName: string): string {
    const disposition = response.headers.get('content-disposition') || response.headers.get('Content-Disposition');
    if (!disposition) {
      return fallbackFileName;
    }

    const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) {
      try {
        return decodeURIComponent(utfMatch[1]);
      } catch {
        return utfMatch[1];
      }
    }

    const asciiMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
    return asciiMatch?.[1] || fallbackFileName;
  }

  private triggerBrowserDownload(blob: Blob, fileName: string): void {
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }
}

function getEquipmentTypeLabel(type?: string, other?: string | null): string {
  if (type === 'OTHER' && other?.trim()) return other.trim();
  const labels: Record<string, string> = {
    LAPTOP: 'Laptop',
    DESKTOP_PC: 'PC de escritorio',
    ALL_IN_ONE: 'All in One',
    PRINTER: 'Impresora',
    SCANNER: 'Escáner',
    PROJECTOR: 'Proyector',
    MONITOR: 'Monitor',
    SERVER: 'Servidor',
    NETWORK_DEVICE: 'Equipo de red',
    OTHER: 'Otro',
  };
  return labels[type ?? ''] || type || '-';
}

function fitPdfFontSize(
  doc: jsPDF,
  value: string,
  maximumWidth: number,
  preferredSize: number,
  minimumSize: number,
): number {
  let size = preferredSize;
  doc.setFontSize(size);
  while (size > minimumSize && doc.getTextWidth(value) > maximumWidth) {
    size -= 0.2;
    doc.setFontSize(size);
  }
  return Math.max(size, minimumSize);
}

function fitInlineHeaderFontSize(
  doc: jsPDF,
  leftValue: string,
  rightValue: string,
  maximumWidth: number,
  preferredSize: number,
  minimumSize: number,
): number {
  const minimumGap = 2.5;
  let size = preferredSize;
  doc.setFontSize(size);
  while (
    size > minimumSize &&
    doc.getTextWidth(leftValue) + doc.getTextWidth(rightValue) + minimumGap > maximumWidth
  ) {
    size -= 0.2;
    doc.setFontSize(size);
  }
  return Math.max(size, minimumSize);
}

function drawStickerField(
  doc: jsPDF,
  label: string,
  value: string,
  left: number,
  maximumWidth: number,
  y: number,
): void {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  const normalizedLabel = `${label}:`;
  doc.text(normalizedLabel, left, y);
  const labelWidth = doc.getTextWidth(normalizedLabel) + 1.1;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.1);
  doc.text(
    truncatePdfText(doc, String(value || '-').toUpperCase(), maximumWidth - labelWidth),
    left + labelWidth,
    y,
  );
}

function truncatePdfText(doc: jsPDF, value: string, maximumWidth: number): string {
  const normalized = String(value || '-').replace(/\s+/g, ' ').trim();
  if (doc.getTextWidth(normalized) <= maximumWidth) return normalized;

  let truncated = normalized;
  while (truncated.length > 1 && doc.getTextWidth(`${truncated}...`) > maximumWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated.trimEnd()}...`;
}
