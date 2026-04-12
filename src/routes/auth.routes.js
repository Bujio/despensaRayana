import { Router } from 'express';
import { authController } from '../controllers/auth.controllers.js';

const { register, login } = authController();

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
