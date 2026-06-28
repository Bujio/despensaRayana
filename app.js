import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { router } from './src/routes/index.js';
import { swaggerSpec } from './src/docs/swagger.js';

const app = express();

// helmet añade cabeceras HTTP de seguridad (X-Frame-Options, CSP, etc.)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const defaultCorsOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

const allowedCorsOrigins = [
    ...defaultCorsOrigins,
    ...(process.env.CORS_ORIGIN || '').split(','),
]
    .map((origin) => origin.trim())
    .filter(Boolean);

// cors permite peticiones desde los orígenes configurados para el frontend.
app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedCorsOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    }),
);
// Parsea el body de las peticiones JSON y lo deja disponible en req.body
app.use(express.json());
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
app.use('/api', router);

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
