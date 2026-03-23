export const environment = {
  production: true,
};

export const config = {
  // IMPORTANTE:
  // - En producciÃ³n (Docker + nginx) el navegador debe llamar a nginx (mismo host)
  // - nginx reenvÃ­a a la API con /api -> http://api:3000
  endpointServices: '/api',

  authMethod: '/auth/', // queda: /api/auth/...
  defaultCompanyId: 1,

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
    lots: '/lots',
  },

  audit: {
    base: '/audit',
    search: '/audit/search',
    stream: '/audit/stream',
    byId: '/audit',
  },

  pricing: {
    base: '/pricing',
    priceLists: '/pricing/price-lists',
    productPrices: '/pricing/product-prices',
    discountRules: '/pricing/discount-rules',
    combos: '/pricing/combos',
    queryProduct: '/pricing/query/product',
    simulation: '/pricing/simulation',
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
  },
};

