# Admin full navigation

Admin is the operational superuser, but the sidebar and permission guard previously trusted an `effectivePermissions` snapshot before considering the admin role. An empty or stale snapshot hid valid navigation entries and blocked routes.

Make the admin role an explicit permission bypass in the shared authorization helpers, sidebar visibility, and route guard. Preserve permission enforcement for every non-admin role.
