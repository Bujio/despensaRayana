import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { usersRouter } from './users.routes.js';

export const router = Router();

router.use('/auth', authRouter);
router.use('/users', usersRouter);
