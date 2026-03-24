import express from 'express';
import cors from 'cors';
import { usersRoutes } from './src/routes/users.routes.js';
const app = express();

//Middlewares
app.use(cors());
app.use(express.json());

//Routes
usersRoutes(app);

export { app };
