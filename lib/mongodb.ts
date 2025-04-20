import mongoose from "mongoose";

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
    
    // Kullanım dışı olan seçenekleri kaldırıldı (Node.js Driver 4.0.0+ için gerekli değil)
    const options = {} as mongoose.ConnectOptions;
    
    // Şema kayıt sorunlarını önlemek için strictQuery'yi false olarak ayarla
    mongoose.set('strictQuery', false);
    
    await mongoose.connect(MONGODB_URI, options);
    isConnected = true;
    
    // Şema modellerinin doğru yüklenmesini sağla
    require('@/models/User');
    require('@/models/Article');
    require('@/models/Comment');
    require('@/models/Token')
    
  } catch (error) {
    throw error;
  }
};

mongoose.connection.on("error", (err) => {
});

export default connectToDatabase;
