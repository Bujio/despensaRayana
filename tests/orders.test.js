import { startTestDB, clearCollections, setTestEnv } from './helpers/setup.js';

setTestEnv();

const { default: request } = await import('supertest');
const { app } = await import('../app.js');
const { Product } = await import('../src/db/models/product.model.js');
const { Category } = await import('../src/db/models/category.model.js');
const { Cart } = await import('../src/db/models/cart.model.js');

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
 * Crea un usuario, devuelve accessToken y email.
 * Todos los tests necesitan autenticarse contra la API.
 */
const registerAndLogin = async (overrides = {}) => {
    const payload = {
        name: 'Buyer',
        email: 'buyer@test.com',
        password: 'Secret123',
        ...overrides,
    };
    await request(app).post('/api/auth/register').send(payload);
    const { body } = await request(app).post('/api/auth/login').send({
        email: payload.email,
        password: payload.password,
    });
    return { accessToken: body.accessToken, email: payload.email };
};

/**
 * Siembra un producto con el stock indicado y devuelve el documento creado.
 */
const seedProduct = async (overrides = {}) => {
    const category = await Category.create({ name: 'Test cat' });
    return Product.create({
        sku: 'SKU-TEST',
        name: 'Test product',
        description: 'for order tests',
        price: 10,
        stock: 5,
        category: category._id,
        supplier: { id: 1, name: 'Test supplier' },
        ...overrides,
    });
};

describe('POST /api/orders', () => {
    test('creates an order and decrements product stock', async () => {
        await seedProduct();
        const { accessToken, email } = await registerAndLogin();

        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                email,
                products: [{ sku: 'SKU-TEST', count: 2, price: 10 }],
            });

        expect(res.status).toBe(201);
        expect(res.body.email).toBe(email);

        const product = await Product.findOne({ sku: 'SKU-TEST' });
        expect(product.stock).toBe(3);
    });

    test('rejects insufficient stock with 400 and leaves stock untouched', async () => {
        await seedProduct({ stock: 1 });
        const { accessToken, email } = await registerAndLogin();

        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                email,
                products: [{ sku: 'SKU-TEST', count: 5, price: 10 }],
            });

        expect(res.status).toBe(400);
        const product = await Product.findOne({ sku: 'SKU-TEST' });
        expect(product.stock).toBe(1);
    });

    test('rejects unknown SKU with 404', async () => {
        const { accessToken, email } = await registerAndLogin();
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                email,
                products: [{ sku: 'DOES-NOT-EXIST', count: 1, price: 10 }],
            });
        expect(res.status).toBe(404);
    });

    test('forbids creating orders for someone else', async () => {
        await seedProduct();
        const { accessToken } = await registerAndLogin();
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                email: 'someone.else@test.com',
                products: [{ sku: 'SKU-TEST', count: 1, price: 10 }],
            });
        expect(res.status).toBe(403);
    });

    test('clears the user cart after a successful order', async () => {
        await seedProduct();
        const { accessToken, email } = await registerAndLogin();

        // Añadimos un item al carrito y comprobamos que está
        await request(app)
            .post('/api/cart/items')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ sku: 'SKU-TEST', quantity: 1 });
        const before = await Cart.findOne({});
        expect(before.items).toHaveLength(1);

        // Crear pedido debería dejar el carrito vacío
        await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                email,
                products: [{ sku: 'SKU-TEST', count: 1, price: 10 }],
            });

        // La limpieza del carrito es best-effort fire-and-forget. Esperamos
        // un tick del event loop para que el updateOne termine antes de asertar.
        await new Promise((resolve) => setImmediate(resolve));
        const after = await Cart.findOne({});
        expect(after.items).toHaveLength(0);
    });

    test('allows the owner to cancel a pending order and restores stock', async () => {
        await seedProduct({ stock: 5 });
        const { accessToken, email } = await registerAndLogin();

        const created = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                email,
                products: [{ sku: 'SKU-TEST', count: 2, price: 10 }],
            });

        const afterCreate = await Product.findOne({ sku: 'SKU-TEST' });
        expect(afterCreate.stock).toBe(3);

        const cancelled = await request(app)
            .patch(`/api/orders/${created.body._id}/cancel`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ reason: 'Cambio de planes' });

        const afterCancel = await Product.findOne({ sku: 'SKU-TEST' });
        expect(cancelled.status).toBe(200);
        expect(cancelled.body.status).toBe('cancelled');
        expect(cancelled.body.cancellation.amount).toBe(20);
        expect(cancelled.body.refund.amount).toBe(20);
        expect(afterCancel.stock).toBe(5);
    });
});
