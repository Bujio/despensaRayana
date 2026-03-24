import { usersController } from '../controllers/users.controllers.js';

export const usersRoutes = (app) => {
    //------------//
    // ROUTES GET//
    //------------//

    app.get('/user/:id', usersController().getUser);

    //------------//
    // ROUTES POST//
    //------------//
    app.post('/createUser', usersController().createUser);
};
