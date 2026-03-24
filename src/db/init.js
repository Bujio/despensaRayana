import mongoose from 'mongoose';

export const connectDB = async () => {
    const URL = process.env.MONGODB_URI2;
    await mongoose.connect(URL);
    console.log('Successfully connected to database:', URL);
};
