import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../db/models/user.model.js';

export const registerService = async ({ name, password, email, phone }) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
        name,
        password: hashedPassword,
        email,
        phone,
    });
    return newUser;
};

export const loginService = async ({ email, password }) => {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Invalid credentials');
    const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' },
    );

    return { token, user };
};
