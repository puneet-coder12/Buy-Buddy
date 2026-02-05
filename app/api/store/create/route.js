import imagekit from "@/configs/imageKit";
import { prisma } from "@/src/db";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

//create the store
export async function POST(request) {
  try {
    const { userId } = getAuth(request);

    //get the data from the form
    const formData = await request.formData();
    const name = formData.get("name");
    const username = formData.get("username");
    const email = formData.get("email");
    const contact = formData.get("contact");
    const address = formData.get("address");
    const description = formData.get("description");
    const image = formData.get("image");

    if (
      !name ||
      !username ||
      !email ||
      !contact ||
      !address ||
      !description ||
      !image
    ) {
      return NextResponse.json(
        { error: "missing store info" },
        { status: 400 },
      );
    }

    const store = await prisma.store.findFirst({
      where: {
        userId: userId,
      },
    });

    //if store already exists, return error

    if (store) {
      return NextResponse.json(
        { error: "Store already exists" },
        { status: store.status },
      );
    }

    const isUsernameTaken = await prisma.store.findFirst({
      where: {
        username: username,
      },
    });

    if (isUsernameTaken) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 400 },
      );
    }

    //image upload to imagekit
    const buffer = Buffer.from(await image.arrayBuffer());
    const response = await imagekit.upload({
      file: buffer,
      fileName: image.name,
      folder: "logos",
    });

    const optimizedImage = imagekit.url({
      path: response.filePath,
      src: response.url,
      transformation: [
        {
          width: "512",
          quality: "auto",
        },
        {
          format: "webp",
        },
      ],
    });

    const newStore = await prisma.store.create({
      data: {
        userId: userId,
        name: name,
        username: username.toLowerCase(),
        description: description,
        email: email,
        contact: contact,
        address: address,
        logo: optimizedImage,
      },
    });

    //link store to user
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        store: {
          connect: { id: newStore.id },
        },
      },
    });

    return NextResponse.json({ message: "Applied, waiting for approval" });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 },
    );
  }
}

//check is user have already registered a store if yes then send status of store

export async function GET(request) {
  try {
    const { userId } = getAuth(request);

    const store = await prisma.store.findFirst({
      where: {
        userId: userId,
      },
    });

    //if store already exists, return error

    if (store) {
      return NextResponse.json(
        { status: store.status },
      );
    }

    return NextResponse.json({status: "Not registered" });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 },
    );
  }
}
