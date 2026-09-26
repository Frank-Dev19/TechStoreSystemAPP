import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { config } from '../../../environments/environment';

interface QzTrayClient {
  websocket: {
    isActive(): boolean;
    connect(options: { retries: number; delay: number }): Promise<void>;
  };
  printers: { find(): Promise<string[]> };
  configs: { create(printer: string, options: Record<string, unknown>): unknown };
  print(config: unknown, data: Array<Record<string, unknown>>): Promise<void>;
  security: {
    setCertificatePromise(
      resolver: (resolve: (certificate: string) => void, reject: (error: unknown) => void) => void,
    ): void;
    setSignatureAlgorithm(algorithm: 'SHA512'): void;
    setSignaturePromise(
      resolver: (payload: string) => (
        resolve: (signature: string) => void,
        reject: (error: unknown) => void,
      ) => void,
    ): void;
  };
}

export interface QzPdfLabelJob {
  base64: string;
  copies: number;
  widthMm: number;
  heightMm: number;
  jobName: string;
}

interface PrinterTarget {
  name: string;
  usesA4Fallback: boolean;
}

@Injectable({ providedIn: 'root' })
export class QzTrayPrintService {
  private readonly printerModel = config.printing.preferredPrinter;
  private readonly signingUrl = `${config.endpointServices}${config.printing.qzSigningBase}`;
  private securityConfigured = false;

  constructor(private readonly http: HttpClient) {}

  async printPdfLabel(job: QzPdfLabelJob): Promise<string> {
    try {
      const qz = this.getClient();
      this.configureSecurity(qz);
      await this.ensureConnected(qz);
      const target = await this.findPrinterTarget(qz);
      const printerConfig = qz.configs.create(target.name, target.usesA4Fallback ? {
        bounds: {
          x: 10,
          y: 10,
          width: job.widthMm,
          height: job.heightMm,
        },
        copies: job.copies,
        colorType: 'blackwhite',
        jobName: job.jobName,
        legacy: true,
        margins: 0,
        orientation: 'portrait',
        rasterize: true,
        scaleContent: true,
        size: {
          width: 210,
          height: 297,
          custom: false,
        },
        units: 'mm',
      } : {
        copies: job.copies,
        colorType: 'blackwhite',
        // QZ uses dots/mm when units are mm (300 dpi).
        density: 300 / 25.4,
        jobName: job.jobName,
        margins: 0,
        orientation: 'landscape',
        rasterize: true,
        scaleContent: false,
        size: {
          // Driver paper dimensions before landscape orientation.
          width: job.heightMm,
          height: job.widthMm,
          custom: false,
        },
        units: 'mm',
      });

      await qz.print(printerConfig, [{
        type: 'pixel',
        format: 'pdf',
        flavor: 'base64',
        data: job.base64,
      }]);
      return target.name;
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

  private configureSecurity(qz: QzTrayClient): void {
    if (this.securityConfigured) return;

    qz.security.setCertificatePromise((resolve, reject) => {
      firstValueFrom(
        this.http.get(`${this.signingUrl}/certificate`, { responseType: 'text' }),
      ).then(resolve, reject);
    });
    qz.security.setSignatureAlgorithm('SHA512');
    qz.security.setSignaturePromise((payload: string) => (resolve, reject) => {
      firstValueFrom(
        this.http.post<{ signature: string }>(`${this.signingUrl}/sign`, { payload }),
      ).then((response) => resolve(response.signature), reject);
    });
    this.securityConfigured = true;
  }

  private async ensureConnected(qz: QzTrayClient): Promise<void> {
    if (qz.websocket.isActive()) return;
    await qz.websocket.connect({ retries: 2, delay: 1 });
  }

  private async findPrinterTarget(qz: QzTrayClient): Promise<PrinterTarget> {
    const printers = (await qz.printers.find()) as string[];
    const normalizedModel = this.normalizePrinterName(this.printerModel);
    const exact = printers.find((printer) => this.normalizePrinterName(printer) === normalizedModel);
    const compatible = exact ?? printers.find((printer) => this.normalizePrinterName(printer).includes('brotherql700'));

    if (!compatible && config.printing.allowFallbackPrinter) {
      const physicalPrinter = printers.find((printer) => !this.isVirtualPrinter(printer));
      if (physicalPrinter) return { name: physicalPrinter, usesA4Fallback: true };
    }

    if (!compatible) {
      throw new Error(`No encontramos la impresora ${this.printerModel} instalada en este equipo.`);
    }
    return { name: compatible, usesA4Fallback: false };
  }

  private isVirtualPrinter(printer: string): boolean {
    return /pdf|onenote|fax|xps|document writer/i.test(printer);
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
