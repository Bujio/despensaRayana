import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { router } from './src/routes/index.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api', router);

app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

app.use((err, _req, res, _next) => {
    const status = err.status ?? 500;
    res.status(status).json({
        message: err.message ?? 'Internal server error',
    });
});

export { app };
