import { User } from '../db/models/user.model.js';

export const getUserService = async (id) => {
    const user = await User.findById(id);
    return user;
};

export const listUsersService = async () => {
    return await User.find();
};
