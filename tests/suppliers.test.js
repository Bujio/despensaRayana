import bcrypt from 'bcryptjs';
import { startTestDB, clearCollections, setTestEnv } from './helpers/setup.js';

setTestEnv();

const { default: request } = await import('supertest');
const { app } = await import('../app.js');
const { Category } = await import('../src/db/models/category.model.js');
const { Order } = await import('../src/db/models/order.model.js');
const { User } = await import('../src/db/models/user.model.js');

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

const supplierPayload = (
    email = 'supplier@test.com',
    name = 'Quesería Raya',
) => ({
    name,
    email,
    password: 'Secret123',
    legalName: name + ' SL',
    shortDescription: 'Productos artesanos de Extremadura',
    location: {
        country: 'España',
        region: 'Extremadura',
        province: 'Cáceres',
        town: 'Valencia de Alcántara',
    },
    contact: {
        contactPerson: 'Ana Raya',
        email,
        phone: '+34 600 000 000',
    },
    business: {
        taxName: name + ' SL',
        taxId: 'B12345678',
        invoiceEmail: email,
    },
});

const registerSupplier = async (
    email = 'supplier@test.com',
    name = 'Quesería Raya',
) => {
    const register = await request(app)
        .post('/api/suppliers/register')
        .send(supplierPayload(email, name));
    const login = await request(app).post('/api/auth/login').send({
        email,
        password: 'Secret123',
    });
    return {
        register,
        login,
        token: login.body.accessToken,
        supplier: register.body.supplier,
    };
};

const createAdminToken = async () => {
    await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        password: await bcrypt.hash('Secret123', 10),
        role: 'admin',
    });
    const login = await request(app).post('/api/auth/login').send({
        email: 'admin@test.com',
        password: 'Secret123',
    });
    return login.body.accessToken;
};

describe('Supplier registration and profile', () => {
    test('registers a supplier user with pending_review status and a safe code', async () => {
        const { register } = await registerSupplier();

        expect(register.status).toBe(201);
        expect(register.body.user.role).toBe('supplier');
        expect(register.body.supplier.status).toBe('pending_review');
        expect(register.body.supplier.supplierCode).toMatch(
            /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/,
        );
    });

    test('supplier can login and read own profile', async () => {
        const { token } = await registerSupplier();
        const profile = await request(app)
            .get('/api/suppliers/me')
            .set('Authorization', `Bearer ${token}`);

        expect(profile.status).toBe(200);
        expect(profile.body.userId.role).toBe('supplier');
        expect(profile.body.supplierCode).toHaveLength(6);
    });

    test('supplier cannot write admin-only supplier fields', async () => {
        const { token } = await registerSupplier();
        const update = await request(app)
            .patch('/api/suppliers/me')
            .set('Authorization', `Bearer ${token}`)
            .send({
                supplierCode: 'ABC123',
                status: 'active',
                featured: true,
                internalNotes: 'hidden',
            });

        expect(update.status).toBe(400);
    });
});

