import { TestBed } from '@angular/core/testing';
import { QzTrayPrintService } from './qz-tray-print.service';

describe('QzTrayPrintService', () => {
  let service: QzTrayPrintService;
  let qz: any;

  beforeEach(() => {
    qz = {
      websocket: { isActive: jasmine.createSpy('isActive').and.returnValue(true), connect: jasmine.createSpy('connect') },
      printers: { find: jasmine.createSpy('find').and.resolveTo(['Microsoft Print to PDF', 'Brother QL-700']) },
      configs: { create: jasmine.createSpy('create').and.returnValue({ printer: 'Brother QL-700' }) },
      print: jasmine.createSpy('print').and.resolveTo(),
    };
    (globalThis as any).qz = qz;
    TestBed.configureTestingModule({});
    service = TestBed.inject(QzTrayPrintService);
  });

  afterEach(() => delete (globalThis as any).qz);

  it('imprime en la Brother QL-700 con papel personalizado de 62 x 35 mm', async () => {
    const config = { printer: 'Brother QL-700' };
    qz.configs.create.and.returnValue(config);

    await service.printPdfLabel({
      base64: 'JVBERi0xLjQ=',
      copies: 4,
      widthMm: 62,
      heightMm: 35,
      jobName: 'Sticker SO-01-01',
    });

    expect(qz.configs.create).toHaveBeenCalledWith('Brother QL-700', jasmine.objectContaining({
      copies: 4,
      density: 300,
      units: 'mm',
      size: { width: 62, height: 35, custom: true },
      margins: 0,
      orientation: 'landscape',
      rasterize: true,
      scaleContent: false,
    }));
    expect(qz.print).toHaveBeenCalledWith(config, [{
      type: 'pixel',
      format: 'pdf',
      flavor: 'base64',
      data: 'JVBERi0xLjQ=',
    }]);
  });

  it('informa claramente cuando el cliente QZ no está cargado', async () => {
    delete (globalThis as any).qz;

    await expectAsync(service.printPdfLabel({
      base64: 'JVBERi0xLjQ=', copies: 1, widthMm: 62, heightMm: 35, jobName: 'Sticker',
    })).toBeRejectedWithError(/cliente de impresión QZ Tray no está disponible/i);
  });
});
