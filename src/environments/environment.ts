export const environment = {
  production: false, // Este es el entorno de desarrollo. Cambiar a true para producciÃ³n.
};

// La configuraciÃ³n de las rutas de la API que se conectan al backend
export const config = {
  // â‡© apunta a tu API Nest (segÃºn tus logs corre en el 3000)
  endpointServices: 'http://localhost:3000',
  authMethod: '/auth/', // queda: http://localhost:3000/auth/...
  defaultCompanyId: 1,

  // mÃ³dulos API
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

  audit: {
    base: '/audit',
    search: '/audit/search',   // GET con SearchAuditDto
    stream: '/audit/stream',   // SSE
    byId: '/audit',            // GET /audit/:id
  },

  pricing: {
    base: '/pricing',
    config: '/pricing/config',
    taxes: '/pricing/taxes',
    queryProduct: '/pricing/query/product',
    queryBulk: '/pricing/query/bulk',
  },

  sales: {
    base: '/sales',
    simulate: '/sales/simulate',
    metrics: '/sales/metrics',
    byProduct: '/sales/by-product',
    documentSeries: '/document-series',
  },

  cashFlow: {
    register: '/cash-flow/register',
    openRegister: '/cash-flow/register/open',
    closeRegister: '/cash-flow/register/close',
    transactions: '/cash-flow/transactions',
    dailyReport: '/cash-flow/reports/daily',
  },


  serviceCatalog: {
    categories: '/service-categories',
    services: '/services',
  },
  serviceOrders: {
    serviceOrders: '/service-orders',
    serviceOrderItems: '/service-order-items',
    serviceOrderAgreements: '/service-order-agreements',
    serviceOrderDiagnoses: '/service-order-diagnoses',
    serviceOrderBillingLinks: '/service-orders/billing-links',
  },
};

