import { startTestDB, clearCollections, setTestEnv } from './helpers/setup.js';

setTestEnv();

// Import dinámico tras fijar el entorno: los módulos que leen process.env
// al cargarse (email.js) necesitan ver NODE_ENV=test antes del import.
const { default: request } = await import('supertest');
const { app } = await import('../app.js');

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

describe('POST /api/auth/register', () => {
    test('creates a user and returns 201 with a safe payload', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Ana Test',
            email: 'ana@test.com',
            password: 'Secret123',
        });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({
            name: 'Ana Test',
            email: 'ana@test.com',
        });
        // Campos sensibles nunca deben filtrarse en la respuesta
        expect(res.body.password).toBeUndefined();
        expect(res.body.emailVerificationTokenHash).toBeUndefined();
    });

    test('rejects weak passwords', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Weak',
            email: 'weak@test.com',
            password: 'short',
        });
        expect(res.status).toBe(400);
    });

    test('rejects duplicate emails with 409', async () => {
        const payload = {
            name: 'Dup',
            email: 'dup@test.com',
            password: 'Secret123',
        };
        await request(app).post('/api/auth/register').send(payload);
        const res = await request(app).post('/api/auth/register').send(payload);
        expect(res.status).toBe(409);
    });
});

describe('POST /api/auth/login', () => {
    test('returns tokens for valid credentials', async () => {
        await request(app).post('/api/auth/register').send({
            name: 'Lo Gin',
            email: 'login@test.com',
            password: 'Secret123',
        });

        const res = await request(app).post('/api/auth/login').send({
            email: 'login@test.com',
            password: 'Secret123',
        });

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toEqual(expect.any(String));
        expect(res.body.refreshToken).toEqual(expect.any(String));
        expect(res.body.user.email).toBe('login@test.com');
    });

    test('returns 401 for bad credentials (same message as missing user)', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'nobody@test.com',
            password: 'Whatever123',
        });
        expect(res.status).toBe(401);
    });
});

describe('POST /api/auth/refresh', () => {
    test('rotates refresh token and detects reuse attack', async () => {
        await request(app).post('/api/auth/register').send({
            name: 'Re Fresh',
            email: 'refresh@test.com',
            password: 'Secret123',
        });
        const { body: login } = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'refresh@test.com',
                password: 'Secret123',
            });

        // Primer refresh: el viejo se revoca, devuelve nuevo par.
        const first = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: login.refreshToken });
        expect(first.status).toBe(200);
        expect(first.body.refreshToken).not.toBe(login.refreshToken);

        // Reutilizar el token ya revocado debe dispararse como reuse attack.
        const reuse = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: login.refreshToken });
        expect(reuse.status).toBe(401);

        // Y el nuevo token también queda invalidado por la revocación en cadena.
        const afterReuse = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: first.body.refreshToken });
        expect(afterReuse.status).toBe(401);
    });
});
