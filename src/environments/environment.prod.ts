export const environment = {
    production: true, // Este es el entorno de desarrollo. Cambiar a true para producción.
};

// La configuración de las rutas de la API que se conectan al backend
export const config = {
    endpointServices: '', // URL base de la API (ajustar si se usa otro servidor o puerto),
    authMethod: '/auth/', // Endpoint para autenticarse, es el que creamos en el backend

};
