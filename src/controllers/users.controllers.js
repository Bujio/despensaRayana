import { getUserService, listUsersService } from '../services/users.js';

export const usersController = () => {
    const getUser = async (req, res, next) => {
        try {
            const { id } = req.params;
            const user = await getUserService(id);
            return res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    };

    const listUsers = async (req, res, next) => {
        try {
            const users = await listUsersService();
            return res.status(200).json(users);
        } catch (error) {
            next(error);
        }
    };

    return { getUser, listUsers };
};
