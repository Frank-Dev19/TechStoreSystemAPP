import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './components/login/login';
import { AuthGuard } from './helpers/authguard';
import { AdminLayout } from './layouts/admin-layout/admin-layout';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { ResetPassword } from './pages/reset-password/reset-password';
const routes: Routes = [

  // Ruta inicial de autenticación
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },

  // Rutas públicas

  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword },


  // Áreas protegidas
  {
    path: "",
    component: AdminLayout,
    children: [
      {
        path: "",
        loadChildren: () => import("./layouts/admin-layout/admin-layout.module").then(x => x.AdminLayoutModule)
      }
    ],
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
