// Importamos dotenv/config ANTES que ningún otro módulo para garantizar
// que process.env ya tiene todas las variables cuando los módulos se
// inicialicen (algunos, como email.js, leen env vars al importarse).
import 'dotenv/config';
import { validateEnv } from './src/utils/env.js';

// Validamos las variables de entorno antes de importar app.js/init.js,
// para fallar rápido con un mensaje claro si falta alguna.
validateEnv();

const { app } = await import('./app.js');
const { connectDB } = await import('./src/db/init.js');

//Listen APP
const PORT = process.env.PORT ?? 3000;
const HOST = process.env.HOST;

try {
    await connectDB();
    const server = app.listen(PORT, () =>
        console.log(`Server listening on http://${HOST}:${PORT}`),
    );

    // Graceful shutdown: al recibir SIGTERM/SIGINT cerramos primero el servidor
    // HTTP (deja de aceptar peticiones pero termina las en curso) y luego
    // la conexión de Mongoose. Si algo tarda más de 10s abortamos duro.
    const shutdown = async (signal) => {
        console.log(`\n${signal} received, shutting down gracefully...`);

        const forceExit = setTimeout(() => {
            console.error('Graceful shutdown timed out, forcing exit');
            process.exit(1);
        }, 10_000);

        server.close(async () => {
            const mongoose = (await import('mongoose')).default;
            await mongoose.connection.close();
            clearTimeout(forceExit);
            console.log('Shutdown complete');
            process.exit(0);
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
} catch (error) {
    // Si la BD no conecta, abortamos el proceso para que el orquestador
    // (PM2, Docker, Kubernetes) pueda detectarlo y reiniciar el servicio.
    console.error('Error connecting to database:', error);
    process.exit(1);
}
