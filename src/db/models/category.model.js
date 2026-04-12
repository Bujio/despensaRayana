import mongoose, { Schema } from 'mongoose';

const CategorySchema = new Schema(
    {
        name: {
            type: String,
            required: [true, 'Category name is required'],
            unique: true,
            trim: true,
        },
        description: {
            type: String,
        },
        // Slug URL-friendly auto-generado desde el nombre.
        // Permite rutas limpias como /productos?category=frutas-y-verduras
        slug: {
            type: String,
            unique: true,
        },
    },
    { timestamps: true },
);

/**
 * Genera el slug antes de guardar convirtiendo el nombre a minúsculas,
 * reemplazando espacios por guiones y eliminando caracteres especiales.
 * Solo se regenera si el campo name ha sido modificado.
 */
CategorySchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = this.name
            .toLowerCase()
            .normalize('NFD') // descompone acentos (á → a + ́)
            .replace(/[\u0300-\u036f]/g, '') // elimina los diacríticos
            .replace(/[^a-z0-9\s-]/g, '') // elimina caracteres especiales
            .trim()
            .replace(/\s+/g, '-'); // espacios → guiones
    }
    next();
});

export const Category = mongoose.model('Category', CategorySchema);
