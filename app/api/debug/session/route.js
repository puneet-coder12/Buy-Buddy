import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { sessionClaims } = auth();
  return NextResponse.json(sessionClaims);
}
