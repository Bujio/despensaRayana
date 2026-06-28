import { Product } from '../db/models/product.model.js';

/**
 * Campos por los que se permite ordenar el listado de productos.
 * Whitelist para evitar que el cliente ordene por campos internos/sensibles.
 */
const SORTABLE_FIELDS = new Set(['name', 'price', 'stock', 'createdAt']);

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
 * Devuelve una página de productos del catálogo aplicando filtros y orden.
 *
 * Soporta:
 *   - `categoryId` → filtro por categoría
 *   - `search`     → búsqueda full-text sobre nombre y descripción (usa text index)
 *   - `inStock`    → true solo devuelve productos con stock > 0
 *   - `minPrice` / `maxPrice` → rango de precio
 *   - `sort`       → campo por el que ordenar (whitelist)
 *   - `order`      → 'asc' | 'desc' (por defecto asc, desc si es búsqueda por score)
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
    } = {},
) => {
    const filter = {};
    if (categoryId) filter.category = categoryId;
    if (inStock) filter.stock = { $gt: 0 };

    if (minPrice != null || maxPrice != null) {
        filter.price = {};
        if (minPrice != null) filter.price.$gte = minPrice;
        if (maxPrice != null) filter.price.$lte = maxPrice;
    }

    // Búsqueda full-text. Requiere el índice de texto sobre name+description
    // definido en el modelo. Mongo devuelve un `score` que usamos para ordenar
    // por relevancia cuando no se pide otro criterio explícito.
    let projection;
    let defaultSort;
    if (search) {
        filter.$text = { $search: search };
        projection = { score: { $meta: 'textScore' } };
        defaultSort = { score: { $meta: 'textScore' } };
    }

    // Construimos el objeto de sort respetando la whitelist.
    let sortObj = defaultSort ?? { createdAt: -1 };
    if (sort && SORTABLE_FIELDS.has(sort)) {
        sortObj = { [sort]: order === 'desc' ? -1 : 1 };
    }

    const query = Product.find(filter, projection)
        .populate('category', 'name slug')
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
    const newImages = files.map((file) => ({
        url: getImageUrl(file),
        name: file.filename || file.originalname || 'Imagen del producto',
    }));

    return await Product.findByIdAndUpdate(
        id,
        { $push: { 'supplier.images': { $each: newImages } } },
        { new: true },
    );
};
