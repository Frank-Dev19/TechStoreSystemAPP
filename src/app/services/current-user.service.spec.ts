import { CurrentUserService } from './current-user.service';

describe('CurrentUserService', () => {
  const service = new CurrentUserService();

  it('treats admin as authorized even when its permission snapshot is empty', () => {
    const admin = {
      roles: [{ name: 'admin', permissions: [] }],
      effectivePermissions: [],
    } as any;

    expect(service.hasPermission('navigation.sales', admin)).toBeTrue();
    expect(service.hasAllPermissions(['navigation.reception', 'navigation.technician'], admin)).toBeTrue();
    expect(service.hasAnyPermission(['navigation.inventory-manage'], admin)).toBeTrue();
  });

  it('continues enforcing effective permissions for non-admin users', () => {
    const technician = {
      roles: [{ name: 'technician', permissions: [] }],
      effectivePermissions: ['navigation.technician'],
    } as any;

    expect(service.hasPermission('navigation.technician', technician)).toBeTrue();
    expect(service.hasPermission('navigation.sales', technician)).toBeFalse();
  });
});
