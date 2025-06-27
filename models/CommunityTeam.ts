import mongoose, { Schema, Document, Model } from 'mongoose';
import { Types } from 'mongoose';

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
