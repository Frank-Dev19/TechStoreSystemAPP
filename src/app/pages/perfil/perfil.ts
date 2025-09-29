import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from "@angular/forms"
import { CurrentUserService } from '../../services/current-user.service';
import { User } from '../../models/user/user';
import { ProfileService } from '../../services/profile.service';


interface PerfilData {
  nombre: string;
  email: string;
  celular: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaRegistro: Date;
  fotoUrl: string;
}

@Component({
  selector: 'app-perfil',
  standalone: false,
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss'
})
export class Perfil implements OnInit {

  perfilForm!: FormGroup;
  contrasenaForm!: FormGroup;

  perfilData: PerfilData = {
    nombre: "",
    email: "",
    celular: "",
    tipoDocumento: "",
    numeroDocumento: "",
    fechaRegistro: new Date(),
    fotoUrl: "/assets/img/user.png",
  };

  hasChanges = false;
  mostrarCambioContrasena = false;
  mostrarConfirmacion = false;
  mostrarContrasenaActual = false;
  mostrarNuevaContrasena = false;
  mostrarConfirmarContrasena = false;

  mostrarAlerta = false;
  tipoAlerta = "";
  mensajeAlerta = "";
  iconoAlerta = "";

  private datosOriginales: any = {};

  constructor(
    private fb: FormBuilder,
    private profile: ProfileService,
    private current: CurrentUserService,
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadPerfilData();
  }

  private initializeForms(): void {
    this.perfilForm = this.fb.group({
      nombre: ["", [Validators.required, Validators.minLength(2)]],
      email: [""],
      celular: ["", [Validators.required, Validators.pattern(/^\+?[0-9\s-]{9,15}$/)]],
      tipoDocumento: [""],
      numeroDocumento: [""],
    });

    this.contrasenaForm = this.fb.group(
      {
        contrasenaActual: ["", [Validators.required]],
        nuevaContrasena: ["", [Validators.required, Validators.minLength(6)]],
        confirmarContrasena: ["", [Validators.required]],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  private loadPerfilData(): void {
    // Si ya tengo el usuario en memoria, lo uso; si no, pido al backend
    const existing = this.current.value;
    if (existing) {
      this.applyUser(existing);
    } else {
      this.profile.getMe().subscribe({
        next: (u) => { this.profile.setCurrent(u); this.applyUser(u); },
        error: () => this.mostrarMensaje("error","fas fa-exclamation-circle","No se pudo cargar el perfil")
      });
    }
  }

  private applyUser(u: User) {
    this.perfilData = {
      nombre: u.name,
      email: u.email,
      celular: u.phone ?? "",
      tipoDocumento: u.documentType?.name ?? "",
      numeroDocumento: u.documentNumber ?? "",
      fechaRegistro: new Date(u.createdAt),
      fotoUrl: "/assets/img/user.png",
    };

    this.perfilForm.patchValue({
      nombre: this.perfilData.nombre,
      email: this.perfilData.email,
      celular: this.perfilData.celular,
      tipoDocumento: this.perfilData.tipoDocumento,
      numeroDocumento: this.perfilData.numeroDocumento,
    });

    this.datosOriginales = { ...this.perfilForm.value };
    this.perfilForm.get("email")?.disable();
    this.perfilForm.get("tipoDocumento")?.disable();
    this.perfilForm.get("numeroDocumento")?.disable();
  }

  onFieldChange(): void {
    const datosActuales = this.perfilForm.value;
    this.hasChanges = JSON.stringify(datosActuales) !== JSON.stringify(this.datosOriginales);
  }

  guardarCambios(): void {
    if (!this.perfilForm.valid || !this.hasChanges) return;

    const payload = {
      name: this.perfilForm.get("nombre")?.value,
      phone: this.perfilForm.get("celular")?.value,
    };

    this.profile.updateMe(payload).subscribe({
      next: (u) => {
        this.profile.setCurrent(u);
        this.applyUser(u);
        this.hasChanges = false;
        this.mostrarMensaje("success", "fas fa-check-circle", "Perfil actualizado correctamente");
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo actualizar el perfil';
        this.mostrarMensaje("error", "fas fa-exclamation-circle", Array.isArray(msg) ? msg[0] : msg);
      }
    });
  }

  toggleCambioContrasena(): void {
    this.mostrarCambioContrasena = !this.mostrarCambioContrasena;
    if (this.mostrarCambioContrasena) {
      this.contrasenaForm.reset();
      this.resetPasswordVisibility();
    }
  }

  cambiarContrasena(): void {
    if (this.contrasenaForm.valid) {
      this.mostrarConfirmacion = true;
    }
  }

  cerrarConfirmacion(): void { this.mostrarConfirmacion = false; }

  confirmarCambioContrasena(): void {
    const { contrasenaActual, nuevaContrasena } = this.contrasenaForm.value;

    this.profile.changePassword(contrasenaActual, nuevaContrasena).subscribe({
      next: () => {
        this.cerrarConfirmacion();
        this.mostrarCambioContrasena = false;
        this.contrasenaForm.reset();
        this.resetPasswordVisibility();
        this.mostrarMensaje("success", "fas fa-check-circle", "Contraseña cambiada correctamente");
      },
      error: (err) => {
        this.cerrarConfirmacion();
        const msg = err?.error?.message || 'No se pudo cambiar la contraseña';
        this.mostrarMensaje("error", "fas fa-exclamation-circle",
          Array.isArray(msg) ? msg[0] : msg);
      }
    });
  }

  togglePasswordVisibility(campo: string): void {
    if (campo === "actual") this.mostrarContrasenaActual = !this.mostrarContrasenaActual;
    if (campo === "nueva") this.mostrarNuevaContrasena = !this.mostrarNuevaContrasena;
    if (campo === "confirmar") this.mostrarConfirmarContrasena = !this.mostrarConfirmarContrasena;
  }

  private resetPasswordVisibility(): void {
    this.mostrarContrasenaActual = false;
    this.mostrarNuevaContrasena = false;
    this.mostrarConfirmarContrasena = false;
  }

  private passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const nueva = control.get("nuevaContrasena");
    const conf = control.get("confirmarContrasena");
    if (!nueva || !conf) return null;
    if (!nueva.value || !conf.value) return null;
    return nueva.value === conf.value ? null : { passwordMismatch: true };
  }

  private mostrarMensaje(tipo: string, icono: string, mensaje: string): void {
    this.tipoAlerta = tipo;
    this.iconoAlerta = icono;
    this.mensajeAlerta = mensaje;
    this.mostrarAlerta = true;
    setTimeout(() => this.cerrarAlerta(), 5000);
  }

  cerrarAlerta(): void { this.mostrarAlerta = false; }
}
