import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { Category } from '../db/models/category.model.js';
import { Product } from '../db/models/product.model.js';
import { Supplier } from '../db/models/supplier.model.js';
import { HttpError } from '../utils/http-error.js';
import {
    cloudinary,
    hasCloudinaryConfig,
} from '../middlewares/upload.middleware.js';

/**
 * Campos por los que se permite ordenar el listado de productos.
 * Whitelist para evitar que el cliente ordene por campos internos/sensibles.
 */
const SORTABLE_FIELDS = new Set(['name', 'price', 'stock', 'createdAt']);
const SKU_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const getApiBaseUrl = () => {
    const configured = process.env.PUBLIC_API_URL || process.env.API_BASE_URL;
    if (configured) return configured.replace(/\/$/, '');

    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT || 3000;
    return `http://${host}:${port}`;
};

const getImageUrl = (file) => {
    if (file.path?.startsWith('http')) return file.path;
    return `${getApiBaseUrl()}/uploads/products/${file.filename}`;
};

const mapLocalImage = (file) => ({
    url: getImageUrl(file),
    name: file.originalname || file.filename || 'Imagen del producto',
});

const normalizeSkuPart = (value = '', fallback = 'GEN', maxLength = 6) => {
    const normalized = String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '')
        .slice(0, maxLength);
    return normalized || fallback.slice(0, maxLength);
};

const createSkuSuffix = (length = 4) => {
    let value = '';
    for (let index = 0; index < length; index += 1) {
        value += SKU_CHARS[crypto.randomInt(0, SKU_CHARS.length)];
    }
    return value;
};

const getCategorySkuPart = async (categoryId) => {
    if (!categoryId) return 'CAT';
    const category = await Category.findById(categoryId).select('name slug');
    return normalizeSkuPart(category?.slug || category?.name, 'CAT', 4);
};

const buildSkuCandidate = async (data, supplier = {}) => {
    const categoryPart = await getCategorySkuPart(data.category);
    const supplierPart = normalizeSkuPart(
        supplier.supplierCode ||
            data.supplier?.supplierCode ||
            supplier.name ||
            data.supplier?.name,
        'RAYA',
        6,
    );
    const productPart = normalizeSkuPart(data.name, 'PROD', 6);
    return `LDR-${categoryPart}-${supplierPart}-${productPart}-${createSkuSuffix()}`;
};

const createUniqueProductSku = async (data, supplier = {}) => {
    if (data.sku?.trim()) return data.sku.trim().toUpperCase();

    for (let attempt = 0; attempt < 20; attempt += 1) {
        const sku = await buildSkuCandidate(data, supplier);
        const exists = await Product.exists({ sku });
        if (!exists) return sku;
    }

    throw new HttpError('Could not generate product SKU', 500);
};

const escapeRegExp = (value = '') =>
    String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeSearchText = (value = '') =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const getSearchTokens = (search = '') => [
    ...new Set(normalizeSearchText(search).split(' ').filter(Boolean)),
];

const buildSearchExpressions = (search = '') => {
    const terms = [
        String(search || '').trim(),
        ...String(search || '')
            .split(/\s+/)
            .map((term) => term.trim()),
    ].filter(Boolean);

    return [...new Set(terms)].map(
        (term) => new RegExp(escapeRegExp(term), 'i'),
    );
};

const buildSearchConditions = (expressions, categoryIds, supplierIds) => {
    const fieldNames = [
        'name',
        'sku',
        'shortDescription',
        'description',
        'supplier.name',
        'supplier.supplierCode',
    ];
    const conditions = expressions.flatMap((expression) =>
        fieldNames.map((fieldName) => ({ [fieldName]: expression })),
    );

    if (categoryIds.length) conditions.push({ category: { $in: categoryIds } });
    if (supplierIds.length)
        conditions.push({ supplierRef: { $in: supplierIds } });

    return conditions;
};

const scoreSearchField = (value, query, tokens, weights) => {
    const text = normalizeSearchText(value);
    if (!text) return 0;

    let score = 0;
    const words = text.split(' ').filter(Boolean);

    if (text === query) score = Math.max(score, weights.exact || 0);
    if (text.startsWith(query)) score = Math.max(score, weights.prefix || 0);
    if (words.some((word) => word.startsWith(query))) {
        score = Math.max(score, weights.wordPrefix || 0);
    }
    if (text.includes(query)) score = Math.max(score, weights.contains || 0);

    const matchedTokens = tokens.filter((token) => text.includes(token)).length;
    if (tokens.length && matchedTokens === tokens.length) {
        score += weights.allTokens || 0;
    }
    score += matchedTokens * (weights.token || 0);

    return score;
};

