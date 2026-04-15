import {
    registerService,
    loginService,
    refreshTokenService,
    logoutService,
    verifyEmailService,
    resendVerificationService,
} from '../services/auth.js';

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
            const { accessToken, refreshToken, user } = await loginService(
                req.body,
            );
            return res.status(200).json({ accessToken, refreshToken, user });
        } catch (error) {
            next(error);
        }
    };

    const refresh = async (req, res, next) => {
        try {
            const { accessToken, refreshToken } = await refreshTokenService(
                req.body.refreshToken,
            );
            return res.status(200).json({ accessToken, refreshToken });
        } catch (error) {
            next(error);
        }
    };

    const logout = async (req, res, next) => {
        try {
            await logoutService(req.body.refreshToken);
            return res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    const verifyEmail = async (req, res, next) => {
        try {
            await verifyEmailService(req.params.token);
            return res.status(200).json({ message: 'Email verified' });
        } catch (error) {
            next(error);
        }
    };

    const resendVerification = async (req, res, next) => {
        try {
            await resendVerificationService(req.body.email);
            // Respuesta genérica: no filtramos si el email existía o no.
            return res.status(200).json({
                message:
                    'If the email is registered, a verification link has been sent',
            });
        } catch (error) {
            next(error);
        }
    };

    return {
        register,
        login,
        refresh,
        logout,
        verifyEmail,
        resendVerification,
    };
};
