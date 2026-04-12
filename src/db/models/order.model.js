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

const OrderSchema = new Schema({
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
});

OrderSchema.pre('save', async function save(next) {});

module.exports = mongoose.model('Order', OrderSchema);
