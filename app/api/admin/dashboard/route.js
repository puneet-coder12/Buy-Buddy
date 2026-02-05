import authAdmin from "@/middleware/authAdmin";
import { prisma } from "@/src/db";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

//Get dashboard data for admin (total orders, total users, total stores, total revenue, total products)
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        //get total orders
        const orders = await prisma.order.count();

        //get total stores
        const stores = await prisma.store.count();

        //get all orderes include only createdAt and totalPrice
        const allOrders = await prisma.order.findMany({
            select: {
                createdAt: true,
                total: true,
            }
        })

        let totalRevenue = 0;
        allOrders.forEach(order => {
            totalRevenue += order.total;
        })

        const revenue = totalRevenue.toFixed(2);

        //get total products
        const products = await prisma.product.count();

        //get total users
        const users = await prisma.user.count();

        const dashboardData = {
            orders,
            stores,
            revenue,
            products,
            users,
            allOrders
        }

        return NextResponse.json({ dashboardData }, { status: 200 }); 
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: error.code || error.message },
            { status: 400 },
        );
        
    }
}