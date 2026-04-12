import { Product } from '../db/models/product.model.js';

/**
 * Obtiene un producto por su ID.
 *
 * @param {string} id - ID de MongoDB del producto
 * @returns {Promise<Product|null>} El producto encontrado o null si no existe
 */
export const getProductService = async (id) => {
    return await Product.findById(id);
};

/**
 * Devuelve todos los productos del catálogo.
 *
 * @returns {Promise<Product[]>} Lista de productos
 */
export const listProductsService = async () => {
    return await Product.find();
};

/**
 * Crea un nuevo producto.
 * El SKU llega ya en mayúsculas gracias al transform() del schema de Zod.
 *
 * @param {object} data - Datos del producto validados por el schema de Zod
 * @returns {Promise<Product>} El producto creado
 */
export const createProductService = async (data) => {
    return await Product.create(data);
};

/**
 * Actualiza un producto existente.
 *
 * @param {string} id - ID de MongoDB del producto
 * @param {object} data - Campos a actualizar (parcial)
 * @returns {Promise<Product|null>} El producto actualizado o null si no existe
 */
export const updateProductService = async (id, data) => {
    return await Product.findByIdAndUpdate(id, data, {
        new: true, // devuelve el documento actualizado
        runValidators: true, // aplica las validaciones del schema de Mongoose
    });
};

/**
 * Elimina un producto por su ID.
 *
 * @param {string} id - ID de MongoDB del producto
 * @returns {Promise<Product|null>} El producto eliminado o null si no existía
 */
export const deleteProductService = async (id) => {
    return await Product.findByIdAndDelete(id);
};
