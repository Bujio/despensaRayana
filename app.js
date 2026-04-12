import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { router } from './src/routes/index.js';

const app = express();

// helmet añade cabeceras HTTP de seguridad (X-Frame-Options, CSP, etc.)
app.use(helmet());
// cors permite peticiones desde otros dominios (necesario para el frontend)
app.use(cors());
// Parsea el body de las peticiones JSON y lo deja disponible en req.body
app.use(express.json());
// morgan registra cada petición en consola (método, ruta, status, tiempo)
app.use(morgan('dev'));

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
    res.status(status).json({
        message: err.message ?? 'Internal server error',
    });
});

export { app };
