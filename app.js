import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { router } from './src/routes/index.js';
import { apiLimiter } from './src/middlewares/ratelimit.middleware.js';
import { swaggerSpec } from './src/docs/swagger.js';

const app = express();

app.disable('x-powered-by');

// helmet añade cabeceras HTTP de seguridad (X-Frame-Options, CSP, etc.)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const isProduction = process.env.NODE_ENV === 'production';
const defaultCorsOrigins = isProduction
    ? []
    : [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:5174',
          'http://127.0.0.1:5174',
      ];

const allowedCorsOrigins = [
    ...defaultCorsOrigins,
    ...(process.env.CORS_ORIGIN || process.env.CLIENT_URL || '').split(','),
]
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

// cors permite peticiones desde los orígenes configurados para el frontend.
app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedCorsOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            const error = new Error('Not allowed by CORS');
            error.status = 403;
            callback(error);
        },
        credentials: process.env.CORS_CREDENTIALS === 'true',
    }),
);
// Parsea el body de las peticiones con límites explícitos para reducir abuso.
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '100kb' }));
app.use(
    express.urlencoded({
        extended: false,
        limit: process.env.URLENCODED_BODY_LIMIT || '50kb',
    }),
);
// Sirve las imágenes guardadas localmente cuando Cloudinary no está configurado.
app.use('/uploads', express.static('uploads'));
// morgan registra cada petición en consola.
// 'dev' en desarrollo (colorido y conciso); 'combined' en producción (Apache format, más detallado).
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Documentación interactiva de la API en /api/docs.
// El JSON crudo de la especificación está disponible en /api/docs.json
// para clientes automáticos (Postman, generadores de SDK, etc.).
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'Despensa Rayana API docs',
    }),
);

// Todas las rutas de la API están bajo el prefijo /api
app.use('/api', apiLimiter, router);

// Captura cualquier ruta que no haya sido definida
app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Manejador global de errores.
// Express lo identifica como error handler por tener 4 parámetros (err, req, res, next).
// Cualquier error pasado a next(error) en los controllers llega aquí.
app.use((err, _req, res, _next) => {
    const status = err.status ?? 500;
    // Para errores operacionales (status definido) devolvemos el mensaje.
    // Para errores inesperados (500) ocultamos el mensaje interno para no
    // exponer detalles de implementación al cliente.
    const message = status < 500 ? err.message : 'Internal server error';
    res.status(status).json({ message });
});

export { app };
