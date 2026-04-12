import mongoose from 'mongoose';

export const connectDB = async () => {
    await mongoose.connect(process.env.MONGODB_URI2);
    console.log('Successfully connected to database');
};
