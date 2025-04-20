import mongoose from 'mongoose';

let isConnected = false;

export const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  try {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error('MongoDB bağlantı adresi (MONGODB_URI) bulunamadı');
    }

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions;

    await mongoose.connect(MONGODB_URI, options);

    isConnected = true;
  } catch (error) {
    throw error;
  }
};
