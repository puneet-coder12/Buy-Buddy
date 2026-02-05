import authAdmin from "@/middleware/authAdmin";
import { prisma } from "@/src/db";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

//toggle store isActive status
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const isAdmin = await authAdmin(userId);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeId } = await request.json();

    if( !storeId ){
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
    }

    //find store
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if(!store){
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    //toggle isActive status
    await prisma.store.update({
      where: { id: storeId },
      data: { isActive: !store.isActive },
    });

    return NextResponse.json({ message: "Store Updated Successfully" }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 },
    );
  }
}