export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/models/User";

// Check if user has backup permissions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        error: "Unauthorized", 
        permissions: { canView: false, canManage: false, canDownload: false } 
      }, { status: 401 });
    }
    
    // SuperAdmin has all permissions
    if (session.user.role === UserRole.SUPERADMIN) {
      return NextResponse.json({
        permissions: {
          canView: true,
          canManage: true,
          canDownload: true
        }
      });
    }
    
    // For admins, we'll check the database directly in the actual page routes
    // This endpoint just does a basic auth check for middleware
    if (session.user.role === UserRole.ADMIN) {
      return NextResponse.json({
        permissions: {
          isAdmin: true
        }
      });
    }
    
    // Other roles have no permissions
    return NextResponse.json({
      permissions: {
        canView: false,
        canManage: false,
        canDownload: false
      }
    });
  } catch (error) {
    console.error('Permission check error:', error);
    return NextResponse.json({ 
      error: "Internal server error", 
      permissions: { canView: false, canManage: false, canDownload: false } 
    }, { status: 500 });
  }
}
