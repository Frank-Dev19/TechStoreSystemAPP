import { TestBed } from '@angular/core/testing';

import { EquipmentType, ServiceOrderOperativeStatus, ServiceType } from '../../models/service-orders/service-order';
import { ServiceOrderDocumentsService } from './service-order-documents.service';

describe('ServiceOrderDocumentsService', () => {
  let service: ServiceOrderDocumentsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceOrderDocumentsService);
  });

  it('genera el sticker sin incluir datos del cliente y sin estado operativo', () => {
    const capturedLabels: string[] = [];
    spyOn<any>(service, 'buildThermalFieldLines').and.callFake((label: string, value: string) => {
      capturedLabels.push(`${label}:${value}`);
      return [`${label}:${value}`];
    });
    spyOn(window, 'open').and.stub();

    service.openEquipmentStickerPdf({
      serviceOrder: createServiceOrder(),
      agreement: null,
    });

    expect(capturedLabels).toContain('Tipo:Laptop');
    expect(capturedLabels).toContain('Marca:Dell');
    expect(capturedLabels).toContain('Modelo:Inspiron');
    expect(capturedLabels).toContain('Serie:SER-1');
    expect(capturedLabels.some((entry) => entry.startsWith('Ingreso:'))).toBeTrue();
    expect(capturedLabels).toContain('Accesorios:Cargador');
    expect(capturedLabels).toContain('Notas:Equipo con rayón lateral');
    expect(capturedLabels.some((entry) => entry.startsWith('Estado:'))).toBeFalse();
    expect(capturedLabels.some((entry) => entry.includes('Cliente Base'))).toBeFalse();
    expect(capturedLabels.some((entry) => entry.includes('999999999'))).toBeFalse();
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
