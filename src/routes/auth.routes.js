import { Router } from 'express';
import { authController } from '../controllers/auth.controllers.js';
import { validate } from '../middlewares/validate.middleware.js';
import { registerSchema, loginSchema } from '../schemas/user.schema.js';

const { register, login } = authController();

export const authRouter = Router();

// validate(schema) intercepta el body antes de llegar al controller.
// Si no cumple el schema, devuelve 400 sin ejecutar el controller.
authRouter.post('/register', validate(registerSchema), register);
authRouter.post('/login', validate(loginSchema), login);
