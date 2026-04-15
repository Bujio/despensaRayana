import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

/**
 * Establece la conexión con MongoDB usando Mongoose.
 *
 * La URI se lee de la variable de entorno MONGODB_URI2 para no exponer
 * credenciales en el código fuente.
 * Se llama una sola vez al arrancar el servidor (en index.js).
 *
 * @throws {Error} Si la conexión falla (por URI incorrecta, red, etc.)
 */
export const connectDB = async () => {
    await mongoose.connect(process.env.MONGODB_URI2);
    logger.info('Successfully connected to database');
};
