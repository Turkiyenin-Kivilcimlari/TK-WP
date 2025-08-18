import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { encryptedJson } from '@/lib/response';
import { checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import Supporter from '@/models/Supporter';

// Dynamic rendering
export const dynamic = 'force-dynamic';

// Get specific supporter
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin authentication check
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;

    await connectToDatabase();
    
    const { id } = params;
    if (!id) {
      return encryptedJson(
        { success: false, message: "Destekçi ID'si eksik" },
        { status: 400 }
      );
    }

    const supporter = await Supporter.findById(id);
    if (!supporter) {
      return encryptedJson(
        { success: false, message: "Destekçi bulunamadı" },
        { status: 404 }
      );
    }

    return encryptedJson({ success: true, supporter });
  } catch (error) {
    return encryptedJson(
      { success: false, message: "Destekçi getirilemedi" },
      { status: 500 }
    );
  }
}

// Update supporter
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin authentication check
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;

    await connectToDatabase();
    
    const { id } = params;
    if (!id) {
      return encryptedJson(
        { success: false, message: "Destekçi ID'si eksik" },
        { status: 400 }
      );
    }

    const body = await req.json();
    
    // Check if the supporter exists
    const existingSupporter = await Supporter.findById(id);
    if (!existingSupporter) {
      return encryptedJson(
        { success: false, message: "Destekçi bulunamadı" },
        { status: 404 }
      );
    }
    
    // Prepare update data
    const updateData = {
      name: body.name,
      title: body.title,
      photo: body.photo,
    };

    // Update supporter
    const updatedSupporter = await Supporter.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedSupporter) {
      return encryptedJson(
        { success: false, message: "Destekçi güncellenemedi" },
        { status: 404 }
      );
    }

    return encryptedJson({
      success: true,
      message: "Destekçi başarıyla güncellendi",
      supporter: updatedSupporter,
    });
  } catch (error) {
    return encryptedJson(
      { success: false, message: "Destekçi güncellenemedi" },
      { status: 500 }
    );
  }
}

// Delete supporter
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin authentication check
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;

    await connectToDatabase();
    
    const { id } = params;
    if (!id) {
      return encryptedJson(
        { success: false, message: "Destekçi ID'si eksik" },
        { status: 400 }
      );
    }

    // Delete supporter
    const deletedSupporter = await Supporter.findByIdAndDelete(id);
    if (!deletedSupporter) {
      return encryptedJson(
        { success: false, message: "Destekçi bulunamadı" },
        { status: 404 }
      );
    }

    return encryptedJson({
      success: true,
      message: "Destekçi başarıyla silindi",
    });
  } catch (error) {
    return encryptedJson(
      { success: false, message: "Destekçi silinemedi" },
      { status: 500 }
    );
  }
}