describe('Supplier products ownership', () => {
    test('supplier can create and list only own products', async () => {
        const first = await registerSupplier('first@test.com', 'Proveedor Uno');
        const second = await registerSupplier(
            'second@test.com',
            'Proveedor Dos',
        );
        const category = await Category.create({ name: 'Quesos' });

        const created = await request(app)
            .post('/api/products/supplier')
            .set('Authorization', `Bearer ${first.token}`)
            .send({
                name: 'Torta del Casar',
                sku: 'SUP-QSO-001',
                price: 12.5,
                shortDescription: 'Queso artesanal de la Raya',
                stock: 8,
                category: String(category._id),
                status: 'pending_review',
            });

        await request(app)
            .post('/api/products/supplier')
            .set('Authorization', `Bearer ${second.token}`)
            .send({
                name: 'Miel de brezo',
                sku: 'SUP-MIE-001',
                price: 8.4,
                shortDescription: 'Miel artesana de brezo',
                stock: 5,
                category: String(category._id),
                status: 'draft',
            });

        const list = await request(app)
            .get('/api/products/supplier/my')
            .set('Authorization', `Bearer ${first.token}`);

        expect(created.status).toBe(201);
        expect(created.body.status).toBe('pending_review');
        expect(list.status).toBe(200);
        expect(list.body.data.map((product) => product.sku)).toEqual([
            'SUP-QSO-001',
        ]);
    });

    test('supplier cannot edit or delete another supplier product', async () => {
        const first = await registerSupplier('first@test.com', 'Proveedor Uno');
        const second = await registerSupplier(
            'second@test.com',
            'Proveedor Dos',
        );
        const category = await Category.create({ name: 'Aceites' });
        const product = await request(app)
            .post('/api/products/supplier')
            .set('Authorization', `Bearer ${first.token}`)
            .send({
                name: 'Aceite propio',
                sku: 'SUP-ACE-001',
                price: 18,
                shortDescription: 'Aceite de oliva propio',
                stock: 4,
                category: String(category._id),
                status: 'draft',
            });

        const update = await request(app)
            .patch(`/api/products/supplier/${product.body._id}`)
            .set('Authorization', `Bearer ${second.token}`)
            .send({ name: 'Cambio ajeno' });
        const remove = await request(app)
            .delete(`/api/products/supplier/${product.body._id}`)
            .set('Authorization', `Bearer ${second.token}`);

        expect(update.status).toBe(404);
        expect(remove.status).toBe(404);
    });

    test('supplier cannot create categories or access admin routes', async () => {
        const { token } = await registerSupplier();
        const category = await request(app)
            .post('/api/categories')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Nueva categoría' });
        const users = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${token}`);

        expect(category.status).toBe(403);
        expect(users.status).toBe(403);
    });
});

describe('Admin supplier review and supplier reports', () => {
    test('admin can approve and reject suppliers', async () => {
        const adminToken = await createAdminToken();
        const first = await registerSupplier('first@test.com', 'Proveedor Uno');
        const second = await registerSupplier(
            'second@test.com',
            'Proveedor Dos',
        );

        const approve = await request(app)
            .patch(`/api/suppliers/${first.supplier._id}/approve`)
            .set('Authorization', `Bearer ${adminToken}`);
        const reject = await request(app)
            .patch(`/api/suppliers/${second.supplier._id}/reject`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'Datos incompletos' });

        expect(approve.status).toBe(200);
        expect(approve.body.status).toBe('active');
        expect(reject.status).toBe(200);
        expect(reject.body.status).toBe('rejected');
    });

    test('admin can approve a pending supplier product', async () => {
        const adminToken = await createAdminToken();
        const supplier = await registerSupplier();
        const category = await Category.create({ name: 'Pendientes' });

        await request(app)
            .patch(`/api/suppliers/${supplier.supplier._id}/approve`)
            .set('Authorization', `Bearer ${adminToken}`);

        const product = await request(app)
            .post('/api/products/supplier')
            .set('Authorization', `Bearer ${supplier.token}`)
            .send({
                name: 'Queso pendiente',
                price: 12,
                shortDescription: 'Queso artesano pendiente de revisión',
                stock: 4,
                category: String(category._id),
                status: 'pending_review',
            });

        const approve = await request(app)
            .patch(`/api/products/${product.body._id}/approve`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(product.status).toBe(201);
        expect(product.body.status).toBe('pending_review');
        expect(approve.status).toBe(200);
        expect(approve.body.status).toBe('published');
    });

    test('admin can reject a pending product with a reason and supplier can resubmit it', async () => {
        const adminToken = await createAdminToken();
        const supplier = await registerSupplier();
        const category = await Category.create({ name: 'Revisión' });

        await request(app)
            .patch(`/api/suppliers/${supplier.supplier._id}/approve`)
            .set('Authorization', `Bearer ${adminToken}`);

        const product = await request(app)
            .post('/api/products/supplier')
            .set('Authorization', `Bearer ${supplier.token}`)
            .send({
                name: 'Miel para revisar',
                price: 9,
                shortDescription: 'Miel pendiente de revisión',
                stock: 6,
                category: String(category._id),
                status: 'pending_review',
            });

        const reject = await request(app)
            .patch(`/api/products/${product.body._id}/reject`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'Falta una imagen real del producto' });

        const resubmit = await request(app)
            .patch(`/api/products/supplier/${product.body._id}`)
            .set('Authorization', `Bearer ${supplier.token}`)
            .send({
                name: 'Miel para revisar',
                price: 9,
                shortDescription: 'Miel corregida con imagen real',
                stock: 6,
                category: String(category._id),
                status: 'pending_review',
            });

        expect(reject.status).toBe(200);
        expect(reject.body.status).toBe('rejected');
        expect(reject.body.rejectionReason).toBe(
            'Falta una imagen real del producto',
        );
        expect(resubmit.status).toBe(200);
        expect(resubmit.body.status).toBe('pending_review');
        expect(resubmit.body.rejectionReason).toBe('');
    });

    test('inactive or rejected supplier cannot create products', async () => {
        const adminToken = await createAdminToken();
        const supplier = await registerSupplier();
        const category = await Category.create({ name: 'Bloqueados' });
        await request(app)
            .patch(`/api/suppliers/${supplier.supplier._id}/deactivate`)
            .set('Authorization', `Bearer ${adminToken}`);

        const create = await request(app)
            .post('/api/products/supplier')
            .set('Authorization', `Bearer ${supplier.token}`)
            .send({
                name: 'Producto bloqueado',
                sku: 'SUP-BLO-001',
                price: 5,
                shortDescription: 'Producto pendiente bloqueado',
                stock: 1,
                category: String(category._id),
            });

        expect(create.status).toBe(403);
    });

    test('supplier reports include only own product sales', async () => {
        const first = await registerSupplier('first@test.com', 'Proveedor Uno');
        const second = await registerSupplier(
            'second@test.com',
            'Proveedor Dos',
        );
        const category = await Category.create({ name: 'Reportes' });

        const ownProduct = await request(app)
            .post('/api/products/supplier')
            .set('Authorization', `Bearer ${first.token}`)
            .send({
                name: 'Queso propio',
                sku: 'SUP-QSO-002',
                price: 10,
                shortDescription: 'Queso propio para informes',
                stock: 10,
                category: String(category._id),
                status: 'draft',
            });
        await request(app)
            .post('/api/products/supplier')
            .set('Authorization', `Bearer ${second.token}`)
            .send({
                name: 'Miel ajena',
                sku: 'SUP-MIE-002',
                price: 6,
                shortDescription: 'Miel ajena para informes',
                stock: 10,
                category: String(category._id),
                status: 'draft',
            });

        await Order.create({
            email: 'cliente@test.com',
            status: 'pending',
            date: new Date('2026-01-01'),
            products: [
                { sku: ownProduct.body.sku, count: 2, price: 10, total: 20 },
                { sku: 'SUP-MIE-002', count: 3, price: 6, total: 18 },
            ],
            total: 38,
        });

        const sales = await request(app)
            .get('/api/supplier/reports/sales')
            .set('Authorization', `Bearer ${first.token}`);
        const orders = await request(app)
            .get('/api/supplier/orders')
            .set('Authorization', `Bearer ${first.token}`);

        expect(sales.status).toBe(200);
        expect(sales.body.totalRevenueFromOwnProducts).toBe(20);
        expect(sales.body.totalUnitsSoldFromOwnProducts).toBe(2);
        expect(orders.status).toBe(200);
        expect(orders.body.data[0].lines).toHaveLength(1);
        expect(orders.body.data[0].lines[0].sku).toBe('SUP-QSO-002');
    });
});
