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

  audit: {
    base: '/audit',
    search: '/audit/search',   // GET con SearchAuditDto
    stream: '/audit/stream',   // SSE
    byId: '/audit',            // GET /audit/:id
  },

  pricing: {
    base: '/pricing',
    priceLists: '/pricing/price-lists',
    productPrices: '/pricing/product-prices',
    discountRules: '/pricing/discount-rules',
    combos: '/pricing/combos',
    // prefijo para /pricing/query/product/:id y /best
    queryProduct: '/pricing/query/product',
    simulation: '/pricing/simulation'
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
  tickets: {
    tickets: '/ticket',
    ticketItems: '/ticket/items',
    quotes: '/quotes',
    diagnostics: '/diagnostics',
  },
};
