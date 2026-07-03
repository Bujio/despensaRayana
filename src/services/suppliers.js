import bcrypt from 'bcryptjs';
import { User } from '../db/models/user.model.js';
import { Product } from '../db/models/product.model.js';
import { Supplier } from '../db/models/supplier.model.js';
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

const generateSupplierCode = () =>
    Array.from(
        { length: 6 },
        () =>
            SUPPLIER_CODE_CHARS[
                Math.floor(Math.random() * SUPPLIER_CODE_CHARS.length)
            ],
    ).join('');

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
    legalName,
    description,
}) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const supplierCode = await createUniqueSupplierCode();

    let user;
    try {
        user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
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
            userId: user._id,
            supplierCode,
            name,
            legalName,
            email,
            phone,
            address,
            description,
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
    const supplier = await Supplier.findOneAndUpdate({ userId }, data, {
        new: true,
        runValidators: true,
    });
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
