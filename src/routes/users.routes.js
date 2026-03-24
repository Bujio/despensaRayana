import { usersController } from '../controllers/users.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
export const usersRoutes = (app) => {
    //------------//
    // ROUTES GET//
    //------------//

    app.get('/user/:id', authMiddleware, usersController().getUser);

    //------------//
    // ROUTES POST//
    //------------//
};
