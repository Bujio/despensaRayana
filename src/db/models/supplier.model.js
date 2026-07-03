import mongoose, { Schema } from 'mongoose';
import { softDeletePlugin } from '../plugins/soft-delete.js';

export const SUPPLIER_STATUSES = [
    'pending_review',
    'active',
    'inactive',
    'draft',
    'rejected',
];

const imageSchema = new Schema(
    {
        url: String,
        name: String,
        alt: String,
        isMain: Boolean,
    },
    { _id: false },
);

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
        slug: {
            type: String,
            trim: true,
            lowercase: true,
            index: true,
        },
        shortDescription: {
            type: String,
            trim: true,
        },
        story: {
            type: String,
            trim: true,
        },
        specialties: [
            {
                type: String,
                trim: true,
            },
        ],
        origin: {
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
        location: {
            country: String,
            region: String,
            province: String,
            comarca: String,
            town: String,
            postalCode: String,
            address: String,
            coordinates: {
                lat: Number,
                lng: Number,
            },
        },
        contact: {
            contactPerson: String,
            email: String,
            phone: String,
            website: String,
            instagram: String,
            facebook: String,
        },
        business: {
            taxName: String,
            taxId: String,
            invoiceEmail: String,
        },
        logo: imageSchema,
        mainImage: imageSchema,
        gallery: [imageSchema],
        certifications: {
            artisan: { type: Boolean, default: false },
            ecological: { type: Boolean, default: false },
            dop: { type: Boolean, default: false },
            igp: { type: Boolean, default: false },
            localProduct: { type: Boolean, default: false },
            familyProduction: { type: Boolean, default: false },
            noIntermediaries: { type: Boolean, default: false },
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
