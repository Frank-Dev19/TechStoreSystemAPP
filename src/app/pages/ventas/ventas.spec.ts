import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable, of, Subject } from 'rxjs';

import { CashFlowApiService } from '../../services/sales/cash-flow-api.service';
import { ClientsApiService } from '../../services/clients-api.service';
import { CurrentUserService } from '../../services/current-user.service';
import { DocumentSeriesApiService } from '../../services/sales/document-series-api.service';
import { DocumentTypesApiService } from '../../services/document-types-api.service';
import { ElectronicBillingApiService } from '../../services/electronic-billing/electronic-billing-api.service';
import { PricingProductsApiService } from '../../services/pricing/pricing-products-api.service';
import { PricingQueryApiService } from '../../services/pricing/pricing-query-api.service';
import { PricingStockApiService } from '../../services/pricing-stock-api.service';
import { ProductsApiService } from '../../services/products-api.service';
import { SalesApiService } from '../../services/sales/sales-api.service';
import { StockService } from '../../services/inventory/stock.service';
import { Ventas } from './ventas';

describe('Ventas', () => {
  let component: Ventas;
  let fixture: ComponentFixture<Ventas>;
  const salesApiStub = {
    create: jasmine.createSpy('create').and.returnValue(of({ id: 10 })),
  };
  const electronicBillingApiStub = {
    downloadPdf: jasmine.createSpy('downloadPdf').and.returnValue(of(new Blob(['pdf']))),
  };

  beforeEach(async () => {
    spyOn(Ventas.prototype, 'ngOnInit').and.stub();
    salesApiStub.create.calls.reset();
    salesApiStub.create.and.returnValue(of({ id: 10 }));
    electronicBillingApiStub.downloadPdf.and.returnValue(of(new Blob(['pdf'])));

    await TestBed.configureTestingModule({
      declarations: [Ventas],
      imports: [FormsModule, ReactiveFormsModule],
      providers: [
        { provide: SalesApiService, useValue: salesApiStub },
        { provide: DocumentSeriesApiService, useValue: {} },
        { provide: ProductsApiService, useValue: {} },
        { provide: CashFlowApiService, useValue: {} },
        { provide: ClientsApiService, useValue: {} },
        { provide: PricingStockApiService, useValue: {} },
        { provide: PricingProductsApiService, useValue: {} },
        { provide: StockService, useValue: {} },
        { provide: DocumentTypesApiService, useValue: {} },
        { provide: PricingQueryApiService, useValue: {} },
        { provide: CurrentUserService, useValue: { value: { id: 1, name: 'Test User' } } },
        { provide: ElectronicBillingApiService, useValue: electronicBillingApiStub },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(Ventas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('se crea correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('descarga exclusivamente el PDF del comprobante electrónico aceptado', async () => {
    const showToastSpy = spyOn(component, 'showToast');
    spyOn<any>(component, 'downloadBlob');
    component.electronicDocumentsBySaleId[77] = {
      id: 1,
      saleId: 77,
      companyId: 1,
      provider: 'APISPERU',
      documentType: 'FACTURA',
      sunatDocumentTypeCode: '01',
      series: 'F001',
      number: '123',
      status: 'ACCEPTED',
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-20T10:00:00.000Z',
    };

    await component.onDownloadSalePdf({ id: 77, companyId: 1, documentType: 'FACTURA', series: 'F001', number: '123' } as never);

    expect(electronicBillingApiStub.downloadPdf).toHaveBeenCalledWith(77);
    expect(showToastSpy).toHaveBeenCalledWith('success', 'PDF electronico descargado');
  });

  it('usa el selector nativo y confirma solo después de escribir el archivo', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    const write = jasmine.createSpy('write').and.resolveTo();
    const close = jasmine.createSpy('close').and.resolveTo();
    const createWritable = jasmine.createSpy('createWritable').and.resolveTo({ write, close });
    const picker = jasmine.createSpy('showSaveFilePicker').and.resolveTo({ createWritable });
    const showToastSpy = spyOn(component, 'showToast');
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: picker,
    });

    try {
      await (component as any).downloadElectronicFile(
        of(blob),
        'comprobante.pdf',
        'PDF electrónico descargado',
      );

      expect(picker).toHaveBeenCalledWith(jasmine.objectContaining({
        suggestedName: 'comprobante.pdf',
      }));
      expect(write).toHaveBeenCalledOnceWith(blob);
      expect(close).toHaveBeenCalled();
      expect(showToastSpy).toHaveBeenCalledWith('success', 'PDF electrónico descargado');
    } finally {
      delete (window as any).showSaveFilePicker;
    }
  });

  it('no solicita el archivo ni muestra error cuando el usuario cancela el selector', async () => {
    const request$ = new Observable<Blob>((subscriber) => {
      subscriber.error(new Error('La solicitud no debió iniciarse'));
    });
    const picker = jasmine.createSpy('showSaveFilePicker').and.rejectWith(
      new DOMException('Cancelado', 'AbortError'),
    );
    const showToastSpy = spyOn(component, 'showToast');
    const downloadSpy = spyOn<any>(component, 'downloadBlob');
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: picker,
    });

    try {
      await (component as any).downloadElectronicFile(
        request$,
        'comprobante.pdf',
        'PDF electrónico descargado',
      );

      expect(downloadSpy).not.toHaveBeenCalled();
      expect(showToastSpy).not.toHaveBeenCalled();
    } finally {
      delete (window as any).showSaveFilePicker;
    }
  });

  it('mantiene la venta general como venta manual de productos', () => {
    const showToastSpy = spyOn(component, 'showToast');
    spyOn(component as any, 'loadSales');
    spyOn(component as any, 'loadOpenRegister');
    component.saleFormData = {
      documentType: 'BOLETA',
      paymentType: 'EFECTIVO',
      lines: [{ itemType: 'PRODUCT', productId: 3, productName: 'SSD', quantity: 2, unitPrice: 50, lineTotal: 100 }],
      total: 100,
    };
    component.foundCustomer = { id: 55, name: 'Cliente', documentNumber: '123' } as any;

    component.onConfirmSale();

    expect(salesApiStub.create).toHaveBeenCalledWith(jasmine.objectContaining({
      customerId: 55,
      saleType: 'PRODUCT',
      items: [jasmine.objectContaining({ itemType: 'PRODUCT', productId: 3, serviceId: null })],
    }));
    expect(showToastSpy).toHaveBeenCalledWith('success', 'Venta registrada exitosamente');
  });

  it('envía una sola solicitud cuando se confirma dos veces antes de recibir respuesta', () => {
    const pendingResponse = new Subject<any>();
    salesApiStub.create.and.returnValue(pendingResponse);
    component.saleFormData = {
      documentType: 'BOLETA',
      paymentType: 'YAPE',
      lines: [{ itemType: 'PRODUCT', productId: 3, productName: 'Mouse', quantity: 2, unitPrice: 108.56 }],
      total: 217.12,
    };
    component.foundCustomer = { id: 55, name: 'Cliente', documentNumber: '123' } as any;

    component.onConfirmSale();
    component.onConfirmSale();

    expect(salesApiStub.create).toHaveBeenCalledTimes(1);
    expect(salesApiStub.create).toHaveBeenCalledWith(jasmine.objectContaining({
      idempotencyKey: jasmine.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
    }));
    pendingResponse.complete();
  });

  it('no muestra búsqueda ni modo de venta desde orden', () => {
    component.activeTab = 'create';
    component.saleFormData = {
      documentType: 'BOLETA',
      paymentType: 'EFECTIVO',
      lines: [],
      total: 0,
      subtotal: 0,
      igv: 0,
    };
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Venta desde orden/cotización');
    expect(text).not.toContain('Buscar orden por código');
    expect(text).toContain('Items de la venta');
  });
});
