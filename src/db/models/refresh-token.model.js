import mongoose, { Schema } from 'mongoose';

/**
 * Refresh tokens persistidos en BD.
 *
 * El valor plano se envía al cliente y nunca se guarda: almacenamos solo su
 * hash SHA-256 (`tokenHash`). Al hacer /auth/refresh, el servicio hashea el
 * token recibido y busca por ese hash. Esto nos permite:
 *   - Revocar tokens individualmente (logout) y tokens por usuario (logout-all).
 *   - Detectar reuse attacks: si un token marcado como `revokedAt` se usa de
 *     nuevo, sabemos que fue filtrado.
 *
 * El índice TTL sobre `expiresAt` permite a MongoDB borrar automáticamente
 * los tokens caducados sin necesidad de un cron propio.
 */
const RefreshTokenSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        revokedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

// TTL index: MongoDB elimina el documento cuando `expiresAt` es pasado.
// expireAfterSeconds: 0 significa "justo cuando la fecha llegue".
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', RefreshTokenSchema);
