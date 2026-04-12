import { usersController } from '../controllers/users.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';

const { getUser, listUsers } = usersController();

export const usersRoutes = (app) => {
    app.get('/user/:id', authMiddleware, getUser);
    app.get('/users', authMiddleware, roleMiddleware('admin'), listUsers);
};
