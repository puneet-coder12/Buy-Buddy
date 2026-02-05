import { inngest } from "@/inngest/client";
import authAdmin from "@/middleware/authAdmin";
import { prisma } from "@/src/db";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

//add new coupon
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const isAdmin = await authAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { coupon } = await request.json();
    coupon.code = coupon.code.toUpperCase();

    await prisma.coupon
      .create({
        data: coupon,
      })
      .then(async (coupon) => {
        await inngest.send({
          name: "app/coupon.expired",
          data: {
            code: coupon.code,
            exprires_at: coupon.expiresAt,
          },
        });
      });

    return NextResponse.json(
      { message: "Coupon created successfully" },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 },
    );
  }
}

//delete coupon /api/coupon?id=couponId
export async function DELETE(request) {
  try {
    const { userId } = getAuth(request);
    const isAdmin = await authAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");
    await prisma.coupon.delete({
      where: { code: code },
    });

    return NextResponse.json(
      { message: "Coupon deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 },
    );
  }
}

//get all coupons
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const isAdmin = await authAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const coupons = await prisma.coupon.findMany({});

    return NextResponse.json({ coupons }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 },
    );
  }
}
