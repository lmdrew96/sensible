import { NextResponse } from "next/server";

const ADMIN_AUTH_COOKIE = "admin_auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(ADMIN_AUTH_COOKIE);
  return response;
}
