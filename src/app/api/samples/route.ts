import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    samples: [
      { title: "Cosmic Journey", artist: "Demo" },
      { title: "Deep Space", artist: "Demo" },
    ],
  });
}
