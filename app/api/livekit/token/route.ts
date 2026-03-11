import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room");
  const username = req.nextUrl.searchParams.get("username");
  const isHost = req.nextUrl.searchParams.get("isHost") === "true";

  if (!room) {
    return NextResponse.json(
      { error: 'Missing "room" query parameter' },
      { status: 400 },
    );
  }
  if (!username) {
    return NextResponse.json(
      { error: 'Missing "username" query parameter' },
      { status: 400 },
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json(
      { 
        error: "Server misconfigured",
        details: "Missing LiveKit environment variables. Please set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and NEXT_PUBLIC_LIVEKIT_URL in the Secrets panel."
      },
      { status: 500 },
    );
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: username,
    // Token to expire after 10 minutes
    ttl: "10m",
  });

  at.addGrant({
    roomJoin: true,
    room,
    canPublish: isHost,
    canSubscribe: true,
    canPublishData: true,
  });

  return NextResponse.json({ token: await at.toJwt() });
}
