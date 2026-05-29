import { NextResponse } from "next/server";

export const runtime = "nodejs";

type BotnoiGenerateAudioResponse = {
  text?: string;
  audio_url?: string;
  point?: number;
  user_monthly_point?: number;
};

type FreeTtsResponse = {
  file_id?: string;
  error?: string;
  message?: string;
};

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

  const provider = process.env.TTS_PROVIDER ?? "freetts";

  if (provider === "botnoi") {
    return generateBotnoiAudio(text);
  }

  return generateFreeTtsAudio(text);
}

async function generateFreeTtsAudio(text: string) {
  const baseUrl = process.env.FREETTS_BASE_URL ?? "https://freetts.org/api";
  const voice = process.env.FREETTS_VOICE ?? "th-TH-PremwadeeNeural";
  const response = await fetch(`${baseUrl}/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: text.slice(0, 1_000),
      voice,
      rate: process.env.FREETTS_RATE ?? "+0%",
      pitch: process.env.FREETTS_PITCH ?? "+0Hz",
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "FreeTTS audio generation failed" },
      { status: response.status },
    );
  }

  const data = (await response.json()) as FreeTtsResponse;

  if (!data.file_id) {
    return NextResponse.json(
      {
        error:
          data.error ?? data.message ?? "FreeTTS response did not include file_id",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    audioUrl: `${baseUrl}/audio/${data.file_id}`,
    provider: "freetts",
    voice,
  });
}

async function generateBotnoiAudio(text: string) {
  const token = process.env.BOTNOI_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "BOTNOI_TOKEN is not configured" },
      { status: 500 },
    );
  }

  const response = await fetch(
    process.env.BOTNOI_GENERATE_AUDIO_URL ??
      "https://api-voice.botnoi.ai/openapi/v1/generate_audio",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "botnoi-token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        speaker: process.env.BOTNOI_SPEAKER ?? "1",
        volume: Number(process.env.BOTNOI_VOLUME ?? 1),
        speed: Number(process.env.BOTNOI_SPEED ?? 1),
        type_media: process.env.BOTNOI_TYPE_MEDIA ?? "mp3",
        save_file: process.env.BOTNOI_SAVE_FILE ?? "true",
        language: process.env.BOTNOI_LANGUAGE ?? "th",
        page: process.env.BOTNOI_PAGE ?? "user",
      }),
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Botnoi audio generation failed" },
      { status: response.status },
    );
  }

  const data = (await response.json()) as BotnoiGenerateAudioResponse;

  if (!data.audio_url) {
    return NextResponse.json(
      { error: "Botnoi response did not include audio_url" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    audioUrl: data.audio_url,
    point: data.point,
    provider: "botnoi",
    userMonthlyPoint: data.user_monthly_point,
  });
}
