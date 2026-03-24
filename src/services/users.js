import { User } from '../db/models/user.model.js';

export const createUserService = async ({ name, password, email, phone }) => {
    try {
        const newUser = await User.create({ name, password, email, phone });
        return newUser;
    } catch (error) {
        throw new Error(`Error creating user: ${error.message}`);
    }
};

export const getUserService = async (id) => {
    try {
        const user = await User.findById(id);
        return user;
    } catch (error) {
        throw new Error(`Error finding user: ${error.message}`);
    }
};
