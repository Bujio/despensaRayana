import mongoose from 'mongoose';
import {
    getProductService,
    listProductsService,
    createProductService,
    createSupplierProductService,
    listSupplierProductsService,
    addSupplierProductImagesService,
    updateSupplierProductService,
    updateProductService,
    deleteSupplierProductService,
    deleteProductService,
    addProductImagesService,
} from '../services/products.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { HttpError } from '../utils/http-error.js';

export const productsController = () => {
    const getProduct = async (req, res, next) => {
        try {
            const product = await getProductService(req.params.id, {
                includeAll: req.user?.role === 'admin',
            });
            if (!product) throw new HttpError('Product not found', 404);
            return res.status(200).json(product);
        } catch (error) {
            next(error);
        }
    };

    const listProducts = async (req, res, next) => {
        try {
            const pagination = getPagination(req.query);
            const {
                categoryId,
                search,
                inStock,
                minPrice,
                maxPrice,
                sort,
                order,
            } = req.query;

            if (categoryId && !mongoose.isValidObjectId(categoryId)) {
                throw new HttpError('Invalid categoryId format', 400);
            }

            // Parseamos los filtros numéricos desde strings de query y
            // validamos que sean números finitos antes de pasarlos al service.
            const parseNumber = (value, name) => {
                if (value == null || value === '') return undefined;
                const n = Number(value);
                if (!Number.isFinite(n)) {
                    throw new HttpError(`Invalid ${name} value`, 400);
                }
                return n;
            };

            const filters = {
                categoryId,
                // 'true' / '1' activan el filtro; cualquier otra cosa lo ignora.
                inStock: inStock === 'true' || inStock === '1',
                search: search?.trim() || undefined,
                minPrice: parseNumber(minPrice, 'minPrice'),
                maxPrice: parseNumber(maxPrice, 'maxPrice'),
                sort,
                order,
                includeAll: req.adminList === true,
            };

            const { data, total } = await listProductsService(
                pagination,
                filters,
            );
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

    const listSupplierProducts = async (req, res, next) => {
        try {
            const products = await listSupplierProductsService(req.user.id);
            return res.status(200).json({ data: products });
        } catch (error) {
            next(error);
        }
    };

    const createSupplierProduct = async (req, res, next) => {
        try {
            const product = await createSupplierProductService(
                req.user.id,
                req.body,
            );
            return res.status(201).json(product);
        } catch (error) {
            next(error);
        }
    };

    const updateSupplierProduct = async (req, res, next) => {
        try {
            const product = await updateSupplierProductService(
                req.user.id,
                req.params.id,
                req.body,
            );
            return res.status(200).json(product);
        } catch (error) {
            next(error);
        }
    };

    const uploadSupplierProductImages = async (req, res, next) => {
        try {
            if (!req.files?.length) {
                throw new HttpError('No images provided', 400);
            }
            const product = await addSupplierProductImagesService(
                req.user.id,
                req.params.id,
                req.files,
            );
            return res.status(200).json(product);
        } catch (error) {
            next(error);
        }
    };

    const updateProduct = async (req, res, next) => {
        try {
            const product = await updateProductService(req.params.id, req.body);
            if (!product) throw new HttpError('Product not found', 404);
            return res.status(200).json(product);
        } catch (error) {
            next(error);
        }
    };

    const deleteSupplierProduct = async (req, res, next) => {
        try {
            const product = await deleteSupplierProductService(
                req.user.id,
                req.params.id,
            );
            if (!product) throw new HttpError('Product not found', 404);
            return res
                .status(200)
                .json({ message: 'Product deleted successfully' });
        } catch (error) {
            next(error);
        }
    };

    const deleteProduct = async (req, res, next) => {
        try {
            const product = await deleteProductService(req.params.id);
            if (!product) throw new HttpError('Product not found', 404);
            return res
                .status(200)
                .json({ message: 'Product deleted successfully' });
        } catch (error) {
            next(error);
        }
    };

    const uploadImages = async (req, res, next) => {
        try {
            if (!req.files?.length) {
                throw new HttpError('No images provided', 400);
            }
            const product = await addProductImagesService(
                req.params.id,
                req.files,
            );
            if (!product) throw new HttpError('Product not found', 404);
            return res.status(200).json(product);
        } catch (error) {
            next(error);
        }
    };

    return {
        getProduct,
        listProducts,
        createProduct,
        createSupplierProduct,
        listSupplierProducts,
        updateSupplierProduct,
        deleteSupplierProduct,
        uploadSupplierProductImages,
        updateProduct,
        deleteProduct,
        uploadImages,
    };
};
