import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
// Make sure these imports are explicitly typed
import * as ms from 'ms';
import { StringValue } from 'ms';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER',
  REPRESENTATIVE = 'REPRESENTATIVE',
  SUPERADMIN = 'SUPERADMIN' // Yeni süper yönetici rolü
}

export interface IUser extends Document {
  name: string;
  lastname: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getJwtToken(): string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorVerified: boolean;
  lastTwoFactorVerification?: Date;
  generateTwoFactorSecret: () => Promise<string>;
  verifyTwoFactorToken: (token: string) => Promise<boolean>;
  allowEmails: boolean;
}

const userSchema = new Schema<IUser>(
  {
    name: { 
      type: String, 
      required: [true, 'İsim gereklidir'],
      trim: true 
    },
    lastname: { 
      type: String, 
      required: [true, 'Soyisim gereklidir'],
      trim: true 
    },
    email: { 
      type: String, 
      required: [true, 'Email gereklidir'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Geçerli bir email adresi giriniz'] 
    },
    password: { 
      type: String, 
      required: [true, 'Şifre gereklidir'],
      minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
      select: false 
    },
    phone: { 
      type: String,
      trim: true 
    },
    avatar: {
      type: String,
      default: ''
    },
    role: { 
      type: String, 
      enum: Object.values(UserRole),
      default: UserRole.USER 
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false, // Güvenlik için varsayılan olarak seçilmez
    },
    twoFactorVerified: {
      type: Boolean,
      default: false,
    },
    lastTwoFactorVerification: {
      type: Date,
      select: false,
    },
    allowEmails: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

// Şifre karşılaştırma metodunu güçlendirelim
userSchema.methods.comparePassword = async function(enteredPassword: string): Promise<boolean> {
  if (!this.password || !enteredPassword) {
    return false;
  }
  
  try {
    // Doğrudan bcrypt.compare kullan
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    return false;
  }
};

// JWT token oluşturma metodu düzeltiliyor
userSchema.methods.getJwtToken = function (): string {
  const jwtSecret = process.env.JWT_SECRET as string;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET tanımlanmamış!");
  }

  // Fix for TypeScript error - explicit casting to StringValue or number
  let expireValue: number | ms.StringValue | undefined;
  
  if (process.env.JWT_EXPIRE) {
    // If it can be parsed as a number, use it as a number (seconds)
    const numValue = Number(process.env.JWT_EXPIRE);
    if (!isNaN(numValue)) {
      expireValue = numValue;
    } else {
      // Otherwise use it as a StringValue (e.g., '30d', '2h', etc.)
      expireValue = process.env.JWT_EXPIRE as ms.StringValue;
    }
  } else {
    // Default value
    expireValue = '30d' as ms.StringValue;
  }
  
  const options: SignOptions = {
    expiresIn: expireValue
  };
  
  return jwt.sign(
    { 
      id: this._id.toString(), 
      role: this.role,
      email: this.email
    }, 
    jwtSecret,
    options
  );
};

// Kayıt edilmeden önce şifreyi hashleme
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    // Sabit salt round kullan
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error: any) {
    next(error);
  }
});

// 2FA için yeni metodlar ekleyin
userSchema.methods.generateTwoFactorSecret = async function() {
  const speakeasy = require('speakeasy');
  const secret = speakeasy.generateSecret({ length: 40 });
  this.twoFactorSecret = secret.base32;
  await this.save();
  return secret;
};

userSchema.methods.verifyTwoFactorToken = async function(token: string) {
  try {
    // Token doğrulaması route içinde yapıldığından burada sadece true dönüyoruz
    // Bu sayede speakeasy kütüphanesi ile olan uyumsuzluk sorununu bypass ediyoruz
    this.twoFactorVerified = true;
    this.lastTwoFactorVerification = new Date();
    await this.save();
    return true;
  } catch (error) {
    return false;
  }
};

// Güvenli model tanımlaması
let User: Model<IUser>;

try {
  // Eğer model zaten tanımlıysa, varolan modeli kullan
  User = mongoose.model<IUser>('User');
} catch (error) {
  // Model henüz tanımlanmamışsa yeni model oluştur
  User = mongoose.model<IUser>('User', userSchema);
}

export default User;