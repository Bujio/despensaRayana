import { Product } from '../db/models/product.model.js';

/**
 * Obtiene un producto por su ID, poblando el nombre y slug de su categoría.
 *
 * @param {string} id - ID de MongoDB del producto
 * @returns {Promise<Product|null>} El producto encontrado o null si no existe
 */
export const getProductService = async (id) => {
    return await Product.findById(id).populate('category', 'name slug');
};

/**
 * Devuelve una página de productos del catálogo.
 * Soporta filtrado opcional por categoryId.
 *
 * @param {{ skip: number, limit: number }} pagination - Parámetros de paginación
 * @param {string} [categoryId] - ID de categoría para filtrar (opcional)
 * @returns {Promise<{ data: Product[], total: number }>}
 */
export const listProductsService = async ({ skip, limit }, categoryId) => {
    const filter = categoryId ? { category: categoryId } : {};
    // Ejecutamos ambas queries en paralelo para no hacer esperar una a la otra
    const [data, total] = await Promise.all([
        Product.find(filter)
            .populate('category', 'name slug')
            .skip(skip)
            .limit(limit),
        Product.countDocuments(filter),
    ]);
    return { data, total };
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

/**
 * Añade imágenes subidas a Cloudinary al array supplier.images del producto.
 * Cada archivo procesado por multer-storage-cloudinary incluye path (URL) y filename.
 *
 * @param {string} id - ID de MongoDB del producto
 * @param {Express.Multer.File[]} files - Archivos procesados por multer
 * @returns {Promise<Product|null>} El producto actualizado o null si no existe
 */
export const addProductImagesService = async (id, files) => {
    const newImages = files.map((file) => ({
        url: file.path, // URL pública de Cloudinary
        name: file.filename, // public_id en Cloudinary
    }));

    return await Product.findByIdAndUpdate(
        id,
        { $push: { 'supplier.images': { $each: newImages } } },
        { new: true },
    );
};
