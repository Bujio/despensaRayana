import express from 'express';
import cors from 'cors';
import { authRoutes } from './src/routes/auth.routes.js';
import { usersRoutes } from './src/routes/users.routes.js';
const app = express();

//Middlewares
app.use(cors());
app.use(express.json());

//Routes
authRoutes(app);
usersRoutes(app);

export { app };
