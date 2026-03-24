import { configDotenv } from 'dotenv';
import { app } from './app.js';
import { connectDB } from './src/db/init.js';
configDotenv();

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
