import { NgModule } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { RouterModule } from "@angular/router";
import { CommonModule, DatePipe } from "@angular/common";
import { NgbModule, NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { NgApexchartsModule } from 'ng-apexcharts';
import { NgSelectModule } from '@ng-select/ng-select';

import { AdminLayoutRoutes } from "./admin-layout.routing";
import { Dashboard } from "../../components/dashboard/dashboard";
import { Home } from "../../pages/home/home";
import { Clients } from "../../pages/clients/clients";
import { Suppliers } from "../../pages/suppliers/suppliers";
import { Tests } from "../../pages/tests/tests";
import { Perfil } from "../../pages/perfil/perfil";
import { DocumentTypes } from "../../pages/document-types/document-types";
import { Rbac } from "../../pages/rbac/rbac";
import { Inventory } from "../../pages/inventory/inventory";
import { Auditoria } from "../../pages/auditoria/auditoria";
import { Ventas } from "../../pages/ventas/ventas";
import { Pricing } from "../../pages/pricing/pricing";
import { BusinessProfilePage } from "../../pages/business-profile/business-profile";
import { MailSettingsPage } from "../../pages/mail-settings/mail-settings";
import { TechnicianPanel } from "../../pages/technician-panel/technician-panel";
import { ReceptionPanel } from "../../pages/reception-panel/reception-panel";
import { ServiceOrderInboxPage } from "../../pages/service-order-inbox/service-order-inbox";
import { SupervisorPanel } from "../../pages/supervisor-panel/supervisor-panel";
import { WarrantiesPage } from "../../pages/warranties/warranties";
import { PhoneInputComponent } from "../../components/phone-input/phone-input";
import { ServiceOrderClientDecisionModalComponent } from "../../components/service-order-client-decision-modal/service-order-client-decision-modal";
import { ServiceOrderLineDiscountModalComponent } from "../../components/service-order-line-discount-modal/service-order-line-discount-modal";
import { ServiceOrderItemCancellationModalComponent } from "../../components/service-order-item-cancellation-modal/service-order-item-cancellation-modal";
import { ServiceOrderItemDeliveryModalComponent } from "../../components/service-order-item-delivery-modal/service-order-item-delivery-modal";
import { ServiceOrderItemProgressComponent } from "../../components/service-order-item-progress/service-order-item-progress";
import { ServiceOrderSaleModalComponent } from "../../components/service-order-sale-modal/service-order-sale-modal";

@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild(AdminLayoutRoutes),
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        NgbModule,
        NgbCollapseModule,
        NgApexchartsModule,
        NgSelectModule,
        PhoneInputComponent
    ],
    declarations: [
        Home,
        Dashboard,
        Clients,
        Suppliers,
        DocumentTypes,
        Tests,
        Perfil,
        Rbac,
        Inventory,
        Auditoria,
        Ventas,
        Pricing,
        BusinessProfilePage,
        MailSettingsPage,
        TechnicianPanel,
        ReceptionPanel,
        ServiceOrderInboxPage,
        SupervisorPanel,
        WarrantiesPage,
        ServiceOrderClientDecisionModalComponent,
        ServiceOrderLineDiscountModalComponent,
        ServiceOrderItemCancellationModalComponent,
        ServiceOrderItemDeliveryModalComponent,
        ServiceOrderItemProgressComponent,
        ServiceOrderSaleModalComponent,
    ],
    providers: [DatePipe],
    exports: [
        FormsModule,
        ReactiveFormsModule
    ]
})
export class AdminLayoutModule { }
