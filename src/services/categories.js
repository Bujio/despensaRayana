import { Category } from '../db/models/category.model.js';

/**
 * Devuelve todas las categorías.
 * @returns {Promise<Category[]>}
 */
export const listCategoriesService = async () => {
    return await Category.find().sort({ name: 1 });
};

/**
 * Obtiene una categoría por su ID.
 * @param {string} id
 * @returns {Promise<Category|null>}
 */
export const getCategoryService = async (id) => {
    return await Category.findById(id);
};

/**
 * Crea una nueva categoría. El slug se genera automáticamente en el modelo.
 * @param {object} data
 * @returns {Promise<Category>}
 */
export const createCategoryService = async (data) => {
    return await Category.create(data);
};

/**
 * Actualiza una categoría. Si se cambia el nombre, el slug se regenera
 * automáticamente gracias al pre-save hook del modelo.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<Category|null>}
 */
export const updateCategoryService = async (id, data) => {
    // Usamos findById + save en lugar de findByIdAndUpdate para que se
    // ejecute el pre-save hook que regenera el slug
    const category = await Category.findById(id);
    if (!category) return null;

    Object.assign(category, data);
    return await category.save();
};

/**
 * Elimina una categoría por su ID.
 * @param {string} id
 * @returns {Promise<Category|null>}
 */
export const deleteCategoryService = async (id) => {
    return await Category.findByIdAndDelete(id);
};
