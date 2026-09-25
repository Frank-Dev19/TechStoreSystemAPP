import { PermissionGuard } from '../../helpers/permission.guard';
import { AdminLayoutRoutes } from './admin-layout.routing';

describe('AdminLayoutRoutes', () => {
  it('protects internal deliveries with navigation and read permissions', () => {
    const route = AdminLayoutRoutes.find((candidate) => candidate.path === 'internal-deliveries');

    expect(route).toBeDefined();
    expect(route?.canActivate).toEqual([PermissionGuard]);
    expect(route?.data?.['requiredPermissions']).toEqual([
      'navigation.internal-deliveries',
      'dispatches.read',
    ]);
  });
});
