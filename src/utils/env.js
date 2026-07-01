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
    'NODE_ENV',
    'PORT',
    'JWT_SECRET',
    'APP_BASE_URL',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
    'EMAIL_FROM',
];

const VALID_NODE_ENVS = new Set(['development', 'test', 'production']);

export const validateEnv = () => {
    const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

    if (
        !process.env.MONGODB_URI2 &&
        !process.env.MONGO_URI &&
        !process.env.MONGODB_URI
    ) {
        missing.unshift('MONGODB_URI2, MONGO_URI or MONGODB_URI');
    }

    if (
        process.env.NODE_ENV === 'production' &&
        !process.env.CORS_ORIGIN &&
        !process.env.CLIENT_URL
    ) {
        missing.push('CORS_ORIGIN or CLIENT_URL');
    }

    const errors = [];
    if (process.env.NODE_ENV && !VALID_NODE_ENVS.has(process.env.NODE_ENV)) {
        errors.push('NODE_ENV must be development, test or production');
    }

    const port = Number(process.env.PORT);
    if (
        process.env.PORT &&
        (!Number.isInteger(port) || port < 1 || port > 65535)
    ) {
        errors.push('PORT must be a valid TCP port');
    }

    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters long');
    }

    if (
        process.env.EMAIL_PORT &&
        !Number.isInteger(Number(process.env.EMAIL_PORT))
    ) {
        errors.push('EMAIL_PORT must be numeric');
    }

    if (missing.length > 0 || errors.length > 0) {
        /* eslint-disable no-console */
        if (missing.length > 0) {
            console.error(
                `Missing required environment variables: ${missing.join(', ')}`,
            );
        }
        for (const error of errors) console.error(error);
        console.error('Check your .env file against .env.example');
        /* eslint-enable no-console */
        process.exit(1);
    }
};
