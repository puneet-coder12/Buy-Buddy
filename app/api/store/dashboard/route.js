import authSeller from "@/middleware/authSeller";
import { prisma } from "@/src/db";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

//Get dashboard info for store owner(total orders, total revenue, total products)
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const storeId = await authSeller(userId);

    //get all orders for the store
    const orders = await prisma.order.findMany({
      where: { storeId },
    });

    //get all products with ratings for the store
    const products = await prisma.product.findMany({
      where: { storeId },
    });

    const ratings = await prisma.rating.findMany({
      where: {
        productId: { in: products.map((product) => product.id) },
      },
      include: { user: true, product: true },
    });

    const dashboardData = {
      totalOrders: orders.length,
      totalRevenue: Math.round(
        orders.reduce((acc, order) => acc + order.total, 0),
      ),
      totalProducts: products.length,
      ratings,
    };

    return NextResponse.json({ dashboardData }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 },
    );
  }
}
