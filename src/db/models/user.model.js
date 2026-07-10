import mongoose, { Schema } from 'mongoose';
import { softDeletePlugin } from '../plugins/soft-delete.js';

const userSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
        },
        address: {
            country: {
                type: String,
            },
            street: {
                type: String,
            },
            codePostal: {
                type: String,
            },
            city: {
                type: String,
            },
        },
        role: {
            type: String,
            enum: ['user', 'admin', 'supplier'],
            default: 'user',
        },
        // Verificación de email: hasta que el usuario confirme el enlace
        // recibido, emailVerified es false y algunas acciones pueden restringirse.
        emailVerified: { type: Boolean, default: false },
        // Hash del token de verificación (no guardamos el token plano).
        // Comparamos con el hash en memoria al validar el enlace recibido.
        emailVerificationTokenHash: { type: String, default: null },
        emailVerificationExpiresAt: { type: Date, default: null },
        passwordResetTokenHash: { type: String, default: null },
        passwordResetExpiresAt: { type: Date, default: null },
    },
    { timestamps: true },
);

userSchema.plugin(softDeletePlugin);

export const User = mongoose.model('User', userSchema);
