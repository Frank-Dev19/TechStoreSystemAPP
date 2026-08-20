export const environment = {
  production: true,
};

export const config = {
  // En produccion, el navegador llama a nginx en el mismo host.
  // nginx reenvia /api hacia el contenedor api.
  endpointServices: '/api',

  authMethod: '/auth/',
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

  mailSettings: {
    base: '/mail-settings',
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
