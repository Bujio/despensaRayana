import {
    registerService,
    loginService,
    refreshTokenService,
    logoutService,
    verifyEmailService,
    resendVerificationService,
    requestPasswordResetService,
    resetPasswordService,
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

    const requestPasswordReset = async (req, res, next) => {
        try {
            const resetToken = await requestPasswordResetService(
                req.body.email,
            );
            const response = {
                message:
                    'If the email is registered, a password reset link has been sent',
            };
            if (process.env.NODE_ENV === 'test' && resetToken) {
                response.resetToken = resetToken;
            }
            return res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };

    const resetPassword = async (req, res, next) => {
        try {
            await resetPasswordService(req.body.token, req.body.password);
            return res
                .status(200)
                .json({ message: 'Password reset successful' });
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
        requestPasswordReset,
        resetPassword,
    };
};
