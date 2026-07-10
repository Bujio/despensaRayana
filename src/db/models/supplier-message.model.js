import mongoose, { Schema } from 'mongoose';

const SupplierMessageEntrySchema = new Schema(
    {
        sender: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        senderRole: {
            type: String,
            enum: ['user', 'supplier'],
            required: true,
        },
        body: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
    },
    { timestamps: true },
);

const SupplierMessageThreadSchema = new Schema(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
            index: true,
        },
        supplier: {
            type: Schema.Types.ObjectId,
            ref: 'Supplier',
            required: true,
            index: true,
        },
        customer: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        subject: {
            type: String,
            trim: true,
            maxlength: 140,
            default: '',
        },
        status: {
            type: String,
            enum: ['open', 'answered', 'closed'],
            default: 'open',
            index: true,
        },
        messages: {
            type: [SupplierMessageEntrySchema],
            default: [],
        },
        supplierReadAt: {
            type: Date,
        },
        customerReadAt: {
            type: Date,
        },
        lastMessageAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    { timestamps: true },
);

SupplierMessageThreadSchema.index({
    supplier: 1,
    customer: 1,
    product: 1,
    lastMessageAt: -1,
});

export const SupplierMessageThread = mongoose.model(
    'SupplierMessageThread',
    SupplierMessageThreadSchema,
);
