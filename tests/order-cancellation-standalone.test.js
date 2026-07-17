import { jest } from '@jest/globals';
import { clearCollections, setTestEnv, startTestDB } from './helpers/setup.js';

setTestEnv();

const sendOrderStatusEmail = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('../src/services/email.js', () => ({
    sendEmailVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendOrderConfirmationEmail: jest.fn().mockResolvedValue(undefined),
    sendOrderStatusEmail,
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const { default: request } = await import('supertest');
const { app } = await import('../app.js');
const { Category } = await import('../src/db/models/category.model.js');
const { Order } = await import('../src/db/models/order.model.js');
const { Product } = await import('../src/db/models/product.model.js');

let stopDB;

beforeAll(async () => {
    stopDB = await startTestDB();
});

afterAll(async () => {
    await stopDB();
});

beforeEach(async () => {
    await clearCollections();
    jest.clearAllMocks();
});

test('standalone rejects cancellation with 503 and performs no mutations', async () => {
    const category = await Category.create({ name: 'Standalone test' });
    await Product.create({
        sku: 'SKU-STANDALONE',
        name: 'Standalone product',
        description: 'for standalone cancellation test',
        price: 10,
        stock: 5,
        category: category._id,
        supplier: { id: 1, name: 'Test supplier' },
    });

    const credentials = {
        name: 'Standalone buyer',
        email: 'standalone@test.com',
        password: 'Secret123',
    };
    await request(app).post('/api/auth/register').send(credentials);
    const login = await request(app).post('/api/auth/login').send({
        email: credentials.email,
        password: credentials.password,
    });
    const accessToken = login.body.accessToken;

    const created = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
            email: credentials.email,
            products: [{ sku: 'SKU-STANDALONE', count: 2 }],
        });
    expect(created.status).toBe(201);

    const response = await request(app)
        .patch(`/api/orders/${created.body._id}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'Standalone must fail closed' });
    const [order, product] = await Promise.all([
        Order.findById(created.body._id),
        Product.findOne({ sku: 'SKU-STANDALONE' }),
    ]);

    expect(response.status).toBe(503);
    expect(response.body.message).toBe('Internal server error');
    expect(order.status).toBe('pending');
    expect(product.stock).toBe(3);
    expect(sendOrderStatusEmail).not.toHaveBeenCalled();
});
