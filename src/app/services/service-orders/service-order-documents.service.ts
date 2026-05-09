import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ServiceOrder } from '../../models/service-orders/service-order';
import { ServiceOrderAgreement } from '../../models/service-orders/service-agreement';
import { MACROCHIPS_LOGO_BASE64 } from '../../utils/constants/logo-base64';

// =============================================================================
// Tipos y constantes
// =============================================================================

type OperationalStatus =
  | 'ABIERTA'
  | 'EN_PROCESO'
  | 'LISTA_PARA_ENTREGA'
  | 'ENTREGADA'
  | 'CANCELADA'
  | 'CERRADA_SIN_SOLUCION';

const OPERATIONAL_STATUS_LABELS: Record<OperationalStatus, string> = {
  ABIERTA: 'Abierto',
  EN_PROCESO: 'En progreso',
  LISTA_PARA_ENTREGA: 'Listo para entrega',
  ENTREGADA: 'Entregado',
  CANCELADA: 'Cancelado',
  CERRADA_SIN_SOLUCION: 'Sin solución',
};

type OrderSummaryContext = {
  serviceOrder: ServiceOrder;
  agreement: ServiceOrderAgreement | null;
};

interface ServiceOrderLineItem {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface ServiceOrderSummary {
  codigo: string;
  fechaHora: string;
  estado: OperationalStatus;
  tipoServicio: string;
  cliente: {
    nombre: string;
    documento: string;
    telefono: string;
    correo?: string;
  };
  equipo: {
    tipo: string;
    marca: string;
    modelo: string;
    serie: string;
    accesorios?: string;
    notas?: string;
  };
  detalleInicial: string;
}

// =============================================================================
// Cláusulas estándar
// =============================================================================

const STANDARD_TERMS: { titulo: string; texto: string }[] = [
  {
    titulo: '1. Diagnóstico y autorización',
    texto:
      'El cliente autoriza a Corporación MACROCHIPS a realizar el diagnóstico del equipo. Cualquier reparación adicional al diagnóstico inicial será notificada y requerirá aprobación previa del cliente.',
  },
  {
    titulo: '2. Plazo de retiro',
    texto:
      'El cliente cuenta con 30 días calendario, a partir de la notificación de equipo listo, para retirar su equipo. Pasado este plazo se cobrará un costo de almacenamiento diario.',
  },
  {
    titulo: '3. Equipos en abandono',
    texto:
      'Transcurridos 60 días desde la notificación sin que el cliente retire el equipo, este será considerado en abandono y MACROCHIPS podrá disponer del mismo para cubrir los costos del servicio, conforme a la normativa vigente.',
  },
  {
    titulo: '4. Garantía del servicio',
    texto:
      'El servicio realizado tiene 30 días de garantía, exclusivamente sobre la falla reportada y atendida. La garantía no cubre daños posteriores por mal uso, golpes, humedad, sobretensión eléctrica ni intervención de terceros.',
  },
  {
    titulo: '5. Responsabilidad sobre la información',
    texto:
      'MACROCHIPS no se responsabiliza por la pérdida de información, archivos o configuraciones del equipo. Se recomienda al cliente realizar respaldos antes de dejar el equipo en servicio.',
  },
  {
    titulo: '6. Presentación del comprobante',
    texto:
      'Para retirar el equipo es indispensable presentar este comprobante o el código de orden de servicio junto con un documento de identidad.',
  },
];

// =============================================================================
// Paleta corporativa
// =============================================================================

const COLORS = {
  brand: [22, 163, 74] as [number, number, number],
  brandDark: [21, 128, 61] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  headerBg: [240, 253, 244] as [number, number, number],
};

const PAGE = { width: 210, height: 297, margin: 14 };

// =============================================================================
// Helper para mapear ServiceOrder → ServiceOrderSummary
// =============================================================================

function mapToSummary(ctx: OrderSummaryContext): ServiceOrderSummary {
  const { serviceOrder: o } = ctx;
  return {
    codigo: o.code,
    fechaHora: new Date(o.createdAt).toLocaleString('es-PE'),
    estado: o.operativeStatus as OperationalStatus,
    tipoServicio: getServiceTypeLabel(o.serviceType),
    cliente: {
      nombre: o.clientSnapshotName || o.client?.name || 'Sin cliente',
      documento: [o.clientSnapshotDocumentTypeName, o.clientSnapshotDocumentNumber].filter(Boolean).join(': ') || '-',
      telefono: o.clientSnapshotPhone || o.client?.phone || '-',
      correo: o.clientSnapshotEmail || o.client?.email || undefined,
    },
    equipo: {
      tipo: getEquipmentTypeLabel(o.equipmentType, o.equipmentTypeOther),
      marca: o.brand || '-',
      modelo: o.model || '-',
      serie: o.serialNumber || '-',
      accesorios: o.accessories || undefined,
      notas: o.notes || undefined,
    },
    detalleInicial: o.initialIssue || 'Sin detalle registrado.',
  };
}

function getServiceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    STANDARD_SERVICE: 'Estándar',
    DIAGNOSIS: 'Diagnóstico',
    WARRANTY_SERVICE: 'Garantía',
    ASSEMBLY: 'Ensamblaje',
    CUSTOMER_SERVICE: 'Atención al cliente',
  };
  return labels[type] || type;
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

