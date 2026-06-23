"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Megaphone, Pause, Play, Radio } from "lucide-react";

import { GridPanel } from "@/components/moonwalk/panel";
import type { BiofeedbackMetrics } from "@/lib/biofeedback-metrics";
import {
  createLiveRehabSnapshot,
  createMockLiveRehabSnapshot,
  type LiveRehabCoachResponse,
  type LiveRehabMetricSnapshot,
} from "@/lib/live-rehab";
import { cn } from "@user-interface/ui/lib/utils";

const SNAPSHOT_INTERVAL_MS = 5_000;
const COACH_INTERVAL_MS = 20_000;
const MAX_HISTORY = 36;

async function postJson<TResponse>(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  return (await response.json()) as TResponse;
}

export function LiveRehabMode({
  deviceLabel,
  isBluetoothConnected,
  metrics,
}: {
  deviceLabel: string;
  isBluetoothConnected: boolean;
  metrics: BiofeedbackMetrics;
}) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [history, setHistory] = useState<LiveRehabMetricSnapshot[]>([]);
  const [lastCoachText, setLastCoachText] = useState(
    "เปิดโหมดเพื่อให้โค้ชเสียงอ่านสัญญาณย้อนหลังและแนะนำแบบสด",
  );
  const [statusText, setStatusText] = useState("พร้อมใช้งาน");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const latestMetricsRef = useRef(metrics);
  const latestHistoryRef = useRef(history);
  const isRequestingRef = useRef(false);
  const mockIndexRef = useRef(0);

  const speakWithEdgeTts = async (text: string, onDone?: () => void) => {
    setStatusText("กำลังสร้างเสียง");
    const response = await fetch("/api/live-rehab/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      setStatusText("สร้างเสียงไม่สำเร็จ");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audioRef.current?.pause();
    audioRef.current = audio;
    audio.preload = "auto";
    audio.onplay = () => {
      setIsSpeaking(true);
      setStatusText("กำลังพูด");
    };
    audio.onended = () => {
      setIsSpeaking(false);
      URL.revokeObjectURL(url);
      onDone?.();
    };
    audio.onerror = () => {
      setIsSpeaking(false);
      URL.revokeObjectURL(url);
      setStatusText("เล่นเสียงไม่สำเร็จ");
    };
    await audio.play().catch(() => {
      setIsSpeaking(false);
      URL.revokeObjectURL(url);
      setStatusText("เบราว์เซอร์บล็อกเสียง กดทดสอบเสียงอีกครั้ง");
    });
  };

  useEffect(() => {
    latestMetricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    latestHistoryRef.current = history;
  }, [history]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const capture = () => {
      const snapshot = isBluetoothConnected
        ? createLiveRehabSnapshot(latestMetricsRef.current)
        : createMockLiveRehabSnapshot(mockIndexRef.current);

      if (!isBluetoothConnected) {
        mockIndexRef.current += 1;
      }

      setHistory((current) => [...current.slice(-(MAX_HISTORY - 1)), snapshot]);
    };

    capture();
    const timer = window.setInterval(capture, SNAPSHOT_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isBluetoothConnected, isEnabled]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const speak = async () => {
      if (isRequestingRef.current) {
        return;
      }

      const currentHistory = latestHistoryRef.current;

      if (currentHistory.length === 0) {
        return;
      }

      isRequestingRef.current = true;
      setIsSpeaking(true);
      setStatusText("กำลังวิเคราะห์สัญญาณ");

      try {
        const coach = await postJson<LiveRehabCoachResponse>(
          "/api/live-rehab/coach",
          {
            deviceLabel,
            isBluetoothConnected,
            history: currentHistory,
          },
        );
        setLastCoachText(coach.text);
        setStatusText(
          coach.source === "openrouter"
            ? "กำลังพูด"
            : "ใช้คำแนะนำสำรอง",
        );

        await speakWithEdgeTts(coach.text, () => {
          setStatusText(
            isBluetoothConnected ? "กำลังฟังสัญญาณ" : "ใช้สัญญาณจำลอง",
          );
        });
      } catch {
        setIsSpeaking(false);
        setStatusText("โค้ชเสียงยังไม่พร้อม ตรวจ OpenRouter หรือเครือข่าย");
      } finally {
        isRequestingRef.current = false;
      }
    };

    const startTimer = window.setTimeout(speak, 1_000);
    const timer = window.setInterval(speak, COACH_INTERVAL_MS);

    return () => {
      window.clearTimeout(startTimer);
      window.clearInterval(timer);
    };
  }, [deviceLabel, isBluetoothConnected, isEnabled]);

  useEffect(() => {
    if (isEnabled) {
      setStatusText(
        isBluetoothConnected ? "กำลังฟังสัญญาณ" : "ใช้สัญญาณจำลอง",
      );
      return;
    }

    audioRef.current?.pause();
    audioRef.current = null;
    setIsSpeaking(false);
    setStatusText("หยุดโหมดโค้ชเสียงแล้ว");
  }, [isBluetoothConnected, isEnabled]);

  const latest = history.at(-1);
  const qualityLabel = useMemo(() => {
    if (!latest) {
      return "--";
    }

    if (latest.confidence < 0.35 || latest.sampleCount < 40) {
      return "ข้อมูลน้อย";
    }

    if (latest.overallQualityPercent < 34) {
      return "ควรระวัง";
    }

    if (latest.overallQualityPercent < 67) {
      return "ปานกลาง";
    }

    return "ดี";
  }, [latest]);

  return (
    <GridPanel
      className={cn(
        "overflow-hidden p-0",
        isEnabled && "border-moonwalk-teal shadow-[0_0_0_1px_rgba(65,195,192,0.35)]",
      )}
    >
      <div className="grid gap-2 p-2 sm:p-3">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Radio
                className={cn(
                  "size-4",
                  isEnabled ? "text-moonwalk-teal" : "text-moonwalk-slate",
                )}
                aria-hidden="true"
              />
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-moonwalk-slate/70 dark:text-moonwalk-white/60">
                Live Rehab Mode
              </p>
            </div>
            <p className="mt-1 truncate text-lg font-bold leading-none">
              โค้ชเสียงจากสัญญาณย้อนหลัง
            </p>
          </div>
          <button
            type="button"
            className={cn(
              "grid size-11 place-items-center border text-sm font-bold transition",
              isEnabled
                ? "border-moonwalk-teal bg-moonwalk-teal text-moonwalk-navy"
                : "border-moonwalk-navy bg-moonwalk-white text-moonwalk-navy dark:border-moonwalk-white dark:bg-moonwalk-navy dark:text-moonwalk-white",
            )}
            onClick={() => {
              setIsEnabled((value) => {
                const nextValue = !value;

                if (nextValue) {
                  void speakWithEdgeTts("เริ่มโหมดโค้ชเสียง");
                }

                return nextValue;
              });
            }}
            aria-label={isEnabled ? "Stop live rehab mode" : "Start live rehab mode"}
          >
            {isEnabled ? (
              <Pause className="size-5" aria-hidden="true" />
            ) : (
              <Play className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="grid grid-cols-3 border border-moonwalk-silver dark:border-moonwalk-slate">
          <div className="border-r border-moonwalk-silver p-2 dark:border-moonwalk-slate">
            <p className="text-[10px] text-moonwalk-slate/70 dark:text-moonwalk-white/65">
              สถานะ
            </p>
            <p className="mt-1 truncate text-xs font-bold">{statusText}</p>
          </div>
          <div className="border-r border-moonwalk-silver p-2 dark:border-moonwalk-slate">
            <p className="text-[10px] text-moonwalk-slate/70 dark:text-moonwalk-white/65">
              ประวัติ
            </p>
            <p className="mt-1 text-xs font-bold tabular-nums">
              {history.length} จุด
            </p>
          </div>
          <div className="p-2">
            <p className="text-[10px] text-moonwalk-slate/70 dark:text-moonwalk-white/65">
              สัญญาณ
            </p>
            <p className="mt-1 text-xs font-bold">
              {latest?.source === "mock" ? "จำลอง" : qualityLabel}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2 border border-moonwalk-silver p-2 dark:border-moonwalk-slate">
          <div className="grid size-8 place-items-center border border-moonwalk-teal text-moonwalk-teal">
            {isSpeaking ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Megaphone className="size-4" aria-hidden="true" />
            )}
          </div>
          <p className="min-w-0 text-sm font-bold leading-5">
            {lastCoachText}
          </p>
        </div>

        <button
          type="button"
          className="border border-moonwalk-silver px-3 py-2 text-xs font-bold text-moonwalk-navy dark:border-moonwalk-slate dark:text-moonwalk-white"
          onClick={() => {
            void speakWithEdgeTts("ทดสอบเสียงโค้ช Moon Walk", () => {
              setStatusText(
                isEnabled
                  ? isBluetoothConnected
                    ? "กำลังฟังสัญญาณ"
                    : "ใช้สัญญาณจำลอง"
                  : "พร้อมใช้งาน",
              );
            });
          }}
        >
          ทดสอบเสียง
        </button>
      </div>
    </GridPanel>
  );
}
