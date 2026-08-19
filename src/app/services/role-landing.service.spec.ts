import { TestBed } from '@angular/core/testing';
import { User } from '../models/user/user';
import { RoleLandingService } from './role-landing.service';

describe('RoleLandingService', () => {
  let service: RoleLandingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoleLandingService);
  });

  const userWithRole = (role: string): User => ({
    id: 1,
    email: 'usuario@macrochips.com',
    name: 'Usuario',
    phone: null,
    documentType: null,
    documentNumber: null,
    isActive: true,
    roles: [{ id: 1, name: role, permissions: [] }],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('dirige al administrador al panel de supervisor', () => {
    expect(service.getDefaultRoute(userWithRole('admin'))).toBe('/supervisor-panel');
  });

  it('dirige a la recepcionista al panel de recepcion', () => {
    expect(service.getDefaultRoute(userWithRole('recepcionista'))).toBe('/reception-panel');
  });

  it('dirige al tecnico al panel de tecnico', () => {
    expect(service.getDefaultRoute(userWithRole('technician'))).toBe('/technician-panel');
  });

  it('usa el perfil como destino seguro para un rol desconocido', () => {
    expect(service.getDefaultRoute(userWithRole('otro'))).toBe('/perfil');
  });
});
