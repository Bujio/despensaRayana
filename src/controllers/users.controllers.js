import { createUserService, getUserService } from '../services/users.js';

export const usersController = () => {
    const createUser = async (req, res, next) => {
        try {
            const user = await createUserService(req.body);
            return res.status(201).json(user);
        } catch (error) {
            next(error);
        }
    };

    const getUser = async (req, res, next) => {
        try {
            const { id } = req.params;
            const user = await getUserService(id);
            return res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    };

    return { createUser, getUser };
};
