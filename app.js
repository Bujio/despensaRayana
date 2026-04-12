import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRoutes } from './src/routes/auth.routes.js';
import { usersRoutes } from './src/routes/users.routes.js';
const app = express();

//Middlewares
app.use(helmet()); //seguridad de cabeceras
app.use(cors()); //manejo de origenes cruzados
app.use(express.json()); //parseo del body
app.use(morgan('dev')); //logging, para registrar la petición ya procesada

//Routes
authRoutes(app);
usersRoutes(app);

export { app };