// =============================================================================
// Service
// =============================================================================

@Injectable({ providedIn: 'root' })
export class ServiceOrderDocumentsService {
  downloadOrderSummaryPdf(context: OrderSummaryContext): void {
    const summary = mapToSummary(context);
    const doc = this.buildOrderSummaryPdf(summary);
    doc.save(`${summary.codigo}-resumen.pdf`);
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

  // ---------------------------------------------------------------------------
  // Construcción del PDF (lógica pura)
  // ---------------------------------------------------------------------------

  private buildOrderSummaryPdf(order: ServiceOrderSummary): jsPDF {
    const doc = new jsPDF({ format: 'a4', orientation: 'portrait', unit: 'mm' });
    doc.setFont('helvetica', 'normal');

    let y = this.drawHeader(doc, order);
    y = this.drawMetaBlock(doc, order, y);
    y = this.drawEquipmentBlock(doc, order, y);
    y = this.drawInitialDetail(doc, order, y);
    this.drawTerms(doc, y);
    this.drawFooter(doc, order);

    return doc;
  }

  // ---------------------------------------------------------------------------
  // Secciones
  // ---------------------------------------------------------------------------

  private drawHeader(doc: jsPDF, order: ServiceOrderSummary): number {
    try {
      doc.addImage(MACROCHIPS_LOGO_BASE64, 'PNG', PAGE.margin, 10, 38, 12);
    } catch {
      /* noop */
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    this.setColor(doc, COLORS.text);
    doc.text('RESUMEN DE ORDEN DE SERVICIO', PAGE.width - PAGE.margin, 14, {
      align: 'right',
    });

    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    this.setColor(doc, COLORS.brandDark);
    doc.text(order.codigo, PAGE.width - PAGE.margin, 20, { align: 'right' });

    this.setDrawColor(doc, COLORS.brand);
    doc.setLineWidth(0.6);
    doc.line(PAGE.margin, 26, PAGE.width - PAGE.margin, 26);

    return 32;
  }

  private drawMetaBlock(doc: jsPDF, order: ServiceOrderSummary, y: number): number {
    const rows: [string, string, string, string][] = [
      ['Fecha y hora', order.fechaHora, 'Estado', OPERATIONAL_STATUS_LABELS[order.estado]],
      ['Tipo de servicio', order.tipoServicio, 'Cliente', order.cliente.nombre],
      ['Documento', order.cliente.documento, 'Teléfono', order.cliente.telefono],
      ['Correo', order.cliente.correo || '—', '', ''],
    ];

    const colW = (PAGE.width - PAGE.margin * 2) / 4;
    doc.setFontSize(8.5);

    rows.forEach((row) => {
      for (let i = 0; i < 4; i += 2) {
        const label = row[i];
        const value = row[i + 1];
        if (!label) continue;
        const x = PAGE.margin + (i / 2) * colW * 2;
        this.setColor(doc, COLORS.muted);
        doc.setFont('helvetica', 'bold');
        doc.text(label.toUpperCase(), x, y);
        this.setColor(doc, COLORS.text);
        doc.setFont('helvetica', 'normal');
        doc.text(value || '—', x, y + 4);
      }
      y += 10;
    });

    return y + 2;
  }

  private drawSectionTitle(doc: jsPDF, label: string, y: number): number {
    this.setColor(doc, COLORS.brandDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label.toUpperCase(), PAGE.margin, y);
    this.setDrawColor(doc, COLORS.line);
    doc.setLineWidth(0.2);
    doc.line(PAGE.margin, y + 1.5, PAGE.width - PAGE.margin, y + 1.5);
    return y + 6;
  }

  private drawEquipmentBlock(doc: jsPDF, order: ServiceOrderSummary, y: number): number {
    y = this.drawSectionTitle(doc, 'Equipo', y);
    const e = order.equipo;
    const items: [string, string][] = [
      ['Tipo', e.tipo],
      ['Marca', e.marca],
      ['Modelo', e.modelo],
      ['Serie / Identificador', e.serie],
      ['Accesorios', e.accesorios || '—'],
      ['Notas u observaciones', e.notas || '—'],
    ];

    doc.setFontSize(8.5);
    const colW = (PAGE.width - PAGE.margin * 2) / 2;
    items.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = PAGE.margin + col * colW;
      const cy = y + row * 8;
      this.setColor(doc, COLORS.muted);
      doc.setFont('helvetica', 'bold');
      doc.text(item[0].toUpperCase(), x, cy);
      this.setColor(doc, COLORS.text);
      doc.setFont('helvetica', 'normal');
      doc.text(item[1] || '—', x, cy + 4);
    });

    return y + Math.ceil(items.length / 2) * 8 + 2;
  }

