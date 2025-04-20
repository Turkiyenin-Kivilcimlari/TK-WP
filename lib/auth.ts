import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDatabase } from '@/lib/mongodb';
import User, { UserRole } from '@/models/User';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose'; // << BU ÖNEMLİ!
import crypto from 'crypto';

// NextAuth için tip genişletmeleri
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      lastname?: string | null;
      role: UserRole;
      avatar?: string | null;
      requiresTwoFactor?: boolean;
    }
  }
  
  interface User {
    id: string;
    name: string | null;
    lastname?: string | null;
    email: string | null;
    role: UserRole;
    avatar?: string | null;
    requiresTwoFactor?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    name?: string | null;
    email: string | null;
    lastname?: string | null;
    role: UserRole;
    avatar?: string | null;
    requiresTwoFactor?: boolean;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        twoFactorCode: { label: '2FA Code', type: 'text', optional: true }
      },
      async authorize(credentials, req) {
        try {
          if (!credentials) return null;

          // İki faktörlü doğrulama kodunu kontrol et
          if (credentials.twoFactorCode) {
            // 2FA doğrulaması yapıldığında
            await connectToDatabase();
            const user = await User.findOne({ email: credentials.email }).select('+password +twoFactorSecret');

            if (!user) {
              throw new Error("Kullanıcı bulunamadı");
            }

            // Önce şifreyi kontrol et
            const isPasswordValid = await user.comparePassword(credentials.password);
            if (!isPasswordValid) {
              throw new Error("E-posta veya şifre hatalı");
            }

            if (!user.twoFactorEnabled || !user.twoFactorSecret) {
              throw new Error("2FA etkin değil");
            }

            // Doğrulama kodunu kontrol et
            const isValid = await verifyTwoFactorToken(user.twoFactorSecret, credentials.twoFactorCode);
            
            if (!isValid) {
              throw new Error("2FA doğrulama kodu geçersiz");
            }

            // 2FA doğrulandıktan sonra son doğrulama tarihini güncelle
            user.twoFactorVerified = true;
            user.lastTwoFactorVerification = new Date();
            await user.save();

            // 2FA doğrulama başarılı, kullanıcı bilgilerini döndür
            return {
              id: (user._id as Types.ObjectId).toString(),
              name: user.name,
              lastname: user.lastname,
              email: user.email,
              role: user.role,
              avatar: user.avatar || "",
            };
          }

          // Normal giriş işlemi
          const { email, password } = credentials;
          
          await connectToDatabase();
          const user = await User.findOne({ email }).select('+password +twoFactorEnabled +twoFactorSecret');

          if (!user) {
            throw new Error("E-posta veya şifre hatalı");
          }

          const isPasswordValid = await user.comparePassword(password);
          
          if (!isPasswordValid) {
            throw new Error("E-posta veya şifre hatalı");
          }

          // 2FA kontrolü
          if (user.twoFactorEnabled) {
            // 2FA etkin, doğrulama kodu gerekli
            throw new Error("TwoFactorRequired");
          }

          // 2FA etkin değil ya da doğrulama başarılı, email doğrulamasını kontrol et
          if (!user.emailVerified) {
            // E-posta adresini hata mesajına ekle
            throw new Error(`EmailNotVerified|${email}`);
          }

          // Tüm doğrulamalar başarılı, giriş yap
          return {
            id: (user._id as Types.ObjectId).toString(),
            name: user.name,
            lastname: user.lastname,
            email: user.email,
            role: user.role,
            avatar: user.avatar || "",
          };
        } catch (error: any) {
          throw error; // Hataların üst katmanlara aktarılmasını sağlar
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, credentials }) {
      // 2FA kontrol et
      if (credentials && !credentials.twoFactorCode) {
        // Normal giriş
        try {
          await connectToDatabase();
          const dbUser = await User.findOne({ email: credentials.email }).select('+twoFactorEnabled');
          
          // 2FA etkin ve kod girilmemişse, özel bir yanıt döndür
          if (dbUser?.twoFactorEnabled) {
            // Bu URL parametresi ile sayfaya döndüğünde 2FA alanını göstereceğiz
            return `/signin?error=TwoFactorRequired&email=${encodeURIComponent(credentials.email as string)}`;
          }

          if (dbUser && !dbUser.emailVerified) {
            return `/signin?error=EmailNotVerified&email=${encodeURIComponent(credentials.email as string)}`;
          }
        } catch (error: any) {
          return false;
        }
      }
      
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.lastname = user.lastname;
        token.email = user.email;
        token.role = user.role;
        token.avatar = user.avatar || "";

        if (user.requiresTwoFactor) {
          token.requiresTwoFactor = true;
        }
      }

      if (trigger === "update" && session) {
        if (session.user?.name) token.name = session.user.name;
        if (session.user?.lastname) token.lastname = session.user.lastname;
        if (session.user?.email) token.email = session.user.email;
        if (session.user?.role) token.role = session.user.role;
        if (session.user?.avatar !== undefined) {
          token.avatar = session.user.avatar || "";
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.lastname = token.lastname as string;
        session.user.email = token.email as string;
        session.user.role = token.role as UserRole;
        session.user.avatar = token.avatar as string || "";

        if (token.requiresTwoFactor) {
          session.user.requiresTwoFactor = true;
        }
      }
      return session;
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60
  },
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
};

// 2FA doğrulama yardımcı fonksiyonu
// Base32 karakterlerini byte dizisine dönüştürme
function toSecretBytes(secret: string): Buffer {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  const secret_upcase = secret.toUpperCase();
  
  // Base32'den binary'e çevir
  for (let i = 0; i < secret_upcase.length; i++) {
    const val = base32Chars.indexOf(secret_upcase[i]);
    if (val === -1) continue; // Geçersiz karakterleri atla
    bits += val.toString(2).padStart(5, '0');
  }
  
  // Binary'i byte dizisine çevir
  const bytes = [];
  
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.substr(i, 8);
    if (byte.length < 8) continue; // Eksik bitler varsa atla
    bytes.push(parseInt(byte, 2));
  }
  
  return Buffer.from(bytes);
}

// 2FA doğrulama fonksiyonu
async function verifyTwoFactorToken(secret: string, token: string): Promise<boolean> {
  try {
    const cleanToken = token.replace(/\s+/g, '');
    
    // Doğrulama işlemi
    const currentTime = Math.floor(Date.now() / 1000);
    const timeWindow = 30; // 30 saniyelik pencere
    
    // Şimdiki, önceki ve sonraki zaman pencereleri için kontrol et (-1, 0, +1)
    for (let i = -1; i <= 1; i++) {
      const timeCounter = Math.floor(currentTime / timeWindow) + i;
      const hmacData = Buffer.from(timeCounter.toString(16).padStart(16, '0'), 'hex');
      
      // HMAC-SHA1 kullanarak özet oluştur
      const secretBytes = toSecretBytes(secret);
      const hmac = crypto.createHmac('sha1', secretBytes);
      hmac.update(hmacData);
      const digest = hmac.digest();
      
      // Offset hesaplama
      const offset = digest[digest.length - 1] & 0xf;
      
      // Kodu hesapla
      let code = ((digest[offset] & 0x7f) << 24) |
                ((digest[offset + 1] & 0xff) << 16) |
                ((digest[offset + 2] & 0xff) << 8) |
                (digest[offset + 3] & 0xff);
                
      code = code % 1000000;
      const codeStr = code.toString().padStart(6, '0');
      
      // Kullanıcının girdiği kodla karşılaştır
      if (codeStr === cleanToken) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}
