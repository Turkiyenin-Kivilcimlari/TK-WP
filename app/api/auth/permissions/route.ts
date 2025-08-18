export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/models/User";
import { encryptedJson } from "@/lib/response";

// Check if user has backup permissions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return encryptedJson(
        {
          error: "Unauthorized",
          permissions: { canView: false, canManage: false, canDownload: false },
        },
        { status: 401 }
      );
    }

    // SuperAdmin has all permissions
    if (session.user.role === UserRole.SUPERADMIN) {
      return encryptedJson({
        permissions: {
          canView: true,
          canManage: true,
          canDownload: true,
        },
      });
    }

    // For admins, we'll check the database directly in the actual page routes
    // This endpoint just does a basic auth check for middleware
    if (session.user.role === UserRole.ADMIN) {
      return encryptedJson({
        permissions: {
          isAdmin: true,
        },
      });
    }

    // Other roles have no permissions
    return encryptedJson({
      permissions: {
        canView: false,
        canManage: false,
        canDownload: false,
      },
    });
  } catch (error) {
    return encryptedJson(
      {
        error: "Internal server error",
        permissions: { canView: false, canManage: false, canDownload: false },
      },
      { status: 500 }
    );
  }
}
