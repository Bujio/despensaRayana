/**
 * Valida que todas las variables de entorno requeridas estén presentes
 * al arrancar el servidor. Si falta alguna, imprime un mensaje claro
 * y aborta el proceso antes de que cualquier módulo intente usarlas.
 *
 * Se llama una sola vez en index.js, justo después de cargar dotenv.
 */
const REQUIRED_ENV_VARS = [
    'MONGODB_URI2',
    'JWT_SECRET',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
    'EMAIL_FROM',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
];

export const validateEnv = () => {
    const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        console.error(
            `Missing required environment variables: ${missing.join(', ')}`,
        );
        console.error('Check your .env file against .env.example');
        process.exit(1);
    }
};
