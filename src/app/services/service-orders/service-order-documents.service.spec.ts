import { HttpHeaders } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  EquipmentType,
  ServiceOrderItem,
  ServiceOrderOperativeStatus,
  ServiceType,
} from '../../models/service-orders/service-order';
import { config } from '../../../environments/environment';
import { QzTrayPrintService } from '../printing/qz-tray-print.service';
import { ServiceOrderDocumentsService } from './service-order-documents.service';

describe('ServiceOrderDocumentsService', () => {
  let service: ServiceOrderDocumentsService;
  let httpMock: HttpTestingController;
  const qzTrayPrintStub = {
    printPdfLabel: jasmine.createSpy('printPdfLabel').and.returnValue(Promise.resolve()),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: QzTrayPrintService, useValue: qzTrayPrintStub }],
    });
    service = TestBed.inject(ServiceOrderDocumentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('descarga el resumen PDF single desde backend y respeta el filename del header', () => {
    const downloadSpy = spyOn<any>(service, 'triggerBrowserDownload').and.stub();

    service.downloadOrderSummaryPdf(15).subscribe();

    const req = httpMock.expectOne(`${config.endpointServices}${config.serviceOrders.serviceOrders}/15/summary-pdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');

    req.flush(new Blob(['pdf'], { type: 'application/pdf' }), {
      headers: new HttpHeaders({
        'Content-Disposition': 'attachment; filename="SO20260520-resumen.pdf"',
      }),
      status: 200,
      statusText: 'OK',
    });

    expect(downloadSpy).toHaveBeenCalledWith(jasmine.any(Blob), 'SO20260520-resumen.pdf');
  });

  it('solicita el envío por correo del resumen de una orden', () => {
    service.emailOrderSummary(15).subscribe((response) => {
      expect(response.to).toBe('cliente@test.com');
    });

    const req = httpMock.expectOne(`${config.endpointServices}${config.serviceOrders.serviceOrders}/15/summary-email`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({
      ok: true,
      serviceOrderId: 15,
      to: 'cliente@test.com',
      message: 'Resumen de la orden enviado por correo.',
    });
  });

  it('incluye el destinatario capturado para un envío único', () => {
    service.emailOrderSummary(16, 'temporal@example.com').subscribe();

    const req = httpMock.expectOne(`${config.endpointServices}${config.serviceOrders.serviceOrders}/16/summary-email`);
    expect(req.request.body).toEqual({ to: 'temporal@example.com' });
    req.flush({
      ok: true,
      serviceOrderId: 16,
      to: 'temporal@example.com',
      message: 'Resumen de la orden enviado por correo.',
    });
  });

  it('genera un sticker de 62 x 35 mm para un equipo y lo envía a QZ Tray', async () => {
    const order = createServiceOrder();
    const item = createServiceOrderItem();

    await service.printEquipmentSticker(order, item, 3);

    expect(qzTrayPrintStub.printPdfLabel).toHaveBeenCalledWith(jasmine.objectContaining({
      copies: 3,
      widthMm: 62,
      heightMm: 35,
      jobName: `Sticker ${item.code}`,
      base64: jasmine.stringMatching(/^JVBER/),
    }));
    const job = qzTrayPrintStub.printPdfLabel.calls.mostRecent().args[0];
    const pdfSource = atob(job.base64);
    expect(pdfSource).toContain('CLIENTE BASE');
    expect(pdfSource).toContain('(SO-BASE) Tj');
    expect(pdfSource).not.toContain('(SO-BASE-01) Tj');
    expect(pdfSource).not.toContain('MACROCHIPS / RECEPCION');
    expect(pdfSource).toContain('ACCESORIOS');
    expect(pdfSource).toContain('NOTAS');
    expect(pdfSource).toContain('RAYON LATERAL');
    expect(pdfSource).toContain('NO MUESTRA IMAGEN EN PANTALLA');
    expect(pdfSource).not.toContain('(999999999) Tj');
  });

  it('trunca entradas extremas sin imprimir el valor completo fuera del sticker', async () => {
    const order = createServiceOrder();
    const item = createServiceOrderItem();
    const longClientName = 'MARIA ALEJANDRA DE LOS ANGELES FERNANDEZ VILLANUEVA DE LA CRUZ REPRESENTANTE LEGAL';
    order.contactName = longClientName;
    item.serialNumber = 'SN-2026-EXTREMADAMENTE-LARGA-ABCDEFGHIJKLMN-1234567890';
    item.accessories = 'Cargador, cable de poder, funda, mouse, adaptador USB y maletin';
    item.notes = 'Equipo con multiples rayones, golpe lateral y piezas externas faltantes';
    item.initialIssue = 'El equipo se apaga, no reconoce la bateria, muestra lineas y emite sonidos al encender durante varios minutos';

    await service.printEquipmentSticker(order, item, 1);

    const job = qzTrayPrintStub.printPdfLabel.calls.mostRecent().args[0];
    const pdfSource = atob(job.base64);
    expect(pdfSource).not.toContain(`(${longClientName}) Tj`);
    expect(pdfSource).toContain('...');
  });
});

function createServiceOrder() {
  return {
    id: 1,
    code: 'SO-BASE',
    operativeStatus: ServiceOrderOperativeStatus.ABIERTA,
    technicalStatus: 'ASIGNADA',
    serviceType: ServiceType.STANDARD_SERVICE,
    equipmentType: EquipmentType.LAPTOP,
    equipmentTypeOther: null,
    brand: 'Dell',
    model: 'Inspiron',
    serialNumber: 'SER-1',
    accessories: 'Cargador',
    notes: 'Equipo con rayón lateral',
    createdAt: '2026-04-01T10:00:00.000Z',
    clientSnapshotName: 'Cliente Base',
    clientSnapshotPhone: '999999999',
    clientSnapshotEmail: 'cliente@test.com',
    contactName: 'Cliente Base',
    contactPhone: '999999999',
    contactEmail: 'cliente@test.com',
  } as any;
}

function createServiceOrderItem(): ServiceOrderItem {
  return {
    id: 11,
    serviceOrderId: 1,
    position: 1,
    code: 'SO-BASE-01',
    equipmentType: EquipmentType.LAPTOP,
    equipmentTypeOther: null,
    brand: 'Dell',
    model: 'Inspiron',
    serialNumber: 'SER-1',
    accessories: 'Cargador',
    initialIssue: 'No muestra imagen en pantalla',
    notes: 'Rayon lateral',
    priority: 'MEDIUM',
    operativeStatus: ServiceOrderOperativeStatus.ABIERTA,
    technicalStatus: 'ASIGNADA',
    commercialStatus: 'NO_REQUIERE',
    estimatedRepairHours: null,
    estimatedDeliveryDate: null,
    deliveredAt: null,
    cancelledAt: null,
    warrantySourceItemId: null,
  } as ServiceOrderItem;
}

