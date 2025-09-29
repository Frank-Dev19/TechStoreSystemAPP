import { NgModule } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { RouterModule } from "@angular/router";
import { CommonModule, DatePipe } from "@angular/common";
import { NgbModule, NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { NgApexchartsModule } from 'ng-apexcharts';

import { AdminLayoutRoutes } from "./admin-layout.routing";
//import { HomeComponent } from '../../pages/home/home';
//import { GesionUsuariosComponent } from '../../pages/gesion-usuarios/gesion-usuarios';
import { Dashboard } from "../../components/dashboard/dashboard";
import { Home } from "../../pages/home/home";
import { Clientes } from "../../pages/clientes/clientes";
// import { ForgotPassword } from "../../pages/forgot-password/forgot-password";
// import { ResetPassword } from "../../pages/reset-password/reset-password";
import { Tests } from "../../pages/tests/tests";
import { Perfil } from "../../pages/perfil/perfil";
@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild(AdminLayoutRoutes),
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        NgbModule,
        NgbCollapseModule,
        NgApexchartsModule
        //   AgGridModule,
        //   NgMultiSelectDropDownModule,
        //   FullCalendarModule,
        //   BsDatepickerModule.forRoot(),
        //   ModalModule.forChild(),
        //   NgSelectModule,
        //   PopoverModule.forRoot(),
        //   IMaskModule
    ],
    declarations: [
        //HomeComponent,
        //GesionUsuariosComponent,
        Home,
        Dashboard,
        Clientes,
        Tests,
        Perfil
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
