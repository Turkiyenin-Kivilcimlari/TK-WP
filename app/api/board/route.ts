import { NextResponse } from "next/server";
import Board from "@/models/Board";
import { connectToDatabase } from "@/lib/mongodb";
import { encryptedJson } from "@/lib/response";

export async function GET() {
  try {
    await connectToDatabase();

    const boardMembers = await Board.find({}).sort({ createdAt: -1 });

    return encryptedJson({ success: true, boardMembers }, { status: 200 });
  } catch (error) {
    return encryptedJson(
      { success: false, error: "İşlem başarısız" },
      { status: 500 }
    );
  }
}
