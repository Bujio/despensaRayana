import mongoose from 'mongoose';

const ImagesSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
    },
    name: {
        type: String,
    },
});

const ProductSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'The product must have a name'],
        },
        sku: {
            type: String,
            required: [true, 'You must indicate the SKU or product number'],
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

export const Product = mongoose.model('Product', ProductSchema);
