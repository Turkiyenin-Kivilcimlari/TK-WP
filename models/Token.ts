import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export enum TokenType {
  RESET_PASSWORD = 'reset_password',
  VERIFY_EMAIL = 'verify_email'
}

export interface IToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  type: TokenType;
  createdAt: Date;
  expiresAt: Date;
  otpHash?: string | null;
}

const TokenSchema = new Schema<IToken>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: Object.values(TokenType),
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  otpHash: {
    type: String,
    default: null
  }
});

// Endeksleme
TokenSchema.index({ token: 1 });
TokenSchema.index({ userId: 1, type: 1 });
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL indeksi, süresi dolmuş tokenları otomatik siler

// Helper fonksiyonlar
TokenSchema.statics.generatePasswordResetToken = async function(userId: mongoose.Types.ObjectId | string) {
  const token = crypto.randomBytes(32).toString('hex');
  
  // userId'yi ObjectId'ye dönüştür (eğer string ise)
  const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  
  // Var olan token'ı kaldır
  await this.deleteMany({ userId: userObjectId, type: TokenType.RESET_PASSWORD });
  
  // Yeni token oluştur (5 dakika geçerli)
  const resetToken = await this.create({
    userId: userObjectId,
    token,
    type: TokenType.RESET_PASSWORD,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 dakika
  });
  
  return resetToken.token;
};

TokenSchema.statics.generateEmailVerificationToken = async function(userId: Types.ObjectId): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 saat geçerli
  
  // userId'nin doğru bir ObjectId olduğundan emin ol
  let userObjectId;
  if (typeof userId === 'string') {
    userObjectId = new Types.ObjectId(userId);
  } else {
    userObjectId = userId;
  }

  await this.create({
    userId: userObjectId,
    token,
    type: TokenType.VERIFY_EMAIL,
    expiresAt
  });
  
  return token;
};

TokenSchema.methods.verifyOtp = async function(otp: string): Promise<boolean> {
  
  if (!this.otpHash) {
    return false;
  }
  
  try {
    // bcrypt ile karşılaştır
    const result = await bcrypt.compare(otp, this.otpHash);
    return result;
  } catch (error) {
    return false;
  }
};

interface TokenModel extends Model<IToken> {
  generatePasswordResetToken(userId: mongoose.Types.ObjectId): Promise<string>;
  generateEmailVerificationToken(userId: mongoose.Types.ObjectId): Promise<string>;
}

// Check if the model exists first to prevent OverwriteModelError in development
export default (mongoose.models.Token as TokenModel) || mongoose.model<IToken, TokenModel>('Token', TokenSchema);
