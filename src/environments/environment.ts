export const environment = {
  production: false, // Este es el entorno de desarrollo. Cambiar a true para produccion.
};

// La configuracion de las rutas de la API que se conectan al backend
export const config = {
  // Apunta a tu API Nest local
  endpointServices: 'http://localhost:3000',
  authMethod: '/auth/',
  defaultCompanyId: 1,

  // modulos API
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

  businessProfile: {
    base: '/business-profile',
  },

  electronicBilling: {
    base: '/electronic-billing',
  },

  serviceOrders: {
    serviceOrders: '/service-orders',
    serviceOrderItems: '/service-order-items',
    serviceOrderAgreements: '/service-order-agreements',
    serviceOrderDiagnoses: '/service-order-diagnoses',
    serviceOrderBillingLinks: '/service-orders/backoffice/billing-links',
    serviceOrderInboxThreads: '/service-orders/inbox/threads',
    serviceOrderInboxAttachments: '/service-orders/inbox/attachments',
  },
};
