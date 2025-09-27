import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthPasswordService } from '../../services/auth-password.service';

@Component({
  selector: 'app-forgot-password',
  standalone: false,
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss'],
})
export class ForgotPassword {
  sent = false;
  error = '';

  form!: FormGroup;  // <-- declara sin inicializar

  constructor(
    private fb: FormBuilder,
    private authPwd: AuthPasswordService
  ) {
    // <-- y aquí lo creas, cuando fb ya existe
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  submit() {
    if (this.form.invalid) return;
    const email = this.form.value.email;
    this.authPwd.forgotPassword(email).subscribe({
      next: () => { this.sent = true; this.error = ''; },
      error: () => { this.sent = true; this.error = ''; } // respuesta neutra
    });
  }
}
