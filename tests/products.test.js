import { startTestDB, clearCollections, setTestEnv } from './helpers/setup.js';

setTestEnv();

const { default: request } = await import('supertest');
const { app } = await import('../app.js');
const { Product } = await import('../src/db/models/product.model.js');
const { Category } = await import('../src/db/models/category.model.js');

let stopDB;

beforeAll(async () => {
    stopDB = await startTestDB();
});

afterAll(async () => {
    await stopDB();
});

beforeEach(async () => {
    await clearCollections();
});

/**
 * Helper para sembrar un catálogo mínimo y predecible en los tests de filtros.
 * Crea una categoría y tres productos con nombres, precios y stocks distintos.
 */
const seedCatalog = async () => {
    const category = await Category.create({ name: 'Aceites' });
    const supplier = { id: 1, name: 'Cooperativa Valencia' };
    await Product.insertMany([
        {
            sku: 'OLI-001',
            name: 'Aceite de oliva virgen',
            description: 'Aceite premium extraído en frío',
            price: 15,
            stock: 10,
            category: category._id,
            supplier,
        },
        {
            sku: 'OLI-002',
            name: 'Aceite de girasol',
            description: 'Aceite refinado para fritura',
            price: 5,
            stock: 0,
            category: category._id,
            supplier,
        },
        {
            sku: 'MIE-001',
            name: 'Miel de romero',
            description: 'Miel artesanal de la comarca',
            price: 8,
            stock: 20,
            category: category._id,
            supplier,
        },
    ]);
    return category;
};

describe('GET /api/products', () => {
    test('returns the full catalog by default', async () => {
        await seedCatalog();
        const res = await request(app).get('/api/products');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(3);
        expect(res.body.pagination.total).toBe(3);
    });

    test('inStock=true hides out-of-stock products', async () => {
        await seedCatalog();
        const res = await request(app).get('/api/products?inStock=true');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.data.map((p) => p.sku)).not.toContain('OLI-002');
    });

    test('minPrice and maxPrice filter by price range', async () => {
        await seedCatalog();
        const res = await request(app).get(
            '/api/products?minPrice=6&maxPrice=10',
        );
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].sku).toBe('MIE-001');
    });

    test('sort=price&order=asc returns products cheapest first', async () => {
        await seedCatalog();
        const res = await request(app).get(
            '/api/products?sort=price&order=asc',
        );
        expect(res.status).toBe(200);
        const prices = res.body.data.map((p) => p.price);
        expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    test('search uses the text index and finds matching products', async () => {
        await seedCatalog();
        // Aseguramos que el text index está creado antes de buscar
        await Product.syncIndexes();
        const res = await request(app).get('/api/products?search=miel');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data.some((p) => p.sku === 'MIE-001')).toBe(true);
    });

    test('search ranks a product-name keyword before contextual matches', async () => {
        const category = await Category.create({ name: 'Artesanía' });
        const supplier = { id: 1, name: 'Talleres de la Raya' };

        await Product.create({
            sku: 'PAN-001',
            name: 'Panera artesanal de mimbre',
            shortDescription: 'Panera artesanal de fibras naturales',
            description: 'Pieza tradicional elaborada a mano',
            price: 29,
            stock: 4,
            category: category._id,
            supplier,
        });
        await Product.create({
            sku: 'CES-001',
            name: 'Cesta artesanal',
            shortDescription: 'Cesta para cocina y despensa',
            description: 'Puede utilizarse como panera tradicional',
            price: 24,
            stock: 6,
            category: category._id,
            supplier,
        });

        const res = await request(app).get(
            '/api/products?search=panera&sort=createdAt&order=desc',
        );

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.data[0].sku).toBe('PAN-001');
    });

    test('soft-deleted products are excluded from listings', async () => {
        await seedCatalog();
        const toDelete = await Product.findOne({ sku: 'MIE-001' });
        await toDelete.softDelete();

        const res = await request(app).get('/api/products');
        expect(res.status).toBe(200);
        expect(res.body.data.map((p) => p.sku)).not.toContain('MIE-001');
    });
});
