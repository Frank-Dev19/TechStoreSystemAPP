export const environment = {
  production: false, // Este es el entorno de desarrollo. Cambiar a true para producción.
};

// La configuración de las rutas de la API que se conectan al backend
export const config = {
  // ⇩ apunta a tu API Nest (según tus logs corre en el 3000)
  endpointServices: 'http://localhost:3000',
  authMethod: '/auth/', // queda: http://localhost:3000/auth/...
  defaultCompanyId: 1,

  // módulos API
  inventory: {
    base: '/inventory',
    stock: '/inventory/stock',
    kardex: '/inventory/movements',
    counts: '/inventory/counts',
    serials: '/serials',
  },
  catalogs: {
    products: '/inventory/catalogs/products',
    categories: '/inventory/catalogs/categories',
    units: '/inventory/catalogs/units',
    lots: '/lots',               // si tu backend lo expone
  },
  serviceCatalog: {
    categories: '/service-categories',
    services: '/services',
  },
  tickets: {
    tickets: '/ticket',
    ticketItems: '/ticket/items',
    quotes: '/quotes',
    diagnostics: '/diagnostics',
  },
};
