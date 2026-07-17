import mongoose from 'mongoose';
import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Utilidades para los tests de integración.
 *
 * `startTestDB` arranca una instancia en memoria de MongoDB y la conecta
 * con Mongoose. Devuelve la función de teardown que cada suite debe llamar
 * en `afterAll` para cerrar la conexión y detener el proceso auxiliar.
 *
 * `clearCollections` vacía todas las colecciones entre tests para que cada
 * caso arranque con un estado limpio sin necesidad de levantar MongoDB otra vez.
 */
let mongod;

export const startTestDB = async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    return async () => {
        await mongoose.disconnect();
        await mongod.stop();
    };
};

export const startTestReplicaSet = async () => {
    mongod = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    await mongoose.connect(mongod.getUri());
    return async () => {
        await mongoose.disconnect();
        await mongod.stop();
    };
};

export const clearCollections = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
};

/**
 * Establece variables de entorno mínimas para que los módulos que las leen
 * en import-time no aborten. Se llama antes de importar `app.js`.
 */
export const setTestEnv = () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-jest-only';
    process.env.EMAIL_HOST = 'smtp.test.local';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'test';
    process.env.EMAIL_PASS = 'test';
    process.env.EMAIL_FROM = 'no-reply@test.local';
    process.env.APP_BASE_URL = 'http://localhost:5173';
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    process.env.CLOUDINARY_CLOUD_NAME = 'test';
    process.env.CLOUDINARY_API_KEY = 'test';
    process.env.CLOUDINARY_API_SECRET = 'test';
};
