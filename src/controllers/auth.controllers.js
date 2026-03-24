import { registerService, loginService } from '../services/auth.js';

export const authController = () => {
    const register = async (req, res, next) => {
        try {
            const user = await registerService(req.body);
            return res.status(201).json(user);
        } catch (error) {
            next(error);
        }
    };

    const login = async (req, res, next) => {
        try {
            const { token, user } = await loginService(req.body);
            return res.status(200).json({ token, user });
        } catch (error) {
            next(error);
        }
    };

    return { register, login };
};