  private drawInitialDetail(doc: jsPDF, order: ServiceOrderSummary, y: number): number {
    y = this.drawSectionTitle(doc, 'Detalle inicial', y);
    this.setColor(doc, COLORS.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(order.detalleInicial || '—', PAGE.width - PAGE.margin * 2);
    doc.text(lines, PAGE.margin, y);
    return y + lines.length * 4.5 + 4;
  }

  private drawTerms(doc: jsPDF, y: number): number {
    const fontSize = 6.5;
    doc.setFontSize(fontSize);

    // Calculamos dinámicamente el alto total que tomarán todas las cláusulas
    let totalHeight = 6; // Espacio del título de sección
    STANDARD_TERMS.forEach((t) => {
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(t.texto, PAGE.width - PAGE.margin * 2);
      totalHeight += 3.0 + lines.length * 2.6 + 2.0;
    });

    const maxBottom = PAGE.height - 12; // 12mm de margen inferior respecto al borde
    const startY = maxBottom - totalHeight;

    // Si el contenido anterior invade la zona anclada, forzamos un quiebre de página
    if (y > startY) {
      doc.addPage();
    }
    
    // Anclamos la Y al fondo calculado, sin importar si estamos en la misma hoja o en una nueva
    y = startY;

    y = this.drawSectionTitle(doc, 'Términos y condiciones', y);
    doc.setFontSize(fontSize);

    STANDARD_TERMS.forEach((t) => {
      this.setColor(doc, COLORS.brandDark);
      doc.setFont('helvetica', 'bold');
      doc.text(t.titulo, PAGE.margin, y);
      
      this.setColor(doc, COLORS.text);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(t.texto, PAGE.width - PAGE.margin * 2);
      doc.text(lines, PAGE.margin, y + 3.0);
      
      y += 3.0 + lines.length * 2.6 + 2.0;
    });

    return y;
  }

  private drawFooter(doc: jsPDF, order: ServiceOrderSummary): void {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      this.setColor(doc, COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(
        `Corporación MACROCHIPS · ${order.codigo}`,
        PAGE.margin,
        PAGE.height - 8,
      );
      doc.text(`Página ${i} de ${pages}`, PAGE.width - PAGE.margin, PAGE.height - 8, {
        align: 'right',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers de color
  // ---------------------------------------------------------------------------

  private setColor(doc: jsPDF, c: [number, number, number]): void {
    doc.setTextColor(c[0], c[1], c[2]);
  }

  private setDrawColor(doc: jsPDF, c: [number, number, number]): void {
    doc.setDrawColor(c[0], c[1], c[2]);
  }
}

// =============================================================================
// Helpers térmicos (sticker)
// =============================================================================

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
