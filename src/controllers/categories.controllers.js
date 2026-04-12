import {
    listCategoriesService,
    getCategoryService,
    createCategoryService,
    updateCategoryService,
    deleteCategoryService,
} from '../services/categories.js';

export const categoriesController = () => {
    const listCategories = async (req, res, next) => {
        try {
            const categories = await listCategoriesService();
            return res.status(200).json(categories);
        } catch (error) {
            next(error);
        }
    };

    const getCategory = async (req, res, next) => {
        try {
            const category = await getCategoryService(req.params.id);
            if (!category)
                return res.status(404).json({ message: 'Category not found' });
            return res.status(200).json(category);
        } catch (error) {
            next(error);
        }
    };

    const createCategory = async (req, res, next) => {
        try {
            const category = await createCategoryService(req.body);
            return res.status(201).json(category);
        } catch (error) {
            next(error);
        }
    };

    const updateCategory = async (req, res, next) => {
        try {
            const category = await updateCategoryService(
                req.params.id,
                req.body,
            );
            if (!category)
                return res.status(404).json({ message: 'Category not found' });
            return res.status(200).json(category);
        } catch (error) {
            next(error);
        }
    };

    const deleteCategory = async (req, res, next) => {
        try {
            const category = await deleteCategoryService(req.params.id);
            if (!category)
                return res.status(404).json({ message: 'Category not found' });
            return res
                .status(200)
                .json({ message: 'Category deleted successfully' });
        } catch (error) {
            next(error);
        }
    };

    return {
        listCategories,
        getCategory,
        createCategory,
        updateCategory,
        deleteCategory,
    };
};
