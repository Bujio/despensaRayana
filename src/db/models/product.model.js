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
        // Unidades disponibles en almacén. Se descuenta al crear un pedido
        // y se repone al eliminarlo.
        stock: {
            type: Number,
            required: [true, 'You must indicate the stock of the product'],
            min: [0, 'Stock cannot be negative'],
            default: 0,
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
        supplier: {
            id: {
                type: Number,
                required: true,
            },
            name: String,
            images: [ImagesSchema],
        },
    },
    {
        timestamps: true,
    },
);

// Índice sobre category para acelerar el filtrado del catálogo por categoría.
ProductSchema.index({ category: 1 });
// Índice de texto para búsqueda full-text sobre nombre y descripción.
ProductSchema.index({ name: 'text', description: 'text' });

ProductSchema.plugin(softDeletePlugin);

export const Product = mongoose.model('Product', ProductSchema);
