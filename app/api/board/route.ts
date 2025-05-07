import { NextResponse } from "next/server";
import  Board  from "@/models/Board";
import dbConnect from "@/lib/mongodb";

export async function GET() {
  try {
    await dbConnect();
    
    const boardMembers = await Board.find({}).sort({ createdAt: -1 });
    
    return NextResponse.json({ success: true, boardMembers }, { status: 200 });
  } catch (error) {
    console.error("Board üyeleri alınırken hata:", error);
    return NextResponse.json({ success: false, error: "İşlem başarısız" }, { status: 500 });
  }
}
