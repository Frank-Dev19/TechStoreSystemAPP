import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators, AbstractControl, FormGroup } from '@angular/forms';
import { AuthPasswordService } from '../../services/auth-password.service';

function match(controlName: string, confirmName: string) {
  return (group: AbstractControl) => {
    const c = group.get(controlName);
    const cc = group.get(confirmName);
    if (!c || !cc) return null;
    const equal = c.value === cc.value;
    if (!equal) cc.setErrors({ mismatch: true }); else cc.setErrors(null);
    return null;
  };
}


@Component({
  selector: 'app-reset-password',
  standalone: false,
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPassword implements OnInit {

  state: 'verifying' | 'invalid' | 'form' | 'done' = 'verifying';
  uid!: number;
  token!: string;

  form!: FormGroup

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private authPwd: AuthPasswordService
  ) {

    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirm: ['', [Validators.required]],
    }, { validators: match('newPassword', 'confirm') });
  }

  ngOnInit(): void {
    this.uid = Number(this.route.snapshot.queryParamMap.get('uid') || 0);
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.uid || !this.token) { this.state = 'invalid'; return; }

    this.authPwd.verifyReset(this.uid, this.token).subscribe({
      next: (res) => this.state = res.ok ? 'form' : 'invalid',
      error: () => this.state = 'invalid'
    });
  }

  submit() {
    if (this.form.invalid) return;
    const pwd = this.form.value.newPassword!;
    this.authPwd.resetPassword(this.uid, this.token, pwd).subscribe({
      next: () => this.state = 'done',
      error: () => this.state = 'invalid'
    });
  }

  goLogin() { this.router.navigate(['/login']); }

}
