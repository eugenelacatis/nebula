import { readdir } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public", "audio");
    const files = await readdir(dir);
    const audio = files.filter((f) => /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(f));
    return NextResponse.json(audio);
  } catch {
    return NextResponse.json([]);
  }
}
