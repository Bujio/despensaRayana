import bcrypt from 'bcryptjs';
import { User } from '../db/models/user.model.js';

export const getUserService = async (id) => {
    return await User.findById(id).select('-password');
};

export const listUsersService = async () => {
    return await User.find().select('-password');
};

export const updateUserService = async (id, data) => {
    if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
    }
    return await User.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    }).select('-password');
};

export const deleteUserService = async (id) => {
    return await User.findByIdAndDelete(id);
};
