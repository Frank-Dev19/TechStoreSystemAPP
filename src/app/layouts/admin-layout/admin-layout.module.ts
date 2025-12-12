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
import { BusinessPartners } from "../../pages/business-partners/business-partners";
// import { ForgotPassword } from "../../pages/forgot-password/forgot-password";
// import { ResetPassword } from "../../pages/reset-password/reset-password";
import { Tests } from "../../pages/tests/tests";
import { Perfil } from "../../pages/perfil/perfil";
import { DocumentTypes } from "../../pages/document-types/document-types";
import { Rbac } from "../../pages/rbac/rbac";
import { Inventory } from "../../pages/inventory/inventory";
import { ServiceCatalog } from "../../pages/service-catalog/service-catalog";
import { TechnicianPanel } from "../../pages/technician-panel/technician-panel";
import { ReceptionPanel } from "../../pages/reception-panel/reception-panel";
import { SupervisorPanel } from "../../pages/supervisor-panel/supervisor-panel";

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
        NgSelectModule
    ],
    declarations: [
        Home,
        Dashboard,
        BusinessPartners,
        DocumentTypes,
        Tests,
        Perfil,
        Rbac,
        Inventory,
        ServiceCatalog,
        TechnicianPanel,
        ReceptionPanel,
        SupervisorPanel,
        //ForgotPassword,
        //ResetPassword

    ],
    providers: [DatePipe],
    exports: [
        FormsModule,
        ReactiveFormsModule
    ]
})
export class AdminLayoutModule { }
