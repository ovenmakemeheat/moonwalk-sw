import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { EdgeTTS } from "node-edge-tts";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VOICE = process.env.EDGE_TTS_VOICE ?? "th-TH-PremwadeeNeural";
const RATE = process.env.EDGE_TTS_RATE ?? "+0%";
const PITCH = process.env.EDGE_TTS_PITCH ?? "+0%";

export async function POST(request: Request) {
  let body: { text?: string };

  try {
    body = (await request.json()) as { text?: string };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 },
    );
  }

  const text = body.text?.trim();

  if (!text) {
    return NextResponse.json(
      { error: "text is required" },
      { status: 400 },
    );
  }

  const tmpFile = join(tmpdir(), `edge-tts-${randomUUID()}.mp3`);

  try {
    const tts = new EdgeTTS({
      voice: VOICE,
      lang: "th-TH",
      outputFormat: "audio-24khz-48kbitrate-mono-mp3",
      rate: RATE,
      pitch: PITCH,
    });

    await tts.ttsPromise(text.slice(0, 1_000), tmpFile);

    const audioBuffer = await readFile(tmpFile);

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.length),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Edge TTS audio generation failed",
      },
      { status: 502 },
    );
  } finally {
    unlink(tmpFile).catch(() => {});
  }
}
