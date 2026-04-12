import mongoose from 'mongoose';

const ImagesSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
    },
    nombre: {
        type: String,
    },
});

const ProductSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'The product must have a name '],
        },
        sku: {
            type: String,
            required: [
                true,
                'You mush have indicate the SKU or product number ',
            ],
        },
        price: {
            type: Number,
            require: [true, 'You mush have indicate the price of product'],
        },
        description: {
            type: String,
        },
        supplier: {
            id: {
                type: Number,
                require: true,
            },
            name: String,
            images: [ImagesSchema],
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('Product', ProductSchema);
