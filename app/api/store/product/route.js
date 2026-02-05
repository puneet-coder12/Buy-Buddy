import { getAuth } from "@clerk/nextjs/server";
import authSeller from "@/middleware/authSeller";
import { NextResponse } from "next/server";
import imagekit from "@/configs/imageKit";
import { prisma } from "@/src/db";

//add a new product to the database
export async function POST(request) {
  try {
    const { userId } = getAuth(request);

    const storeId = await authSeller(userId);

    if (!storeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    //get the data from the form
    const formData = await request.formData();
    const name = formData.get("name");
    const description = formData.get("description");
    const price = Number(formData.get("price"));
    const mrp = Number(formData.get("mrp"));
    const category = formData.get("category");
    const images = formData.getAll("images");

    if (
      !name ||
      !description ||
      !price ||
      !mrp ||
      !category ||
      images.length === 0
    ) {
      return NextResponse.json(
        { error: "missing product info" },
        { status: 400 },
      );
    }

    //upload Images to imagekit
    const imagesUrl = await Promise.all(
      images.map(async (image) => {
        const buffer = Buffer.from(await image.arrayBuffer());
        const response = await imagekit.upload({
          file: buffer,
          fileName: image.name,
          folder: "products",
        });
        const url = imagekit.url({
          path: response.filePath,
          transformation: [{ width: "1024", quality: "auto", format: "webp" }],
        });
        return url;
      }),
    );

    await prisma.product.create({
      data: {
        name,
        description,
        mrp,
        price,
        category,
        images: imagesUrl,
        storeId: storeId,
      },
    });

    return NextResponse.json(
      { message: "Product created successfully" },
      { status: 201 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: error.code || error.message },
      { status: 500 },
    );
  }
}

//get all products of a store
export async function GET(request) {
  try {
    const { userId } = getAuth(request);

    const storeId = await authSeller(userId);

    if (!storeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: { storeId: storeId },
    });

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { error: error.code || error.message },
      { status: 500 },
    );
  }
}