const getProductSearchScore = (product, search) => {
    const query = normalizeSearchText(search);
    const tokens = getSearchTokens(search);
    if (!query) return 0;

    const categoryName = product.category?.name || '';
    const categorySlug = product.category?.slug || '';
    const supplierName =
        product.supplier?.name || product.supplierRef?.name || '';
    const supplierCode =
        product.supplier?.supplierCode ||
        product.supplierRef?.supplierCode ||
        '';

    return [
        [
            product.name,
            {
                exact: 10000,
                prefix: 9500,
                wordPrefix: 9000,
                contains: 8500,
                allTokens: 900,
                token: 240,
            },
        ],
        [
            product.sku,
            {
                exact: 8200,
                prefix: 7600,
                wordPrefix: 7200,
                contains: 6800,
                allTokens: 600,
                token: 180,
            },
        ],
        [
            categoryName,
            {
                exact: 5400,
                prefix: 5000,
                wordPrefix: 4600,
                contains: 4200,
                allTokens: 450,
                token: 120,
            },
        ],
        [
            categorySlug,
            {
                exact: 5200,
                prefix: 4800,
                wordPrefix: 4400,
                contains: 4000,
                allTokens: 420,
                token: 110,
            },
        ],
        [
            supplierName,
            {
                exact: 4300,
                prefix: 3900,
                wordPrefix: 3500,
                contains: 3100,
                allTokens: 320,
                token: 90,
            },
        ],
        [
            supplierCode,
            {
                exact: 4200,
                prefix: 3800,
                wordPrefix: 3400,
                contains: 3000,
                allTokens: 300,
                token: 80,
            },
        ],
        [
            product.shortDescription,
            {
                exact: 2600,
                prefix: 2300,
                wordPrefix: 2000,
                contains: 1700,
                allTokens: 220,
                token: 60,
            },
        ],
        [
            product.description,
            {
                exact: 1500,
                prefix: 1300,
                wordPrefix: 1100,
                contains: 900,
                allTokens: 120,
                token: 30,
            },
        ],
    ].reduce(
        (total, [value, weights]) =>
            total + scoreSearchField(value, query, tokens, weights),
        0,
    );
};

