import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const ALLOWED_SECRETS = {
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  SERVER_URL: process.env.SERVER_URL,
};

export async function GET(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json(
      { error: "Missing key parameter" },
      { status: 400 }
    );
  }

  if (!(key in ALLOWED_SECRETS)) {
    return NextResponse.json(
      { error: "Unknown secret" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    key,
    value: ALLOWED_SECRETS[key],
  });
}
