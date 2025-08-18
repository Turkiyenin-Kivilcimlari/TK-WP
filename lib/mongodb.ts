import mongoose from "mongoose";
import { safeParseDate } from './utils';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MongoDB URI is not defined in environment variables');
}

/**
 * MongoDB'ye bağlantı için global değişken
 */
declare global {
  var mongooseClient: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

// Geliştirme için global bağlantı değişkeni
let cached = global.mongooseClient;

if (!cached) {
  cached = global.mongooseClient = { conn: null, promise: null };
}

/**
 * MongoDB'ye bağlanma fonksiyonu
 */
export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
    };

    // MongoDB şemalarında tarih dönüşümlerini düzeltmek için
    mongoose.Schema.Types.Date.cast(function(val: any): Date | null | undefined {
      if (val === null || val === undefined) {
      return val;
      }
      return safeParseDate(val);
    });

    cached.promise = mongoose.connect(MONGODB_URI as string, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
