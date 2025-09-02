export const environment = {
  production: false, // Este es el entorno de desarrollo. Cambiar a true para producción.
};

// La configuración de las rutas de la API que se conectan al backend
export const config = {
  endpointServices: 'http://localhost:8080', // URL base de la API (ajustar si se usa otro servidor o puerto),
  authMethod: '/auth/', // Endpoint para autenticarse, es el que creamos en el backend
  adminTest: '/admin/test', // Endpoint de prueba para admin, también lo definimos en el backend
};
