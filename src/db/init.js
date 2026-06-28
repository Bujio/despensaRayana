import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

/**
 * Establece la conexión con MongoDB usando Mongoose.
 *
 * La URI se lee de MONGODB_URI2, MONGO_URI o MONGODB_URI para no exponer
 * credenciales en el código fuente.
 * Se llama una sola vez al arrancar el servidor (en index.js).
 *
 * @throws {Error} Si la conexión falla (por URI incorrecta, red, etc.)
 */
export const connectDB = async () => {
    await mongoose.connect(process.env.MONGODB_URI2 || process.env.MONGO_URI || process.env.MONGODB_URI);
    logger.info('Successfully connected to database');
};
