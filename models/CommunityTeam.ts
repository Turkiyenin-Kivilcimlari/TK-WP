import mongoose, { Schema, Document, Model } from 'mongoose';
import { Types } from 'mongoose';

// Ekip kategorileri enum
export enum TeamCategory {
  ORGANIZATIONAL_DEVELOPMENT = "ORGANIZATIONAL_DEVELOPMENT", // Organizasyonel Gelişim Ekibi
  COMMUNITY_MANAGERS = "COMMUNITY_MANAGERS", // Topluluk Yöneticileri
  SOCIAL_MEDIA = "SOCIAL_MEDIA", // Sosyal Medya & Tanıtım Ekibi
  WEBSITE_DEVELOPMENT = "WEBSITE_DEVELOPMENT", // Website Geliştirme Ekibi
  CONTENT = "CONTENT", // İçerik Ekibi
}

export interface ICommunityTeam extends Document {
  name: string; // Kişinin adı
  title: string; // Ünvanı/görevi
  category: TeamCategory; // Hangi ekipte olduğu
  description?: string; // Kişi hakkında kısa açıklama (opsiyonel)
  image: string; // Cloudinary'deki resim URL'i
  order: number; // Sıralama için
  createdAt: Date;
  updatedAt: Date;
}

const CommunityTeamSchema = new Schema<ICommunityTeam>(
  {
    name: {
      type: String,
      required: [true, 'İsim zorunludur'],
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Ünvan zorunludur'],
      trim: true,
    },
    category: {
      type: String,
      enum: Object.values(TeamCategory),
      required: [true, 'Kategori zorunludur'],
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Resim zorunludur'],
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const CommunityTeam = mongoose.models.CommunityTeam || mongoose.model<ICommunityTeam>('CommunityTeam', CommunityTeamSchema);

// CommunityTeam üye arayüzü
export interface ICommunityTeamMember extends Document {
  userId: Types.ObjectId;
  name: string;
  lastname: string;
  title: string;
  avatar?: string;
  photo?: string; // Cloudinary'de saklanan takım üyesi resmi
  university?: string; // Üniversite bilgisi
  universityLogo?: string; // Üniversite logosu (Cloudinary'de saklanan)
  role: string;
  slug?: string;
  order?: number;
  category?: TeamCategory; // Hangi ekipte olduğu
}

// CommunityTeam üye şeması
const CommunityTeamMemberSchema = new Schema<ICommunityTeamMember>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  lastname: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  photo: {
    type: String
  },
  university: {
    type: String
  },
  universityLogo: {
    type: String
  },
  role: {
    type: String,
    required: true
  },
  slug: {
    type: String
  },
  order: {
    type: Number
  }
}, {
  timestamps: true
});

// Client-side model hatalarını önleyen düzeltmeler
let CommunityTeamMember: Model<ICommunityTeamMember>;

// İstemci tarafı ve sunucu tarafı ortamlarını doğru şekilde işle
if (typeof window === "undefined") {
  // Sunucu tarafındayız, modeli güvenle oluşturabiliriz
  try {
    // Modelin zaten tanımlanıp tanımlanmadığını kontrol et
    CommunityTeamMember = mongoose.models.CommunityTeamMember || 
                          mongoose.model<ICommunityTeamMember>("CommunityTeamMember", CommunityTeamMemberSchema);
  } catch (e) {
    // Model tanımlanmamışsa oluştur
    CommunityTeamMember = mongoose.model<ICommunityTeamMember>("CommunityTeamMember", CommunityTeamMemberSchema);
  }
} else {
  // İstemci tarafında, boş bir nesne döndür
  // @ts-ignore - Burayı TypeScript hatalarından kaçınmak için görmezden geliyoruz
  CommunityTeamMember = {} as Model<ICommunityTeamMember>;
}

export { CommunityTeamMember };
