import { PermissionGuard } from './permission.guard';
import { CurrentUserService } from '../services/current-user.service';
describe('PermissionGuard', () => {
  it('allows an admin to open permission-protected navigation routes', () => {
    const user = new CurrentUserService();
    spyOn(user, 'restoreFromStorage');
    spyOnProperty(user, 'value', 'get').and.returnValue({ roles: [{ name: 'admin' }], effectivePermissions: [] } as any);
    const router = { navigate: jasmine.createSpy() };
    expect(new PermissionGuard(user, router as any).canActivate({ data: { requiredPermissions: ['navigation.sales'] } } as any, {} as any)).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });
  it('denies missing permissions to non-admin users', () => {
    const user = new CurrentUserService();
    spyOn(user, 'restoreFromStorage');
    spyOnProperty(user, 'value', 'get').and.returnValue({ roles: [{ name: 'technician' }], effectivePermissions: [] } as any);
    const router = { navigate: jasmine.createSpy() };
    expect(new PermissionGuard(user, router as any).canActivate({ data: { requiredPermissions: ['navigation.sales'] } } as any, {} as any)).toBeFalse();
  });
});
