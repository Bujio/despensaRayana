// Importamos dotenv/config ANTES que ningún otro módulo para garantizar
// que process.env ya tiene todas las variables cuando los módulos se
// inicialicen (algunos, como email.js, leen env vars al importarse).
import 'dotenv/config';
import { app } from './app.js';
import { connectDB } from './src/db/init.js';

//Listen APP
const PORT = process.env.PORT ?? 3000;
const HOST = process.env.HOST;

try {
    await connectDB();
    app.listen(PORT, () =>
        console.log(`Server listening on http://${HOST}:${PORT}`),
    );
} catch (error) {
    console.error('Error connecting to database:', error);
}
