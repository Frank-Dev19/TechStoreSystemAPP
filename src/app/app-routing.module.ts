import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './components/login/login';
import { AuthGuard } from './helpers/authguard';
import { AdminLayout } from './layouts/admin-layout/admin-layout';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { ResetPassword } from './pages/reset-password/reset-password';
const routes: Routes = [

  // Ruta para el login, se debe cargar primero
  { path: '', redirectTo: '/login', pathMatch: 'full' },  // Redirige a /login si la ruta está vacía
  { path: 'login', component: Login }, // Ruta para el login

  //Rutas publicas pe mi king

  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword },


  //Areas Protegidaaaaaaas
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
  { path: '**', redirectTo: '/login' }, // Redirige a login en caso de una ruta no válida
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
