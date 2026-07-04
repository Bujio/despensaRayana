import mongoose, { Schema } from 'mongoose';
import { softDeletePlugin } from '../plugins/soft-delete.js';

const ImagesSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
    },
    name: {
        type: String,
    },
});

export const PRODUCT_STATUSES = [
    'draft',
    'pending_review',
    'published',
    'inactive',
    'rejected',
];

const OfferSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['none', 'percent', 'amount', 'bundle'],
            default: 'none',
        },
        value: {
            type: Number,
            min: 0,
            default: 0,
        },
        bundleQuantity: {
            type: Number,
            min: 0,
            default: 0,
        },
        bundlePayQuantity: {
            type: Number,
            min: 0,
            default: 0,
        },
        label: {
            type: String,
            trim: true,
        },
        validFrom: {
            type: Date,
        },
        validUntil: {
            type: Date,
        },
        active: {
            type: Boolean,
            default: false,
        },
    },
    { _id: false },
);

const ProductSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'The product must have a name'],
        },
        sku: {
            type: String,
            required: [true, 'You must indicate the SKU or product number'],
            unique: true,
        },
        price: {
            type: Number,
            required: [true, 'You must indicate the price of the product'],
        },
        description: {
            type: String,
        },
        shortDescription: {
            type: String,
            trim: true,
        },
        // Unidades disponibles en almacén. Se descuenta al crear un pedido
        // y se repone al eliminarlo.
        stock: {
            type: Number,
            required: [true, 'You must indicate the stock of the product'],
            min: [0, 'Stock cannot be negative'],
            default: 0,
        },
        status: {
            type: String,
            enum: PRODUCT_STATUSES,
            default: 'published',
            index: true,
        },
        rejectionReason: {
            type: String,
            trim: true,
        },
        reviewedAt: {
            type: Date,
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        offer: {
            type: OfferSchema,
            default: () => ({ type: 'none', active: false }),
        },
        // Referencia a la categoría del producto. Opcional para no romper
        // productos existentes. Se puebla con .populate() en las consultas.
        category: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
        },
        supplierRef: {
            type: Schema.Types.ObjectId,
            ref: 'Supplier',
            index: true,
        },
        supplier: {
            id: {
                type: Number,
                required: true,
            },
            supplierCode: String,
            status: {
                type: String,
                enum: [
                    'pending_review',
                    'active',
                    'inactive',
                    'draft',
                    'rejected',
                ],
                default: 'active',
            },
            name: String,
            images: [ImagesSchema],
        },
        images: [ImagesSchema],
    },
    {
        timestamps: true,
    },
);

// Índice sobre category para acelerar el filtrado del catálogo por categoría.
ProductSchema.index({ category: 1 });
ProductSchema.index({ status: 1, 'supplier.status': 1 });
// Índice de texto para búsqueda full-text sobre nombre y descripciones.
ProductSchema.index({
    name: 'text',
    shortDescription: 'text',
    description: 'text',
});

ProductSchema.plugin(softDeletePlugin);

export const Product = mongoose.model('Product', ProductSchema);
