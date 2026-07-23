import { HttpHeaders } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EquipmentType, ServiceOrderOperativeStatus, ServiceType } from '../../models/service-orders/service-order';
import { config } from '../../../environments/environment';
import { ServiceOrderDocumentsService } from './service-order-documents.service';

describe('ServiceOrderDocumentsService', () => {
  let service: ServiceOrderDocumentsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
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

  it('genera el sticker sin depender del renderer legacy del resumen', () => {
    spyOn(window, 'open').and.stub();

    service.openEquipmentStickerPdf({
      serviceOrder: createServiceOrder(),
      agreement: null,
    });

    expect(window.open).toHaveBeenCalled();
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

