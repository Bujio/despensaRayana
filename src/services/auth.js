import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../db/models/user.model.js';
import { RefreshToken } from '../db/models/refresh-token.model.js';
import { HttpError } from '../utils/http-error.js';
import { generateRandomToken, hashToken } from '../utils/tokens.js';
import { sendEmailVerificationEmail } from './email.js';
import { logger } from '../utils/logger.js';

// Duración del access token: corta para que un token filtrado expire pronto.
// El cliente renueva silenciosamente con el refresh token.
const ACCESS_TOKEN_TTL = '15m';
// Duración del refresh token: mucho más larga, pero persistido en BD y
// revocable en logout o en detección de reuse.
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
// Ventana de validez del enlace de verificación de email.
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Firma un JWT de acceso con los datos del usuario.
 * Payload mínimo: id, role, email (sin datos sensibles).
 */
const signAccessToken = (user) =>
    jwt.sign(
        { id: user._id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL },
    );

/**
 * Genera un refresh token, lo persiste en BD (solo el hash) y devuelve el
 * valor plano para enviarlo al cliente.
 */
const issueRefreshToken = async (userId) => {
    const plain = generateRandomToken();
    await RefreshToken.create({
        userId,
        tokenHash: hashToken(plain),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
    return plain;
};

/**
 * Crea el token de verificación de email, lo hashea en el usuario y
 * envía el email con el enlace. El envío es best-effort: un fallo no
 * rompe el registro, pero se registra en el logger.
 */
const issueEmailVerification = async (user) => {
    const plain = generateRandomToken(32);
    user.emailVerificationTokenHash = hashToken(plain);
    user.emailVerificationExpiresAt = new Date(
        Date.now() + EMAIL_VERIFICATION_TTL_MS,
    );
    await user.save();
    sendEmailVerificationEmail(user, plain).catch((err) =>
        logger.error('Failed to send verification email:', err.message),
    );
};

/**
 * Registra un nuevo usuario en la base de datos.
 * La contraseña se hashea antes de guardarla; nunca se almacena en texto plano.
 *
 * Dispara el envío del email de verificación de cuenta.
 */
export const registerService = async ({
    name,
    password,
    email,
    phone,
    address,
}) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    let newUser;
    try {
        newUser = await User.create({
            name,
            password: hashedPassword,
            email,
            phone,
            address,
        });
    } catch (err) {
        if (err.code === 11000) {
            throw new HttpError('Email already in use', 409);
        }
        throw err;
    }

    await issueEmailVerification(newUser);

    const {
        password: _pw,
        emailVerificationTokenHash: _tk,
        ...safeUser
    } = newUser.toObject();
    return safeUser;
};

/**
 * Autentica a un usuario y emite un par access + refresh token.
 *
 * @returns {Promise<{ accessToken, refreshToken, user }>}
 */
export const loginService = async ({ email, password }) => {
    const user = await User.findOne({ email });

    // Mismo mensaje para "no existe" y "password inválido" → evita enumeración.
    const isMatch = user && (await bcrypt.compare(password, user.password));
    if (!isMatch) throw new HttpError('Invalid credentials', 401);

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user._id);

    const {
        password: _pw,
        emailVerificationTokenHash: _tk,
        ...safeUser
    } = user.toObject();
    return { accessToken, refreshToken, user: safeUser };
};

/**
 * Renueva el par access+refresh. Rota el refresh token: cada uso lo marca
 * como revocado y emite uno nuevo. Si un refresh token ya revocado se
 * presenta otra vez, lo tratamos como un reuse attack y revocamos todos
 * los tokens activos del usuario.
 */
export const refreshTokenService = async (plainRefresh) => {
    if (!plainRefresh) throw new HttpError('Refresh token required', 400);

    const tokenHash = hashToken(plainRefresh);
    const stored = await RefreshToken.findOne({ tokenHash });

    if (!stored || stored.expiresAt < new Date()) {
        throw new HttpError('Invalid or expired refresh token', 401);
    }

    if (stored.revokedAt) {
        // Reuse attack: alguien está usando un token revocado. Por seguridad
        // revocamos todos los refresh tokens activos del usuario y obligamos
        // a re-loguearse en todas sus sesiones.
        await RefreshToken.updateMany(
            { userId: stored.userId, revokedAt: null },
            { $set: { revokedAt: new Date() } },
        );
        logger.warn(
            `Reuse attack detected for refresh token of user ${stored.userId}`,
        );
        throw new HttpError('Refresh token already used', 401);
    }

    const user = await User.findById(stored.userId);
    if (!user) throw new HttpError('User no longer exists', 401);

    // Rotación: marcamos el antiguo como revocado y emitimos uno nuevo.
    stored.revokedAt = new Date();
    await stored.save();

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user._id);

    return { accessToken, refreshToken };
};

/**
 * Revoca el refresh token recibido para cerrar sesión en ese dispositivo.
 * Es idempotente: si el token no existe o ya está revocado, devuelve OK
 * para no filtrar información.
 */
export const logoutService = async (plainRefresh) => {
    if (!plainRefresh) return;
    const tokenHash = hashToken(plainRefresh);
    await RefreshToken.updateOne(
        { tokenHash, revokedAt: null },
        { $set: { revokedAt: new Date() } },
    );
};

/**
 * Verifica el email de un usuario a partir del token del enlace.
 * Limpia los campos del token tras verificar para invalidar enlaces posteriores.
 */
export const verifyEmailService = async (plainToken) => {
    if (!plainToken) throw new HttpError('Verification token required', 400);

    const tokenHash = hashToken(plainToken);
    const user = await User.findOne({
        emailVerificationTokenHash: tokenHash,
    });

    if (!user || !user.emailVerificationExpiresAt) {
        throw new HttpError('Invalid verification token', 400);
    }

    if (user.emailVerificationExpiresAt < new Date()) {
        throw new HttpError('Verification token has expired', 400);
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();
};

/**
 * Re-emite el email de verificación. Útil si el usuario no lo recibió o
 * el token caducó. Rate-limitado a nivel de ruta.
 */
export const resendVerificationService = async (email) => {
    const user = await User.findOne({ email });
    // No filtramos si el email existe o no: devolvemos OK en cualquier caso.
    if (!user || user.emailVerified) return;
    await issueEmailVerification(user);
};
