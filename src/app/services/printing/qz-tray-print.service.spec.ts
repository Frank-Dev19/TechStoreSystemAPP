import { TestBed } from '@angular/core/testing';
import qz from 'qz-tray';
import { QzTrayPrintService } from './qz-tray-print.service';

describe('QzTrayPrintService', () => {
  let service: QzTrayPrintService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QzTrayPrintService);
  });

  it('imprime en la Brother QL-700 con papel personalizado de 62 x 35 mm', async () => {
    spyOn(qz.websocket, 'isActive').and.returnValue(true);
    spyOn(qz.printers, 'find').and.returnValue(Promise.resolve([
      'Microsoft Print to PDF',
      'Brother QL-700',
    ]));
    const config = { printer: 'Brother QL-700' };
    const createConfig = spyOn(qz.configs, 'create').and.returnValue(config);
    const print = spyOn(qz, 'print').and.returnValue(Promise.resolve());

    await service.printPdfLabel({
      base64: 'JVBERi0xLjQ=',
      copies: 4,
      widthMm: 62,
      heightMm: 35,
      jobName: 'Sticker SO-01-01',
    });

    expect(createConfig).toHaveBeenCalledWith('Brother QL-700', jasmine.objectContaining({
      copies: 4,
      density: 300,
      units: 'mm',
      size: { width: 62, height: 35, custom: true },
      margins: 0,
      orientation: 'landscape',
      rasterize: true,
      scaleContent: false,
    }));
    expect(print).toHaveBeenCalledWith(config, [{
      type: 'pixel',
      format: 'pdf',
      flavor: 'base64',
      data: 'JVBERi0xLjQ=',
    }]);
  });
});
