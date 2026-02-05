import authAdmin from "@/middleware/authAdmin";
import { prisma } from "@/src/db";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

//get all approved stores
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const isAdmin = await authAdmin(userId);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stores = await prisma.store.findMany({
      where: { status: 'approved' },
      include: { user: true },
    });

    return NextResponse.json({ stores }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 },
    );
  }
}