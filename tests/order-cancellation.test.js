import { jest } from '@jest/globals';
import {
    clearCollections,
    setTestEnv,
    startTestReplicaSet,
} from './helpers/setup.js';

setTestEnv();

const sendOrderConfirmationEmail = jest.fn().mockResolvedValue(undefined);
const sendOrderStatusEmail = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('../src/services/email.js', () => ({
    sendEmailVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendOrderConfirmationEmail,
    sendOrderStatusEmail,
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const { default: request } = await import('supertest');
const { app } = await import('../app.js');
const { Category } = await import('../src/db/models/category.model.js');
const { Order } = await import('../src/db/models/order.model.js');
const { Product } = await import('../src/db/models/product.model.js');
const { User } = await import('../src/db/models/user.model.js');

let stopDB;

beforeAll(async () => {
    stopDB = await startTestReplicaSet();
});

afterAll(async () => {
    await stopDB();
});

beforeEach(async () => {
    await clearCollections();
    jest.clearAllMocks();
});

const registerAndLogin = async ({
    email = 'buyer@test.com',
    role = 'user',
} = {}) => {
    const password = 'Secret123';
    const registration = await request(app)
        .post('/api/auth/register')
        .send({
            name: role === 'admin' ? 'Admin' : 'Buyer',
            email,
            password,
        });
    expect(registration.status).toBe(201);

    if (role !== 'user') {
        await User.updateOne({ email }, { $set: { role } });
    }

    const login = await request(app)
        .post('/api/auth/login')
        .send({ email, password });
    expect(login.status).toBe(200);

    return {
        accessToken: login.body.accessToken,
        email,
        userId: login.body.user._id,
    };
};

const seedProducts = async (products = [{ sku: 'SKU-TEST', stock: 5 }]) => {
    const category = await Category.create({ name: 'Cancellation tests' });

    return await Product.create(
        products.map(({ sku, stock = 5, price = 10 }) => ({
            sku,
            name: `Product ${sku}`,
            description: 'for atomic cancellation tests',
            price,
            stock,
            category: category._id,
            supplier: { id: 1, name: 'Test supplier' },
        })),
    );
};

const createOrder = async (
    accessToken,
    email,
    products = [{ sku: 'SKU-TEST', count: 2 }],
) => {
    const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email, products });

    expect(response.status).toBe(201);
    sendOrderConfirmationEmail.mockClear();
    return response.body;
};

const cancelOrder = (orderId, accessToken, reason = 'No longer needed') =>
    request(app)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason });

const expectSingleRestoration = async (orderId, expectedStock = 5) => {
    const [order, product] = await Promise.all([
        Order.findById(orderId),
        Product.findOne({ sku: 'SKU-TEST' }),
    ]);

    expect(order.status).toBe('cancelled');
    expect(product.stock).toBe(expectedStock);
    expect(sendOrderStatusEmail).toHaveBeenCalledTimes(1);
};

