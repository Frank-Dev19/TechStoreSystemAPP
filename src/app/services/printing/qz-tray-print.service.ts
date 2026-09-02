import { Injectable } from '@angular/core';

interface QzTrayClient {
  websocket: {
    isActive(): boolean;
    connect(options: { retries: number; delay: number }): Promise<void>;
  };
  printers: { find(): Promise<string[]> };
  configs: { create(printer: string, options: Record<string, unknown>): unknown };
  print(config: unknown, data: Array<Record<string, unknown>>): Promise<void>;
}

export interface QzPdfLabelJob {
  base64: string;
  copies: number;
  widthMm: number;
  heightMm: number;
  jobName: string;
}

@Injectable({ providedIn: 'root' })
export class QzTrayPrintService {
  private readonly printerModel = 'Brother QL-700';

  async printPdfLabel(job: QzPdfLabelJob): Promise<void> {
    try {
      const qz = this.getClient();
      await this.ensureConnected(qz);
      const printer = await this.findBrotherPrinter(qz);
      const printerConfig = qz.configs.create(printer, {
        copies: job.copies,
        colorType: 'blackwhite',
        density: 300,
        jobName: job.jobName,
        margins: 0,
        orientation: 'landscape',
        rasterize: true,
        scaleContent: false,
        size: {
          width: job.widthMm,
          height: job.heightMm,
          custom: true,
        },
        units: 'mm',
      });

      await qz.print(printerConfig, [{
        type: 'pixel',
        format: 'pdf',
        flavor: 'base64',
        data: job.base64,
      }]);
    } catch (error) {
      throw new Error(this.resolvePrintError(error));
    }
  }

  private getClient(): QzTrayClient {
    const qz = (globalThis as typeof globalThis & { qz?: QzTrayClient }).qz;
    if (!qz) {
      throw new Error(
        'El cliente de impresión QZ Tray no está disponible. Verifica su instalación y la configuración del cliente web.',
      );
    }
    return qz;
  }

  private async ensureConnected(qz: QzTrayClient): Promise<void> {
    if (qz.websocket.isActive()) return;
    await qz.websocket.connect({ retries: 2, delay: 1 });
  }

  private async findBrotherPrinter(qz: QzTrayClient): Promise<string> {
    const printers = (await qz.printers.find()) as string[];
    const normalizedModel = this.normalizePrinterName(this.printerModel);
    const exact = printers.find((printer) => this.normalizePrinterName(printer) === normalizedModel);
    const compatible = exact ?? printers.find((printer) => this.normalizePrinterName(printer).includes('brotherql700'));

    if (!compatible) {
      throw new Error(`No encontramos la impresora ${this.printerModel} instalada en este equipo.`);
    }
    return compatible;
  }

  private normalizePrinterName(value: string): string {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private resolvePrintError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error ?? '');
    if (/brother ql-700|brotherql700|impresora/i.test(message)) return message;
    if (/certificate|signature|trusted|authorization/i.test(message)) {
      return 'QZ Tray no autorizó la impresión. Acepta la solicitud de confianza de Macrochips y vuelve a intentar.';
    }
    if (/connect|socket|websocket|qz tray/i.test(message)) {
      return 'No pudimos conectar con QZ Tray. Verifica que esté instalado y abierto en este equipo.';
    }
    return message || 'No pudimos enviar el sticker a la impresora.';
  }
}
