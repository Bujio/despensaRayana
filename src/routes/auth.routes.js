import { authController } from '../controllers/auth.controllers.js';

export const authRoutes = (app) => {
    app.post('/auth/register', authController().register);
    app.post('/auth/login', authController().login);
};
