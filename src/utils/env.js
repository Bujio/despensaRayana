/**
 * Valida que todas las variables de entorno requeridas estén presentes
 * al arrancar el servidor. Si falta alguna, imprime un mensaje claro
 * y aborta el proceso antes de que cualquier módulo intente usarlas.
 *
 * Se llama una sola vez en index.js, justo después de cargar dotenv.
 *
 * Nota: este módulo NO importa el logger porque se ejecuta antes que
 * cualquier otro módulo, cuando todavía no se sabe si el entorno es válido.
 * Por eso usamos console.error directamente con el disable de ESLint.
 */
const REQUIRED_ENV_VARS = [
    'JWT_SECRET',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
    'EMAIL_FROM',
];

export const validateEnv = () => {
    const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

    if (!process.env.MONGODB_URI2 && !process.env.MONGO_URI) {
        missing.unshift('MONGODB_URI2 or MONGO_URI');
    }

    if (missing.length > 0) {
        /* eslint-disable no-console */
        console.error(
            `Missing required environment variables: ${missing.join(', ')}`,
        );
        console.error('Check your .env file against .env.example');
        /* eslint-enable no-console */
        process.exit(1);
    }
};
