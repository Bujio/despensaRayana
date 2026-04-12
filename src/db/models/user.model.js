import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
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
    },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
});

export const User = mongoose.model('user', userSchema);
