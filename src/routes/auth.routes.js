import { authController } from '../controllers/auth.controllers.js';

const { register, login } = authController();

export const authRoutes = (app) => {
    app.post('/auth/register', register);
    app.post('/auth/login', login);
};
