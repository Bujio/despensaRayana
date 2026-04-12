import { Product } from '../db/models/product.model.js';

export const getProductService = async (id) => {
    return await Product.findById(id);
};

export const listProductsService = async () => {
    return await Product.find();
};

export const createProductService = async (data) => {
    return await Product.create(data);
};

export const updateProductService = async (id, data) => {
    return await Product.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    });
};

export const deleteProductService = async (id) => {
    return await Product.findByIdAndDelete(id);
};
