import { NextRequest } from "next/server";
import { authenticateUser, checkAdminAuthWithTwoFactor } from "@/middleware/authMiddleware";
import { UserRole } from "@/models/User";
import { TeamCategory } from "@/models/CommunityTeam";
import { encryptedJson } from "@/lib/response";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Map enum values to Turkish display names
const categoryNames = {
  [TeamCategory.ORGANIZATIONAL_DEVELOPMENT]: "Organizasyonel Gelişim Ekibi",
  [TeamCategory.COMMUNITY_MANAGERS]: "Topluluk Yöneticileri",
  [TeamCategory.SOCIAL_MEDIA]: "Sosyal Medya & Tanıtım Ekibi",
  [TeamCategory.WEBSITE_DEVELOPMENT]: "Website Geliştirme Ekibi",
  [TeamCategory.CONTENT]: "İçerik Ekibi"
};

// Get all available categories
export async function GET(req: NextRequest) {
  try {
    // Admin check with 2FA
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;

    // Normal token check
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { success: false, message: "Giriş yapmalısınız" },
        { status: 401 }
      );
    }

    // Admin permission check
    if (token.role !== UserRole.ADMIN && token.role !== UserRole.SUPERADMIN) {
      return encryptedJson(
        { success: false, message: "Bu işlem için admin yetkisi gereklidir" },
        { status: 403 }
      );
    }
    
    // Format categories for frontend use
    const categories = Object.values(TeamCategory).map(category => ({
      value: category,
      label: categoryNames[category]
    }));
    
    return encryptedJson({ 
      success: true, 
      categories
    });
  } catch (error) {
    return encryptedJson(
      { success: false, message: "Bir hata oluştu" },
      { status: 500 }
    );
  }
}