const readSortValue = (product, sort) => {
    if (sort === 'name') return normalizeSearchText(product.name);
    if (sort === 'price') return Number(product.price || 0);
    if (sort === 'stock') return Number(product.stock || 0);
    const date = new Date(product.createdAt || 0);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const compareBySearchRelevance = (search, sort, order) => (left, right) => {
    const scoreDifference =
        getProductSearchScore(right, search) -
        getProductSearchScore(left, search);
    if (scoreDifference !== 0) return scoreDifference;

    const fallbackSort = SORTABLE_FIELDS.has(sort) ? sort : 'createdAt';
    const direction = order === 'asc' ? 1 : -1;
    const leftValue = readSortValue(left, fallbackSort);
    const rightValue = readSortValue(right, fallbackSort);

    if (typeof leftValue === 'string') {
        return leftValue.localeCompare(String(rightValue)) * direction;
    }

    return (leftValue - rightValue) * direction;
};

const uploadFileToCloudinary = async (file) => {
    const result = await cloudinary.uploader.upload(file.path, {
        folder: 'products',
        resource_type: 'image',
        transformation: [
            {
                width: 800,
                crop: 'limit',
                fetch_format: 'webp',
                quality: 'auto',
            },
        ],
    });

    await fs.unlink(file.path).catch(() => {});

    return {
        url: result.secure_url,
        name: file.originalname || result.public_id || 'Imagen del producto',
    };
};

/**
 * Obtiene un producto por su ID, poblando el nombre y slug de su categoría.
 *
 * @param {string} id - ID de MongoDB del producto
 * @returns {Promise<Product|null>} El producto encontrado o null si no existe
 */
const publicCatalogFilter = () => ({
    $and: [
        {
            $or: [{ status: 'published' }, { status: { $exists: false } }],
        },
        {
            $or: [
                { supplierRef: { $exists: false } },
                { supplierRef: null },
                { 'supplier.status': 'active' },
                { 'supplier.status': { $exists: false } },
            ],
        },
    ],
});

export const getProductService = async (id, { includeAll = false } = {}) => {
    const filter = { _id: id };
    if (!includeAll) filter.$and = publicCatalogFilter().$and;
    return await Product.findOne(filter).populate('category', 'name slug');
};

/**
 * Devuelve una página de productos del catálogo aplicando filtros y orden.
 *
 * Soporta:
 *   - `categoryId` → filtro por categoría
 *   - `search`     → búsqueda ponderada por nombre, SKU, categoría, proveedor y descripciones
 *   - `inStock`    → true solo devuelve productos con stock > 0
 *   - `minPrice` / `maxPrice` → rango de precio
 *   - `sort`       → campo por el que ordenar (whitelist)
 *   - `order`      → 'asc' | 'desc' como desempate tras la relevancia de búsqueda
 *
 * @param {{ skip: number, limit: number }} pagination - Parámetros de paginación
 * @param {object} [filters] - Filtros opcionales
 * @returns {Promise<{ data: Product[], total: number }>}
 */
export const listProductsService = async (
    { skip, limit },
    {
        categoryId,
        search,
        inStock,
        minPrice,
        maxPrice,
        sort,
        order = 'asc',
        includeAll = false,
    } = {},
) => {
    const filter = includeAll ? {} : publicCatalogFilter();
    if (categoryId) filter.category = categoryId;
    if (inStock) filter.stock = { $gt: 0 };

    if (minPrice != null || maxPrice != null) {
        filter.price = {};
        if (minPrice != null) filter.price.$gte = minPrice;
        if (maxPrice != null) filter.price.$lte = maxPrice;
    }

    if (search) {
        const expressions = buildSearchExpressions(search);
        const [matchingCategories, matchingSuppliers] = await Promise.all([
            Category.find({
                $or: expressions.flatMap((expression) => [
                    { name: expression },
                    { slug: expression },
                ]),
            }).select('_id'),
            Supplier.find({
                $or: expressions.flatMap((expression) => [
                    { name: expression },
                    { supplierCode: expression },
                    { specialties: expression },
                    { 'location.town': expression },
                    { 'location.province': expression },
                ]),
            }).select('_id'),
        ]);

        filter.$or = buildSearchConditions(
            expressions,
            matchingCategories.map((category) => category._id),
            matchingSuppliers.map((supplier) => supplier._id),
        );

        const rankedProducts = await Product.find(filter)
            .populate('category', 'name slug')
            .populate('supplierRef', 'name supplierCode status');

        rankedProducts.sort(compareBySearchRelevance(search, sort, order));

        return {
            data: rankedProducts.slice(skip, skip + limit),
            total: rankedProducts.length,
        };
    }

    // Construimos el objeto de sort respetando la whitelist.
    let sortObj = { createdAt: -1 };
    if (sort && SORTABLE_FIELDS.has(sort)) {
        sortObj = { [sort]: order === 'desc' ? -1 : 1 };
    }

    const query = Product.find(filter)
        .populate('category', 'name slug')
        .populate('supplierRef', 'name supplierCode status')
        .sort(sortObj)
        .skip(skip)
        .limit(limit);

    const [data, total] = await Promise.all([
        query,
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
    const sku = await createUniqueProductSku(data, data.supplier || {});
    return await Product.create({
        status: data.status || 'published',
        ...data,
        sku,
    });
};

const getWritableSupplier = async (userId) => {
    const supplier = await Supplier.findOne({ userId });
    if (!supplier) throw new HttpError('Supplier profile not found', 404);
    if (supplier.status === 'rejected') {
        throw new HttpError('Supplier request was rejected', 403);
    }
    if (supplier.status === 'inactive') {
        throw new HttpError('Supplier account is inactive', 403);
    }
    return supplier;
};

export const listSupplierProductsService = async (userId) => {
    const supplier = await Supplier.findOne({ userId });
    if (!supplier) throw new HttpError('Supplier profile not found', 404);
    return await Product.find({ supplierRef: supplier._id })
        .populate('category', 'name slug')
        .sort({ createdAt: -1 });
};

export const createSupplierProductService = async (userId, data) => {
    const supplier = await getWritableSupplier(userId);
    const status = data.status === 'draft' ? 'draft' : 'pending_review';
    const sku = await createUniqueProductSku(data, supplier);
    return await Product.create({
        ...data,
        sku,
        status,
        supplierRef: supplier._id,
        supplier: {
            id: 0,
            supplierCode: supplier.supplierCode,
            status: supplier.status,
            name: supplier.name,
        },
    });
};

export const updateSupplierProductService = async (userId, productId, data) => {
    const supplier = await getWritableSupplier(userId);
    const product = await Product.findOne({
        _id: productId,
        supplierRef: supplier._id,
    });
    if (!product) throw new HttpError('Product not found', 404);
    const nextData = { ...data };
    if (
        nextData.status &&
        !['draft', 'pending_review'].includes(nextData.status)
    ) {
        throw new HttpError('Suppliers cannot publish products directly', 403);
    }
    if (nextData.status === 'pending_review') {
        nextData.rejectionReason = '';
        nextData.reviewedAt = null;
        nextData.reviewedBy = null;
    }
    return await Product.findByIdAndUpdate(productId, nextData, {
        returnDocument: 'after',
        runValidators: true,
    });
};

/**
 * Actualiza un producto existente.
 *
 * @param {string} id - ID de MongoDB del producto
 * @param {object} data - Campos a actualizar (parcial)
 * @returns {Promise<Product|null>} El producto actualizado o null si no existe
 */
export const deleteSupplierProductService = async (userId, productId) => {
    const supplier = await getWritableSupplier(userId);
    const product = await Product.findOne({
        _id: productId,
        supplierRef: supplier._id,
    });
    if (!product) return null;
    await product.softDelete();
    return product;
};

export const addSupplierProductImagesService = async (
    userId,
    productId,
    files,
) => {
    const supplier = await getWritableSupplier(userId);
    const product = await Product.findOne({
        _id: productId,
        supplierRef: supplier._id,
    });
    if (!product) throw new HttpError('Product not found', 404);

    const newImages = await Promise.all(
        files.map(async (file) => {
            if (!hasCloudinaryConfig) return mapLocalImage(file);

            try {
                return await uploadFileToCloudinary(file);
            } catch {
                return mapLocalImage(file);
            }
        }),
    );

    return await Product.findByIdAndUpdate(
        productId,
        { $push: { images: { $each: newImages } } },
        { returnDocument: 'after', runValidators: true },
    );
};

export const updateProductService = async (id, data) => {
    return await Product.findByIdAndUpdate(id, data, {
        returnDocument: 'after', // devuelve el documento actualizado
        runValidators: true, // aplica las validaciones del schema de Mongoose
    });
};

export const approveProductService = async (id, adminId = null) => {
    const product = await Product.findById(id).populate(
        'supplierRef',
        'status',
    );
    if (!product) return null;

    if (!product.category) {
        throw new HttpError(
            'Product category is required before approval',
            400,
        );
    }
    if (!product.shortDescription?.trim()) {
        throw new HttpError(
            'Product short description is required before approval',
            400,
        );
    }
    if (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0) {
        throw new HttpError('Product price is required before approval', 400);
    }
    if (product.supplierRef && product.supplierRef.status !== 'active') {
        throw new HttpError(
            'Supplier must be active before publishing products',
            400,
        );
    }

    product.status = 'published';
    product.rejectionReason = '';
    product.reviewedAt = new Date();
    product.reviewedBy = adminId;
    if (product.supplier?.status) product.supplier.status = 'active';
    return await product.save();
};

export const rejectProductService = async (id, reason = '', adminId = null) => {
    const product = await Product.findById(id);
    if (!product) return null;

    const rejectionReason = String(reason || '').trim();
    if (rejectionReason.length < 3) {
        throw new HttpError('Rejection reason is required', 400);
    }

    product.status = 'rejected';
    product.rejectionReason = rejectionReason.slice(0, 1000);
    product.reviewedAt = new Date();
    product.reviewedBy = adminId;
    return await product.save();
};

/**
 * Marca un producto como borrado (soft delete).
 * Permite retirarlo del catálogo sin perder el histórico de pedidos que
 * lo contengan ni romper integridad referencial.
 *
 * @param {string} id - ID de MongoDB del producto
 * @returns {Promise<Product|null>} El producto borrado o null si no existía
 */
export const deleteProductService = async (id) => {
    const product = await Product.findById(id);
    if (!product) return null;
    await product.softDelete();
    return product;
};

/**
 * Añade imágenes subidas a Cloudinary o al almacenamiento local del backend.
 * Cloudinary devuelve una URL en file.path; el fallback local usa file.filename.
 *
 * @param {string} id - ID de MongoDB del producto
 * @param {Express.Multer.File[]} files - Archivos procesados por multer
 * @returns {Promise<Product|null>} El producto actualizado o null si no existe
 */
export const addProductImagesService = async (id, files) => {
    const newImages = await Promise.all(
        files.map(async (file) => {
            if (!hasCloudinaryConfig) return mapLocalImage(file);

            try {
                return await uploadFileToCloudinary(file);
            } catch {
                return mapLocalImage(file);
            }
        }),
    );

    return await Product.findByIdAndUpdate(
        id,
        { $push: { images: { $each: newImages } } },
        { returnDocument: 'after' },
    );
};
