import mongoose, { Schema } from 'mongoose';

const ProductsOrderSchema = new Schema({
    sku: {
        type: String,
        required: [true, 'You must have indicate the SKU or number of order'],
    },
    count: {
        type: Number,
        default: 1,
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

const ShippingAddressSchema = new Schema(
    {
        street: { type: String, trim: true },
        codePostal: { type: String, trim: true },
        city: { type: String, trim: true },
        country: { type: String, trim: true },
        phone: { type: String, trim: true },
    },
    { _id: false },
);

const CancellationSchema = new Schema(
    {
        cancelledAt: { type: Date },
        cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, trim: true },
        source: {
            type: String,
            enum: ['client', 'admin', 'system'],
            default: 'client',
        },
        amount: { type: Number, default: 0 },
    },
    { _id: false },
);

const RefundSchema = new Schema(
    {
        amount: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'not_required'],
            default: 'pending',
        },
        processedAt: { type: Date },
    },
    { _id: false },
);

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
        // Usuario propietario del pedido. Los pedidos antiguos pueden no tenerlo,
        // por eso los controllers mantienen fallback por email.
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
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
        shippingAddress: ShippingAddressSchema,
        products: [ProductsOrderSchema],
        discount: {
            type: Number,
        },
        total: {
            type: Number,
        },
        cancellation: CancellationSchema,
        refund: RefundSchema,
    },
    { timestamps: true },
);

// Índice sobre email: las consultas por email (listOrdersByEmail) son frecuentes
// y sin índice harían un COLLSCAN al crecer la colección.
OrderSchema.index({ email: 1 });

export const Order = mongoose.model('Order', OrderSchema);
