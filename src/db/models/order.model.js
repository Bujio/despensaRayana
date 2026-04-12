import mongoose, { Schema } from 'mongoose';

const ProductsOrderSchema = new Schema({
    sku: {
        type: String,
        required: [true, 'You must have indicate the SKU or number of order'],
    },
    count: {
        type: Number,
    },
    price: {
        type: Number,
        required: [true, 'You must have indicate the price of product'],
    },
    discount: {
        type: Number,
    },
    tax: {
        type: String,
    },
    total: {
        type: Number,
    },
});

// Estados posibles de un pedido y las transiciones permitidas entre ellos:
//
//   pending → processing → shipped → delivered
//       └──────────────────────────→ cancelled
//
// Un pedido cancelado o entregado es un estado final: no puede cambiar.
const ORDER_STATUSES = [
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
];

export const VALID_TRANSITIONS = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
};

const OrderSchema = new Schema(
    {
        // Estado actual del pedido. Por defecto 'pending' al crearse.
        status: {
            type: String,
            enum: ORDER_STATUSES,
            default: 'pending',
        },
        date: {
            type: Date,
        },
        email: {
            type: String,
            required: [true, 'Debe indicar un email válido'],
            lowercase: true,
            trim: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Debe indicar un email válido',
            ],
        },
        products: [ProductsOrderSchema],
        discount: {
            type: Number,
        },
        total: {
            type: Number,
        },
    },
    { timestamps: true },
);

export const Order = mongoose.model('Order', OrderSchema);
