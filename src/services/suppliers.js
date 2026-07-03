import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { User } from '../db/models/user.model.js';
import { Product } from '../db/models/product.model.js';
import { Supplier } from '../db/models/supplier.model.js';
import {
    cloudinary,
    hasCloudinaryConfig,
} from '../middlewares/upload.middleware.js';
import { HttpError } from '../utils/http-error.js';

const SUPPLIER_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const stripUser = (user) => {
    if (!user) return null;
    const {
        password: _password,
        emailVerificationTokenHash: _token,
        ...safeUser
    } = user.toObject ? user.toObject() : user;
    return safeUser;
};

function generateSupplierCode(length = 6) {
    let code = '';

    for (let index = 0; index < length; index += 1) {
        code +=
            SUPPLIER_CODE_CHARS[
                crypto.randomInt(0, SUPPLIER_CODE_CHARS.length)
            ];
    }

    return code;
}

const slugify = (value = '') =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const getApiBaseUrl = () => {
    const configured = process.env.PUBLIC_API_URL || process.env.API_BASE_URL;
    if (configured) return configured.replace(/\/$/, '');

    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT || 3000;
    return `http://${host}:${port}`;
};

const mapLocalImage = (file) => ({
    url: file.path?.startsWith('http')
        ? file.path
        : `${getApiBaseUrl()}/uploads/products/${file.filename}`,
    name: file.originalname || file.filename || 'Imagen de proveedor',
    alt: file.originalname || 'Imagen de proveedor',
});

const uploadSupplierFileToCloudinary = async (file) => {
    const result = await cloudinary.uploader.upload(file.path, {
        folder: 'suppliers',
        resource_type: 'image',
        transformation: [
            {
                width: 1200,
                crop: 'limit',
                fetch_format: 'webp',
                quality: 'auto',
            },
        ],
    });

    await fs.unlink(file.path).catch(() => {});

    return {
        url: result.secure_url,
        name: file.originalname || result.public_id || 'Imagen de proveedor',
        alt: file.originalname || 'Imagen de proveedor',
    };
};

const mapSupplierUpload = async (file) => {
    if (!hasCloudinaryConfig) return mapLocalImage(file);

    try {
        return await uploadSupplierFileToCloudinary(file);
    } catch {
        return mapLocalImage(file);
    }
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createUniqueSupplierCode = async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const supplierCode = generateSupplierCode();
        const exists = await Supplier.exists({ supplierCode });
        if (!exists) return supplierCode;
    }
    throw new HttpError('Could not generate supplier code', 500);
};

export const registerSupplierService = async ({
    name,
    email,
    password,
    phone,
    address,
    ...supplierData
}) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const supplierCode = await createUniqueSupplierCode();
    const contactEmail = supplierData.contact?.email || email;
    const contactPhone = supplierData.contact?.phone || phone;

    let user;
    try {
        user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone: contactPhone,
            address,
            role: 'supplier',
        });
    } catch (err) {
        if (err.code === 11000)
            throw new HttpError('Email already in use', 409);
        throw err;
    }

    try {
        const supplier = await Supplier.create({
            ...supplierData,
            userId: user._id,
            supplierCode,
            name,
            slug: supplierData.slug || slugify(name),
            email,
            phone: contactPhone,
            address,
            contact: {
                ...(supplierData.contact || {}),
                email: contactEmail,
                phone: contactPhone,
            },
            status: 'pending_review',
        });
        return { user: stripUser(user), supplier };
    } catch (err) {
        await User.findByIdAndDelete(user._id).catch(() => {});
        throw err;
    }
};

export const listSuppliersService = async ({ status, search } = {}) => {
    const filter = {};
    if (status) filter.status = status;
    if (search) {
        const expression = new RegExp(escapeRegExp(search), 'i');
        filter.$or = [
            { name: expression },
            { legalName: expression },
            { email: expression },
            { supplierCode: expression },
        ];
    }

    const suppliers = await Supplier.find(filter)
        .sort({ createdAt: -1 })
        .populate('userId', 'name email role');
    const productCounts = await Product.aggregate([
        {
            $match: {
                deletedAt: null,
                supplierRef: { $in: suppliers.map((supplier) => supplier._id) },
            },
        },
        { $group: { _id: '$supplierRef', total: { $sum: 1 } } },
    ]);
    const countsBySupplier = new Map(
        productCounts.map((item) => [String(item._id), item.total]),
    );

    return suppliers.map((supplier) => ({
        ...supplier.toObject(),
        productCount: countsBySupplier.get(String(supplier._id)) || 0,
    }));
};

