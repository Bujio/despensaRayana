import { usersController } from '../controllers/users.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
export const usersRoutes = (app) => {
    //------------//
    // ROUTES GET//
    //------------//

    app.get('/user/:id', authMiddleware, usersController().getUser);
    app.get(
        '/users/:id/role',
        authMiddleware,
        roleMiddleware('admin'),
        usersController().listUsers,
    );
    //------------//
    // ROUTES POST//
    //------------//
};
