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

const registerAndLogin = async () => {
    await request(app).post('/api/auth/register').send({
        name: 'Cart',
        email: 'cart@test.com',
        password: 'Secret123',
    });
    const { body } = await request(app).post('/api/auth/login').send({
        email: 'cart@test.com',
        password: 'Secret123',
    });
    return body.accessToken;
};

const seedProduct = async (stock = 5) => {
    const category = await Category.create({ name: 'X' });
    await Product.create({
        sku: 'CART-001',
        name: 'Cart product',
        description: '-',
        price: 3,
        stock,
        category: category._id,
        supplier: { id: 1, name: 'Test' },
    });
};

describe('Cart endpoints', () => {
    test('adds item, increments quantity on second add, and rejects over-stock', async () => {
        await seedProduct(3);
        const token = await registerAndLogin();
        const auth = { Authorization: `Bearer ${token}` };

        const first = await request(app)
            .post('/api/cart/items')
            .set(auth)
            .send({ sku: 'CART-001', quantity: 2 });
        expect(first.status).toBe(200);
        expect(first.body.items).toHaveLength(1);
        expect(first.body.items[0].quantity).toBe(2);

        // Segundo add: suma cantidades si el SKU ya está en el carrito
        const second = await request(app)
            .post('/api/cart/items')
            .set(auth)
            .send({ sku: 'CART-001', quantity: 1 });
        expect(second.status).toBe(200);
        expect(second.body.items[0].quantity).toBe(3);

        // Tercer add sobre stock: debe fallar y no incrementar la cantidad
        const third = await request(app)
            .post('/api/cart/items')
            .set(auth)
            .send({ sku: 'CART-001', quantity: 1 });
        expect(third.status).toBe(400);

        const getAfter = await request(app).get('/api/cart').set(auth);
        expect(getAfter.body.items[0].quantity).toBe(3);
    });

    test('removes an item with DELETE /cart/items/:sku', async () => {
        await seedProduct(5);
        const token = await registerAndLogin();
        const auth = { Authorization: `Bearer ${token}` };

        await request(app)
            .post('/api/cart/items')
            .set(auth)
            .send({ sku: 'CART-001', quantity: 2 });

        const removed = await request(app)
            .delete('/api/cart/items/CART-001')
            .set(auth);
        expect(removed.status).toBe(200);
        expect(removed.body.items).toHaveLength(0);
    });

    test('DELETE /cart empties all items', async () => {
        await seedProduct(5);
        const token = await registerAndLogin();
        const auth = { Authorization: `Bearer ${token}` };

        await request(app)
            .post('/api/cart/items')
            .set(auth)
            .send({ sku: 'CART-001', quantity: 2 });

        const cleared = await request(app).delete('/api/cart').set(auth);
        expect(cleared.status).toBe(200);
        expect(cleared.body.items).toHaveLength(0);
    });
});
