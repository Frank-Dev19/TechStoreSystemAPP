import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../../services/login-service.service';
import { TriggerService } from '../../services/trigger-service.service';
import { RoleLandingService } from '../../services/role-landing.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login {
  loginForm: FormGroup;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private loginService: LoginService,
    private router: Router,
    private triggerService: TriggerService,
    private roleLandingService: RoleLandingService,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;
    const { email, password } = this.loginForm.value;

    this.triggerService.fireShowLoader();
    this.loginService.login(email, password).subscribe({
      next: (response) => {
        this.triggerService.fireHideLoader();
        this.router.navigateByUrl(this.roleLandingService.getDefaultRoute(response.user));
      },
      error: () => {
        this.errorMessage = 'Credenciales inválidas o servicio no disponible';
        this.triggerService.fireHideLoader();
      }
    });
  }
}
