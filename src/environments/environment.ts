export const environment = {
  production: false, // Este es el entorno de desarrollo. Cambiar a true para producción.
};

// La configuración de las rutas de la API que se conectan al backend
export const config = {
  // ⇩ apunta a tu API Nest (según tus logs corre en el 3000)
  endpointServices: 'http://localhost:3000',
  authMethod: '/auth/', // queda: http://localhost:3000/auth/...
  defaultCompanyId: 1,
};
