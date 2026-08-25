import { NgModule, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './helpers/auth-interceptor';

import { ReactiveFormsModule } from '@angular/forms'; // Importa ReactiveFormsModule
import { NgbModule, NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { LoginService } from './services/login-service.service';
import { BaseService } from './services/base.service';

import { AdminLayout } from './layouts/admin-layout/admin-layout';
import { Login } from './components/login/login';
import { ComponentsModule } from './components/components.module';

import localePE from "@angular/common/locales/es-PE";
import { registerLocaleData } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { ResetPassword } from './pages/reset-password/reset-password';
import { OrderSurvey } from './pages/order-survey/order-survey';
//import { Pricing } from './pages/pricing/pricing';
// import { Ventas } from './pages/ventas/ventas';
//import { Auditoria } from './pages/auditoria/auditoria';
//import { Inventory } from './pages/inventory/inventory';
//import { Perfil } from './pages/perfil/perfil';

registerLocaleData(localePE, 'es-PE');

@NgModule({
  declarations: [
    AppComponent,
    AdminLayout,
    Login,
    ForgotPassword,
    ResetPassword,
    OrderSurvey,
    //Pricing,
    //Ventas,
    //Auditoria,



    //Clientes
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    ComponentsModule,
    NgbModule,
    NgbCollapseModule,
    NgApexchartsModule

  ],
  providers: [
    LoginService,
    { provide: LOCALE_ID, useValue: "es-PE" },
    BaseService,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
    //provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
