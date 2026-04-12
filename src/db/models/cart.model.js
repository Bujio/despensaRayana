import mongoose, { Schema } from 'mongoose';

/**
 * Cada línea del carrito: un producto identificado por SKU,
 * la cantidad deseada y el precio en el momento de añadirlo.
 * El precio se guarda aquí para no depender del precio actual del producto
 * si cambia antes de que el usuario finalice el pedido.
 */
const CartItemSchema = new Schema(
    {
        sku: {
            type: String,
            required: [true, 'SKU is required'],
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Quantity must be at least 1'],
            default: 1,
        },
        price: {
            type: Number,
            required: true,
        },
    },
    { _id: false }, // no necesitamos _id por cada línea del carrito
);

/**
 * Carrito de compra de un usuario.
 * Cada usuario tiene un único carrito (gestionado con upsert en el service).
 * Se actualiza con timestamps para saber cuándo fue modificado por última vez.
 */
const CartSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            unique: true, // garantiza un único carrito por usuario a nivel de BD
        },
        items: [CartItemSchema],
    },
    { timestamps: true },
);

export const Cart = mongoose.model('Cart', CartSchema);
