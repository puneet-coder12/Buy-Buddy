import { inngest } from "./client";
import {prisma} from "../src/db";

//Inngest function to save user data to a database

export const syncUserCreation = inngest.createFunction(
  { id: "sync-user-create" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.create({
      data: {
        id: data.id,
        email: data.email_addresses[0]?.email_address || "",
        name: `${data.first_name} ${data.last_name}`,
        image: data.profile_image_url || "",
      },
    });
  },
);

// Inngest funtion to update user data in the database

export const syncUserUpdation = inngest.createFunction(
  { id: "sync-user-update" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.update({
      where: { id: data.id },
      data: {
        email: data.email_addresses[0]?.email_address || "",
        name: `${data.first_name} ${data.last_name}`,
        image: data.profile_image_url || "",
      },
    });
  },
);

//Inngest funct to delete user data from the database

export const syncUserDeletion = inngest.createFunction(
  { id: "sync-user-delete" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.delete({
      where: { id: data.id },
    });
  },
);

//Inggest function to delete coupon on expiry
export const deleteCouponOnExpiry = inngest.createFunction(
  { id: "delete-coupon-on-expiry" },
  { event: "app/coupon.expired" },

  async ({ event, step }) => {
    const { data } = event;

    // 1️⃣ Guard missing value
    if (!data.expires_at) {
      throw new Error("expires_at is missing in event data");
    }

    // 2️⃣ Convert safely
    let expiryDate = new Date(data.expires_at);

    // 3️⃣ Handle unix timestamp in SECONDS
    if (typeof data.expires_at === "number") {
      expiryDate = new Date(data.expires_at * 1000);
    }

    // 4️⃣ Final validation
    if (isNaN(expiryDate.getTime())) {
      throw new Error(`Invalid expiry date: ${data.expires_at}`);
    }

    // ✅ Now this is 100% safe
    await step.sleepUntil("wait-for-expiry", expiryDate);

    await step.run("delete-coupon-from-database", async () => {
      await prisma.coupon.deleteMany({
        where: {
          code: data.code,
        },
      });
    });
  }
);
