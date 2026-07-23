import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { map, Observable, tap } from 'rxjs';
import { ServiceOrder } from '../../models/service-orders/service-order';
import { ServiceOrderAgreement } from '../../models/service-orders/service-agreement';
import { config } from '../../../environments/environment';

type OrderSummaryContext = {
  serviceOrder: ServiceOrder;
  agreement: ServiceOrderAgreement | null;
};

@Injectable({ providedIn: 'root' })
export class ServiceOrderDocumentsService {
  private readonly serviceOrdersUrl = `${config.endpointServices}${config.serviceOrders.serviceOrders}`;

  constructor(private readonly http: HttpClient) {}

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

  openEquipmentStickerPdf(context: OrderSummaryContext): void {
    const { serviceOrder: o } = context;
    const width = 118;
    const margin = 1.5;
    const maxChars = 68;
    const columnChars = 34;
    const lineHeight = 4;
    const pageLines: string[] = [];

    const fields: Array<[string, string]> = [
      ['Tipo', getEquipmentTypeLabel(o.equipmentType, o.equipmentTypeOther)],
      ['Marca', o.brand || '-'],
      ['Modelo', o.model || '-'],
      ['Serie', o.serialNumber || '-'],
      ['Ingreso', new Date(o.createdAt).toLocaleString('es-PE')],
      ['Accesorios', o.accessories || '-'],
      ['Notas', o.notes || '-'],
    ];

    pageLines.push(centerThermalText('ORDEN', maxChars));
    pageLines.push(centerThermalText(o.code, maxChars));
    pageLines.push('-'.repeat(maxChars));

    const pendingColumns: string[][] = [];

    fields.forEach(([label, value]) => {
      const fieldLines = buildThermalFieldLines(label, value, maxChars, columnChars);
      const fitsColumn = fieldLines.every((line) => line.length <= columnChars);

      if (!fitsColumn) {
        if (pendingColumns.length === 1) {
          pageLines.push(padThermalText(pendingColumns[0][0] || '', maxChars));
          pendingColumns.length = 0;
        }
        pageLines.push(...fieldLines);
        return;
      }

      pendingColumns.push(fieldLines);
      if (pendingColumns.length === 2) {
        pageLines.push(...composeThermalColumnRow(pendingColumns[0], pendingColumns[1], columnChars));
        pendingColumns.length = 0;
      }
    });

    if (pendingColumns.length === 1) {
      pageLines.push(padThermalText(pendingColumns[0][0] || '', maxChars));
    }

    pageLines.push('-'.repeat(maxChars));

    const pageHeight = Math.max(30, margin * 2 + pageLines.length * lineHeight + 1.5);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [width, pageHeight] });
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.1);

    let currentY = margin + 1.6;
    pageLines.forEach((line) => {
      doc.text(line, margin, currentY);
      currentY += lineHeight;
    });

    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank', 'noopener');
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

function centerThermalText(value: string, width: number): string {
  const normalized = String(value || '').trim().slice(0, width);
  const leftPadding = Math.max(0, Math.floor((width - normalized.length) / 2));
  const rightPadding = Math.max(0, width - normalized.length - leftPadding);
  return `${' '.repeat(leftPadding)}${normalized}${' '.repeat(rightPadding)}`;
}

function padThermalText(value: string, width: number): string {
  const normalized = String(value || '');
  return normalized.length >= width ? normalized.slice(0, width) : normalized.padEnd(width, ' ');
}

function composeThermalColumnRow(leftLines: string[], rightLines: string[], columnChars: number): string[] {
  const rows: string[] = [];
  const rowHeight = Math.max(leftLines.length, rightLines.length);

  for (let index = 0; index < rowHeight; index += 1) {
    const left = padThermalText(leftLines[index] || '', columnChars);
    const right = padThermalText(rightLines[index] || '', columnChars);
    rows.push(`${left}${right}`);
  }

  return rows;
}

function buildThermalFieldLines(label: string, value: string, maxChars: number, columnChars: number): string[] {
  const normalized = `${label}: ${String(value || '—').replace(/\s+/g, ' ').trim()}`;
  if (normalized.length <= columnChars) {
    return [normalized];
  }

  return wrapThermalText(normalized, maxChars);
}

function wrapThermalText(value: string, width: number): string[] {
  const words = String(value || '').split(' ').filter(Boolean);
  if (!words.length) return ['—'];

  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    if (!current) {
      current = word;
      return;
    }
    if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`;
      return;
    }
    lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  return lines;
}

