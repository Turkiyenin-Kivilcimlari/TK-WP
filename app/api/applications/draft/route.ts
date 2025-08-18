import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Application from "@/models/Application";
import { authenticateUser } from "@/middleware/authMiddleware";
import { encryptedJson } from "@/lib/response";

// Fetch the user's draft application
export async function GET(req: NextRequest) {
  try {
    const token = await authenticateUser(req);

    if (!token || typeof token === "string") {
      return encryptedJson(
        { success: false, message: "Giriş yapmalısınız" },
        { status: 401 }
      );
    }

    const userId = token.id;

    await connectToDatabase();

    // Find the user's draft application
    // Note: Check both isDraft=true and status='draft' for compatibility with both methods
    const draft = await Application.findOne({
      userId,
      $or: [{ isDraft: true }, { status: "draft" }],
    }).sort({ updatedAt: -1 });

    return encryptedJson(
      {
        success: true,
        draft,
      },
      { status: 200 }
    );
  } catch (error) {
    return encryptedJson(
      {
        success: false,
        message: "Taslak başvuru bilgileri alınırken bir hata oluştu",
      },
      { status: 500 }
    );
  }
}
