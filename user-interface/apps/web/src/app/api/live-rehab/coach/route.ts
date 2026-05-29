import { NextResponse } from "next/server";

import type { LiveRehabCoachRequest } from "@/lib/live-rehab";

export const runtime = "nodejs";

const DEFAULT_MODEL = "openai/gpt-4o-mini";

function getFallbackAdvice(body: LiveRehabCoachRequest) {
  const latest = body.history.at(-1);
  const isMock = latest?.source === "mock";

  if (!body.isBluetoothConnected && !isMock) {
    return "ยังไม่ได้เชื่อมต่อ Bluetooth กรุณาเชื่อมต่ออุปกรณ์ก่อนเริ่มโหมดโค้ชเสียง";
  }

  if (!latest || latest.sampleCount < 40 || latest.confidence < 0.35) {
    return isMock
      ? "กำลังส่งสัญญาณจำลอง เดินตามจังหวะช้าๆ เพื่อทดสอบโค้ชเสียง"
      : "กำลังเก็บข้อมูลสัญญาณ เดินต่ออีกเล็กน้อยเพื่อให้ระบบอ่านจังหวะได้ชัดขึ้น";
  }

  if (latest.isIdle) {
    return "ตอนนี้ยังไม่พบการเดิน เริ่มถืออุปกรณ์และเดินช้าๆ เพื่อเปิดการติดตาม";
  }

  if (latest.loadControlLabel === "กดมากไป") {
    return "แรงกดที่ด้ามจับสูงกว่าช่วงเป้าหมาย ลองผ่อนแรงที่มือและรักษาจังหวะให้สม่ำเสมอ";
  }

  if (latest.rhythmScore !== null && latest.rhythmScore < 72) {
    return "จังหวะเริ่มไม่สม่ำเสมอ ลองชะลอความเร็วและวางอุปกรณ์ให้เท่ากันในแต่ละก้าว";
  }

  if (latest.fatigueLabel === "ควรพัก") {
    return "สัญญาณบ่งชี้ว่าเริ่มล้า พักสั้นๆ ก่อนเริ่มรอบถัดไป";
  }

  return "จังหวะโดยรวมยังดูต่อเนื่อง คงความเร็วนี้ไว้และอย่ากดน้ำหนักที่มือมากเกินไป";
}

function safeJson(value: unknown) {
  return JSON.stringify(value, null, 2).slice(0, 8_000);
}

export async function POST(request: Request) {
  let body: LiveRehabCoachRequest;

  try {
    body = (await request.json()) as LiveRehabCoachRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.history) || body.history.length === 0) {
    return NextResponse.json(
      { error: "history must contain at least one metric snapshot" },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      text: getFallbackAdvice(body),
      source: "fallback",
    });
  }

  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const siteUrl = process.env.OPENROUTER_SITE_URL ?? "http://localhost:3001";
  const appName = process.env.OPENROUTER_APP_NAME ?? "Moon Walk Live Rehab";
  const maxTokens = Number(process.env.OPENROUTER_MAX_TOKENS ?? 90);

  const systemPrompt =
    process.env.OPENROUTER_LIVE_REHAB_SYSTEM_PROMPT ??
    [
      "You are Moon Walk's Thai live rehabilitation companion.",
      "Your persona is a warm, calm female rehab companion speaking naturally in Thai.",
      "Use only self-referenced, non-medical movement coaching language.",
      "Never diagnose, predict falls, mention disease, or compare the user with a healthy population.",
      "Give one concise Thai instruction that can be spoken aloud in under 12 seconds.",
      "Prefer gentle, practical cues about rhythm, pressure, device setup, data quality, or short rest.",
      "Do not flirt, roleplay intimacy, or use childish language.",
    ].join(" ");

  const latestHistory = body.history.slice(-12);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": siteUrl,
      "X-Title": appName,
    },
    body: JSON.stringify({
      model,
      max_tokens: Number.isFinite(maxTokens) ? maxTokens : 90,
      temperature: Number(process.env.OPENROUTER_TEMPERATURE ?? 0.35),
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            `Device: ${body.deviceLabel}`,
            `Bluetooth connected: ${body.isBluetoothConnected}`,
            `Signal source: ${latestHistory.at(-1)?.source ?? "unknown"}`,
            "Recent metric snapshots over time:",
            safeJson(latestHistory),
            "Return only the Thai sentence to speak.",
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({
      text: getFallbackAdvice(body),
      source: "fallback",
    });
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();

  return NextResponse.json({
    text: text || getFallbackAdvice(body),
    source: text ? "openrouter" : "fallback",
  });
}