export const getSupplierByIdService = async (id) => {
    const supplier = await Supplier.findById(id).populate(
        'userId',
        'name email role',
    );
    if (!supplier) return null;
    const products = await Product.find({ supplierRef: supplier._id })
        .populate('category', 'name slug')
        .sort({ createdAt: -1 });
    return { ...supplier.toObject(), products };
};

export const getSupplierForUserService = async (userId) => {
    return await Supplier.findOne({ userId }).populate(
        'userId',
        'name email role',
    );
};

export const updateSupplierProfileService = async (userId, data) => {
    const nextData = { ...data };
    if (nextData.name && !nextData.slug) nextData.slug = slugify(nextData.name);

    const supplier = await Supplier.findOneAndUpdate({ userId }, nextData, {
        new: true,
        runValidators: true,
    });
    if (!supplier) throw new HttpError('Supplier profile not found', 404);
    return supplier;
};

export const uploadSupplierLogoService = async (userId, files = []) => {
    const file = files[0];
    if (!file) throw new HttpError('No image provided', 400);

    const logo = await mapSupplierUpload(file);
    const supplier = await Supplier.findOneAndUpdate(
        { userId },
        { logo },
        { new: true, runValidators: true },
    );
    if (!supplier) throw new HttpError('Supplier profile not found', 404);
    return supplier;
};

export const uploadSupplierImagesService = async (userId, files = []) => {
    if (!files.length) throw new HttpError('No images provided', 400);

    const images = await Promise.all(files.map(mapSupplierUpload));
    const supplier = await Supplier.findOneAndUpdate(
        { userId },
        { $push: { gallery: { $each: images } } },
        { new: true, runValidators: true },
    );
    if (!supplier) throw new HttpError('Supplier profile not found', 404);
    return supplier;
};

const setSupplierStatus = async (id, status, adminId, extra = {}) => {
    const supplier = await Supplier.findByIdAndUpdate(
        id,
        {
            ...extra,
            status,
            reviewedAt: new Date(),
            reviewedBy: adminId,
        },
        { new: true, runValidators: true },
    );
    if (!supplier) throw new HttpError('Supplier not found', 404);
    return supplier;
};

export const approveSupplierService = async (id, adminId) => {
    const supplier = await setSupplierStatus(id, 'active', adminId, {
        rejectionReason: '',
    });
    await Product.updateMany(
        { supplierRef: supplier._id, status: 'pending_review' },
        { $set: { 'supplier.status': 'active' } },
    );
    return supplier;
};

export const rejectSupplierService = async (id, adminId, reason = '') => {
    const supplier = await setSupplierStatus(id, 'rejected', adminId, {
        rejectionReason: reason,
    });
    await Product.updateMany(
        { supplierRef: supplier._id },
        { $set: { 'supplier.status': 'rejected' } },
    );
    return supplier;
};

export const deactivateSupplierService = async (id, adminId) => {
    const supplier = await setSupplierStatus(id, 'inactive', adminId);
    await Product.updateMany(
        { supplierRef: supplier._id },
        { $set: { 'supplier.status': 'inactive' } },
    );
    return supplier;
};

export const reactivateSupplierService = async (id, adminId) => {
    const supplier = await setSupplierStatus(id, 'active', adminId, {
        rejectionReason: '',
    });
    await Product.updateMany(
        { supplierRef: supplier._id },
        { $set: { 'supplier.status': 'active' } },
    );
    return supplier;
};

export const setSupplierFeaturedService = async (id, featured) => {
    const supplier = await Supplier.findByIdAndUpdate(
        id,
        { featured },
        { new: true, runValidators: true },
    );
    if (!supplier) throw new HttpError('Supplier not found', 404);
    return supplier;
};

export const setSupplierInternalNotesService = async (
    id,
    internalNotes = '',
) => {
    const supplier = await Supplier.findByIdAndUpdate(
        id,
        { internalNotes },
        { new: true, runValidators: true },
    );
    if (!supplier) throw new HttpError('Supplier not found', 404);
    return supplier;
};
