import { User } from '../db/models/user.model.js';

export const getUserService = async (id) => {
    try {
        const user = await User.findById(id);
        return user;
    } catch (error) {
        throw new Error(`Error finding user: ${error.message}`);
    }
};
