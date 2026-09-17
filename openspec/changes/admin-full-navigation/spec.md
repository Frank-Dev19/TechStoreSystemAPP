# Requirements

- A user with the normalized `admin` role MUST see every sidebar navigation option.
- A user with the normalized `admin` role MUST pass permission-protected frontend routes even when `effectivePermissions` is empty or stale.
- Non-admin users MUST continue to require their effective or role permissions.
- The application development server MUST continue to use Angular's default port 4200 unless a test process explicitly overrides it.
