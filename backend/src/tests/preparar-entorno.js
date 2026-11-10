// Permite ejecutar las pruebas sin un archivo .env.
// Este valor solo se usa en pruebas y no sirve en ningún otro entorno.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET ||= "clave-exclusiva-para-pruebas-automatizadas";