describe('atomic order cancellation on a replica set', () => {
    test('two concurrent requests produce one success, one 409 and one restoration', async () => {
        await seedProducts();
        const buyer = await registerAndLogin();
        const order = await createOrder(buyer.accessToken, buyer.email);

        const before = await Product.findOne({ sku: 'SKU-TEST' });
        expect(before.stock).toBe(3);

        const responses = await Promise.all([
            cancelOrder(order._id, buyer.accessToken),
            cancelOrder(order._id, buyer.accessToken),
        ]);

        expect(responses.map(({ status }) => status).sort()).toEqual([
            200, 409,
        ]);
        await expectSingleRestoration(order._id);
    });

    test('three concurrent requests produce one success, two 409 responses and one restoration', async () => {
        await seedProducts();
        const buyer = await registerAndLogin();
        const order = await createOrder(buyer.accessToken, buyer.email);

        const responses = await Promise.all([
            cancelOrder(order._id, buyer.accessToken),
            cancelOrder(order._id, buyer.accessToken),
            cancelOrder(order._id, buyer.accessToken),
        ]);

        expect(responses.map(({ status }) => status).sort()).toEqual([
            200, 409, 409,
        ]);
        await expectSingleRestoration(order._id);
    });

    test('a sequential repetition returns 409 without changing stock again', async () => {
        await seedProducts();
        const buyer = await registerAndLogin();
        const order = await createOrder(buyer.accessToken, buyer.email);

        const first = await cancelOrder(order._id, buyer.accessToken);
        const stockAfterFirst = await Product.findOne({ sku: 'SKU-TEST' });
        const repeated = await cancelOrder(order._id, buyer.accessToken);
        const stockAfterRepeated = await Product.findOne({ sku: 'SKU-TEST' });

        expect(first.status).toBe(200);
        expect(repeated.status).toBe(409);
        expect(stockAfterFirst.stock).toBe(5);
        expect(stockAfterRepeated.stock).toBe(5);
        expect(sendOrderStatusEmail).toHaveBeenCalledTimes(1);
    });

    test('restores aggregated quantities for multiple products once', async () => {
        await seedProducts([
            { sku: 'SKU-A', stock: 8, price: 4 },
            { sku: 'SKU-B', stock: 9, price: 6 },
        ]);
        const buyer = await registerAndLogin();
        const order = await createOrder(buyer.accessToken, buyer.email, [
            { sku: 'SKU-A', count: 2 },
            { sku: 'SKU-A', count: 1 },
            { sku: 'SKU-B', count: 4 },
        ]);

        const before = await Product.find({}).sort({ sku: 1 });
        expect(before.map(({ stock }) => stock)).toEqual([5, 5]);

        const cancelled = await cancelOrder(order._id, buyer.accessToken);
        const after = await Product.find({}).sort({ sku: 1 });

        expect(cancelled.status).toBe(200);
        expect(after.map(({ stock }) => stock)).toEqual([8, 9]);
        expect(sendOrderStatusEmail).toHaveBeenCalledTimes(1);
    });

    test('aborts the order claim and every stock update when one product is missing', async () => {
        await seedProducts([
            { sku: 'SKU-A', stock: 5 },
            { sku: 'SKU-B', stock: 5 },
        ]);
        const buyer = await registerAndLogin();
        const order = await createOrder(buyer.accessToken, buyer.email, [
            { sku: 'SKU-A', count: 2 },
            { sku: 'SKU-B', count: 1 },
        ]);

        await Product.deleteOne({ sku: 'SKU-B' });
        const stockBefore = await Product.findOne({ sku: 'SKU-A' });
        expect(stockBefore.stock).toBe(3);

        const response = await cancelOrder(order._id, buyer.accessToken);
        const [persistedOrder, stockAfter, missingProduct] = await Promise.all([
            Order.findById(order._id),
            Product.findOne({ sku: 'SKU-A' }),
            Product.findOne({ sku: 'SKU-B' }),
        ]);

        expect(response.status).toBe(409);
        expect(persistedOrder.status).toBe('pending');
        expect(stockAfter.stock).toBe(3);
        expect(missingProduct).toBeNull();
        expect(sendOrderStatusEmail).not.toHaveBeenCalled();
    });

    test('returns 404 for an unknown order without sending a notification', async () => {
        const buyer = await registerAndLogin();
        const unknownId = new Order()._id;

        const response = await cancelOrder(unknownId, buyer.accessToken);

        expect(response.status).toBe(404);
        expect(sendOrderStatusEmail).not.toHaveBeenCalled();
    });

    test('returns 403 for another customer order without changing it', async () => {
        await seedProducts();
        const owner = await registerAndLogin({ email: 'owner@test.com' });
        const stranger = await registerAndLogin({
            email: 'stranger@test.com',
        });
        const order = await createOrder(owner.accessToken, owner.email);

        const response = await cancelOrder(order._id, stranger.accessToken);
        const [persistedOrder, product] = await Promise.all([
            Order.findById(order._id),
            Product.findOne({ sku: 'SKU-TEST' }),
        ]);

        expect(response.status).toBe(403);
        expect(persistedOrder.status).toBe('pending');
        expect(product.stock).toBe(3);
        expect(sendOrderStatusEmail).not.toHaveBeenCalled();
    });

    test('returns 409 when a customer tries to cancel a processing order', async () => {
        await seedProducts();
        const buyer = await registerAndLogin();
        const order = await createOrder(buyer.accessToken, buyer.email);
        await Order.updateOne(
            { _id: order._id },
            { $set: { status: 'processing' } },
        );

        const response = await cancelOrder(order._id, buyer.accessToken);
        const [persistedOrder, product] = await Promise.all([
            Order.findById(order._id),
            Product.findOne({ sku: 'SKU-TEST' }),
        ]);

        expect(response.status).toBe(409);
        expect(persistedOrder.status).toBe('processing');
        expect(product.stock).toBe(3);
        expect(sendOrderStatusEmail).not.toHaveBeenCalled();
    });

    test('allows an administrator to cancel a processing order', async () => {
        await seedProducts();
        const buyer = await registerAndLogin();
        const admin = await registerAndLogin({
            email: 'admin@test.com',
            role: 'admin',
        });
        const order = await createOrder(buyer.accessToken, buyer.email);
        await Order.updateOne(
            { _id: order._id },
            { $set: { status: 'processing' } },
        );

        const response = await request(app)
            .patch(`/api/orders/${order._id}/status`)
            .set('Authorization', `Bearer ${admin.accessToken}`)
            .send({ status: 'cancelled' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('cancelled');
        expect(response.body.cancellation.source).toBe('admin');
        await expectSingleRestoration(order._id);
    });

    test('returns 409 when an administrator tries to cancel a shipped order', async () => {
        await seedProducts();
        const buyer = await registerAndLogin();
        const admin = await registerAndLogin({
            email: 'admin@test.com',
            role: 'admin',
        });
        const order = await createOrder(buyer.accessToken, buyer.email);
        await Order.updateOne(
            { _id: order._id },
            { $set: { status: 'shipped' } },
        );

        const response = await request(app)
            .patch(`/api/orders/${order._id}/status`)
            .set('Authorization', `Bearer ${admin.accessToken}`)
            .send({ status: 'cancelled' });
        const [persistedOrder, product] = await Promise.all([
            Order.findById(order._id),
            Product.findOne({ sku: 'SKU-TEST' }),
        ]);

        expect(response.status).toBe(409);
        expect(persistedOrder.status).toBe('shipped');
        expect(product.stock).toBe(3);
        expect(sendOrderStatusEmail).not.toHaveBeenCalled();
    });

    test('returns 401 before accessing an order when authentication is absent', async () => {
        const response = await request(app)
            .patch(`/api/orders/${new Order()._id}/cancel`)
            .send({ reason: 'No token' });

        expect(response.status).toBe(401);
        expect(sendOrderStatusEmail).not.toHaveBeenCalled();
    });
});
