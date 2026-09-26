import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { QzTrayPrintService } from './qz-tray-print.service';

describe('QzTrayPrintService', () => {
  let service: QzTrayPrintService;
  let qz: any;
  let http: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get', 'post']);
    http.get.and.returnValue(of('PUBLIC QZ CERTIFICATE'));
    http.post.and.returnValue(of({ signature: 'SIGNED PAYLOAD' }));
    qz = {
      websocket: { isActive: jasmine.createSpy('isActive').and.returnValue(true), connect: jasmine.createSpy('connect') },
      printers: { find: jasmine.createSpy('find').and.resolveTo(['Microsoft Print to PDF', 'Brother QL-700']) },
      configs: { create: jasmine.createSpy('create').and.returnValue({ printer: 'Brother QL-700' }) },
      print: jasmine.createSpy('print').and.resolveTo(),
      security: {
        setCertificatePromise: jasmine.createSpy('setCertificatePromise'),
        setSignatureAlgorithm: jasmine.createSpy('setSignatureAlgorithm'),
        setSignaturePromise: jasmine.createSpy('setSignaturePromise'),
      },
    };
    (globalThis as any).qz = qz;
    TestBed.configureTestingModule({
      providers: [{ provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(QzTrayPrintService);
  });

  afterEach(() => {
    (globalThis as any).qz = undefined;
  });

  it('imprime en la Brother QL-700 con rollo de 17 x 54 mm horizontal a 300 dpi', async () => {
    const config = { printer: 'Brother QL-700' };
    qz.configs.create.and.returnValue(config);

    await service.printPdfLabel({
      base64: 'JVBERi0xLjQ=',
      copies: 4,
      widthMm: 54,
      heightMm: 17,
      jobName: 'Sticker SO-01-01',
    });

    expect(qz.configs.create).toHaveBeenCalledWith('Brother QL-700', jasmine.objectContaining({
      copies: 4,
      density: 300 / 25.4,
      units: 'mm',
      size: { width: 17, height: 54, custom: false },
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
    expect(qz.security.setSignatureAlgorithm).toHaveBeenCalledWith('SHA512');
  });

  it('obtiene el certificado y las firmas desde el API antes de usar QZ', async () => {
    await service.printPdfLabel({
      base64: 'JVBERi0xLjQ=', copies: 1, widthMm: 54, heightMm: 17, jobName: 'Sticker',
    });

    const certificateResolver = qz.security.setCertificatePromise.calls.mostRecent().args[0];
    const signatureResolver = qz.security.setSignaturePromise.calls.mostRecent().args[0];

    await expectAsync(new Promise(certificateResolver)).toBeResolvedTo('PUBLIC QZ CERTIFICATE');
    await expectAsync(new Promise(signatureResolver('payload-to-sign'))).toBeResolvedTo('SIGNED PAYLOAD');
    expect(http.get.calls.mostRecent().args[0]).toBe(
      'http://localhost:3000/printing/qz/certificate',
    );
    expect(http.get.calls.mostRecent().args[1]).toEqual({ responseType: 'text' } as any);
    expect(http.post).toHaveBeenCalledWith(
      'http://localhost:3000/printing/qz/sign',
      { payload: 'payload-to-sign' },
    );
  });

  it('informa claramente cuando QZ Tray no acepta la conexión', async () => {
    qz.websocket.isActive.and.returnValue(false);
    qz.websocket.connect.and.rejectWith(new Error('WebSocket connection failed'));

    await expectAsync(service.printPdfLabel({
      base64: 'JVBERi0xLjQ=', copies: 1, widthMm: 54, heightMm: 17, jobName: 'Sticker',
    })).toBeRejectedWithError(/No pudimos conectar con QZ Tray/i);
  });

  it('usa una impresora física alternativa solamente en desarrollo', async () => {
    qz.printers.find.and.resolveTo(['Microsoft Print to PDF', 'EPSON L3110 Series']);

    const printer = await service.printPdfLabel({
      base64: 'JVBERi0xLjQ=', copies: 1, widthMm: 54, heightMm: 17, jobName: 'Sticker',
    });

    expect(printer).toBe('EPSON L3110 Series');
    expect(qz.configs.create).toHaveBeenCalledWith('EPSON L3110 Series', jasmine.objectContaining({
      bounds: { x: 10, y: 10, width: 54, height: 17 },
      units: 'mm',
      size: { width: 210, height: 297, custom: false },
      orientation: 'portrait',
      legacy: true,
      rasterize: true,
      scaleContent: true,
    }));
  });
});
