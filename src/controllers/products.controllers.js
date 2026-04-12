import {
    getProductService,
    listProductsService,
    createProductService,
    updateProductService,
    deleteProductService,
} from '../services/products.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';

export const productsController = () => {
    const getProduct = async (req, res, next) => {
        try {
            const product = await getProductService(req.params.id);
            if (!product)
                return res.status(404).json({ message: 'Product not found' });
            return res.status(200).json(product);
        } catch (error) {
            next(error);
        }
    };

    const listProducts = async (req, res, next) => {
        try {
            const pagination = getPagination(req.query);
            const { data, total } = await listProductsService(pagination);
            return res.status(200).json({
                data,
                pagination: buildPaginationMeta(
                    total,
                    pagination.page,
                    pagination.limit,
                ),
            });
        } catch (error) {
            next(error);
        }
    };

    const createProduct = async (req, res, next) => {
        try {
            const product = await createProductService(req.body);
            return res.status(201).json(product);
        } catch (error) {
            next(error);
        }
    };

    const updateProduct = async (req, res, next) => {
        try {
            const product = await updateProductService(req.params.id, req.body);
            if (!product)
                return res.status(404).json({ message: 'Product not found' });
            return res.status(200).json(product);
        } catch (error) {
            next(error);
        }
    };

    const deleteProduct = async (req, res, next) => {
        try {
            const product = await deleteProductService(req.params.id);
            if (!product)
                return res.status(404).json({ message: 'Product not found' });
            return res
                .status(200)
                .json({ message: 'Product deleted successfully' });
        } catch (error) {
            next(error);
        }
    };

    return {
        getProduct,
        listProducts,
        createProduct,
        updateProduct,
        deleteProduct,
    };
};
