import mongoose, { Schema } from 'mongoose';
import { softDeletePlugin } from '../plugins/soft-delete.js';

export const SUPPLIER_STATUSES = [
    'pending_review',
    'active',
    'inactive',
    'draft',
    'rejected',
];

const supplierSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
            index: true,
        },
        supplierCode: {
            type: String,
            required: true,
            unique: true,
            minlength: 6,
            maxlength: 6,
            uppercase: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        legalName: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        address: {
            country: String,
            street: String,
            codePostal: String,
            city: String,
        },
        description: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: SUPPLIER_STATUSES,
            default: 'pending_review',
            index: true,
        },
        featured: {
            type: Boolean,
            default: false,
            index: true,
        },
        internalNotes: {
            type: String,
            trim: true,
        },
        reviewedAt: Date,
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        rejectionReason: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true },
);

supplierSchema.plugin(softDeletePlugin);

export const Supplier = mongoose.model('Supplier', supplierSchema);
