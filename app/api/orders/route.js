import { prisma } from "@/src/db";
import { PaymentMethod } from "@/src/generated/prisma/client";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request) {
  try {
    const { userId, has } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { addressId, items, couponCode, paymentMethod } =
      await request.json();

    if (
      !addressId ||
      !paymentMethod ||
      !items ||
      !Array.isArray(items) ||
      !items.length === 0
    ) {
      if (!userId) {
        return NextResponse.json(
          { error: "missing order details" },
          { status: 400 },
        );
      }
    }

    let coupon = null;

    if (couponCode) {
      coupon = await prisma.coupon.findUnique({
        where: { code: couponCode },
      });
      if (!coupon) {
        return NextResponse.json(
          { error: "Coupon not found" },
          { status: 400 },
        );
      }
    }

    if (couponCode && coupon.forNewUser) {
      const userorders = await prisma.order.findMany({
        where: { userId },
      });

      if (userorders.length > 0) {
        return NextResponse.json(
          { error: "Coupon valid for new users" },
          { status: 400 },
        );
      }
    }

    const isPlusMember = has({ plan: "plus" });
    if (couponCode && coupon.forMember) {
      if (!isPlusMember) {
        return NextResponse.json(
          { error: "Coupon valid for members only" },
          { status: 400 },
        );
      }
    }

    const ordersByStore = new Map();

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.id },
      });
      const storeId = product.storeId;

      if (!ordersByStore.has(storeId)) {
        ordersByStore.set(storeId, []);
      }

      ordersByStore.get(storeId).push({ ...items, price: product.price });
    }

    let orderIds = [];

    let fullAmount = 0;

    let isShippingFeeAdded = false;

    //create orders for each seller
    for (const [storeId, sellerItems] of ordersByStore.entries()) {
      let total = sellerItems.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
      );

      if (couponCode) {
        total -= (total * coupon.discount) / 100;
      }

      if (!isPlusMember && !isShippingFeeAdded) {
        total += 5;
        isShippingFeeAdded = true;
      }

      fullAmount += parseFloat(total.toFixed(2));

      const order = await prisma.order.create({
        data: {
          userId,
          storeId,
          addressId,
          total: parseFloat(total.toFixed(2)),
          paymentMethod,
          isCouponUsed: coupon ? true : false,
          coupon: coupon ? coupon : {},
          orderItems: {
            create: sellerItems.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      });
      orderIds.push(order.id);
    }

    if(paymentMethod === 'STRIPE'){
      const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

      const origin = await request.headers.get('origin')

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data:{
              name: 'Order'
            },
            unit_amount: Math.round(fullAmount * 100)
          },
          quantity:1
        }],
        expire_at: Math.floor(Date.now()/ 1000) + 30 * 60, mode: 'payment', success_url : `${origin}/loading?nextUrl=orders`,
      cancel_url: `${origin}/cart`,

      metadata: {
        orderIds : orderIds.join(','),
        userId,
        appId: 'buybuddy'
      }
      })
      return NextResponse.json({session})
    }

    //clear the cart
    await prisma.user.update({
      where: { id: userId },
      data: { cart: {} },
    });

    return NextResponse.json({ message: "Orders placed successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 },
    );
  }
}

//get all orders for a user
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const orders = await prisma.order.findMany({
      where: {
        userId,
        OR: [
          {
            paymentMethod: PaymentMethod.COD,
          },
          { AND: [{ paymentMethod: PaymentMethod.STRIPE }, { isPaid: true }] },
        ],
      },
      include: {
        orderItems: { include: { product: true } },
        address: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 },
    );
  }
}
