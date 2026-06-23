"use client";

import {
  Activity,
  ChevronRight,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { useEffect, useState } from "react";

import { GridPanel } from "@/components/moonwalk/panel";
import type { BiofeedbackMetrics } from "@/lib/biofeedback-metrics";
import { cn } from "@user-interface/ui/lib/utils";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getGaugeTone(value: number | null) {
  if (value === null) {
    return {
      accent: "#64748b",
      label: "รอข้อมูล",
    };
  }

  if (value < 34) {
    return {
      accent: "#ef4444",
      label: "แย่",
    };
  }

  if (value < 67) {
    return {
      accent: "#facc15",
      label: "ปานกลาง",
    };
  }

  return {
    accent: "#41c3c0",
    label: "ดีเยี่ยม",
  };
}

function CircularGauge({
  className,
  label,
  size = "small",
  unit = "%",
  value,
}: {
  className?: string;
  label: string;
  size?: "large" | "small";
  unit?: string;
  value: number | null;
}) {
  const percent = value === null ? 0 : clamp(Math.round(value), 0, 100);
  const tone = getGaugeTone(value);
  const trackColor = "rgba(148, 163, 184, 0.2)";
  const valueText = value === null ? "--" : String(percent);

  return (
    <div
      className={cn(
        "grid justify-items-center border border-moonwalk-silver bg-moonwalk-white p-2 text-center text-moonwalk-navy dark:border-moonwalk-slate dark:bg-moonwalk-navy dark:text-moonwalk-white",
        className,
      )}
    >
      <div
        className={cn(
          "grid place-items-center",
          size === "large" ? "size-36" : "size-[86px]",
        )}
        style={{
          background: `conic-gradient(${tone.accent} ${percent * 3.6}deg, ${trackColor} 0deg)`,
          clipPath: "circle(50% at 50% 50%)",
        }}
      >
        <div
          className={cn(
            "grid place-items-center bg-moonwalk-white dark:bg-moonwalk-navy",
            size === "large" ? "size-[112px]" : "size-[66px]",
          )}
          style={{ clipPath: "circle(50% at 50% 50%)" }}
        >
          <div>
            <p
              className={cn(
                "font-bold leading-none tabular-nums",
                size === "large" ? "text-[34px]" : "text-[22px]",
              )}
            >
              {valueText}
            </p>
            <p className="mt-0.5 text-[10px] font-bold leading-none text-moonwalk-slate/70 dark:text-moonwalk-white/60">
              {value === null ? "กำลังอ่าน" : unit}
            </p>
          </div>
        </div>
      </div>
      <p
        className={cn(
          "mt-2 font-bold leading-none",
          size === "large" ? "text-base" : "text-[11px]",
        )}
      >
        {label}
      </p>
      <p
        className="mt-1 text-[10px] font-bold leading-none"
        style={{ color: tone.accent }}
      >
        {tone.label}
      </p>
    </div>
  );
}

export function BiofeedbackPage({
  metrics,
  isBluetoothConnected,
}: {
  metrics: BiofeedbackMetrics;
  isBluetoothConnected: boolean;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(522);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const liveRhythm = isBluetoothConnected ? null : 86 + (elapsedSeconds % 3);
  const liveDuty = isBluetoothConnected ? null : 41 + (elapsedSeconds % 4);
  const liveLoad = isBluetoothConnected ? null : 68 + (elapsedSeconds % 5);
  const liveOverall = isBluetoothConnected ? null : 72 + (elapsedSeconds % 4);
  const rhythmScore =
    metrics.rhythmScore === null ? liveRhythm : Math.round(metrics.rhythmScore);
  const dutyScore =
    metrics.dutyFactorPercent === null
      ? liveDuty
      : Math.round(metrics.dutyFactorPercent);
  const wsTrainingLoadScore =
    metrics.sessionWeightSupportTrainingLoad === null
      ? liveLoad
      : Math.round(metrics.sessionWeightSupportTrainingLoad);
  const overallScore =
    metrics.overallQualityPercent <= 0 && !isBluetoothConnected
      ? liveOverall
      : Math.round(metrics.overallQualityPercent);
  const rhythmValue =
    rhythmScore === null
        ? "--"
      : String(rhythmScore);
  const dutyValue =
    dutyScore === null
        ? "--"
      : String(dutyScore);
  const wsTrainingLoadValue =
    wsTrainingLoadScore === null
      ? "--"
      : String(wsTrainingLoadScore);
  const targetComplianceValue =
    metrics.targetCompliancePercent === null
      ? "--"
      : `${Math.round(metrics.targetCompliancePercent)}%`;
  const headlineCards = [
    { label: "ลงไม้เท้า", value: dutyScore, icon: Activity },
    { label: "จังหวะ", value: rhythmScore, icon: Waves },
    { label: "ลงน้ำหนัก", value: wsTrainingLoadScore, icon: ShieldCheck },
  ];

  if (isBluetoothConnected && metrics.isIdle) {
    return (
      <div className="grid gap-2">
        <GridPanel className="min-h-64 border-moonwalk-navy bg-moonwalk-navy p-4 text-moonwalk-white dark:border-moonwalk-white">
          <div className="grid h-full min-h-56 content-center text-center">
            <p className="text-xs font-bold uppercase text-moonwalk-silver">
              Live walking state
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-none">Idle</h1>
            <p className="mx-auto mt-3 max-w-64 text-sm leading-5 text-moonwalk-silver">
              ยังไม่พบการถือหรือใช้งานอุปกรณ์ เริ่มถือไม้เท้าและเดินเพื่อเปิดการคำนวณ
            </p>
          </div>
        </GridPanel>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <GridPanel className="bg-moonwalk-navy p-2 text-moonwalk-white dark:border-moonwalk-white">
        <p className="text-xs text-moonwalk-silver">ฟีดแบ็กตอนนี้</p>
        <h2 className="mt-1 text-xl font-bold leading-none">
          {metrics.recommendation}
        </h2>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-moonwalk-silver">
          {metrics.sampleCount > 0
            ? `อ่าน ${metrics.sampleCount} ตัวอย่าง / ลงไม้เท้า ${dutyValue}% / จังหวะ ${rhythmValue} / ฝึกน้ำหนัก ${wsTrainingLoadValue}`
            : isBluetoothConnected
              ? "เชื่อมต่อแล้ว กำลังรอ frame IMU จากอุปกรณ์"
              : "โหมดสาธิตจะแสดงค่าจำลองจนกว่าจะเชื่อมต่อ Bluetooth"}
        </p>
      </GridPanel>

      <div className="grid gap-2 md:grid-cols-2">
        <GridPanel className="p-2">
          <div className="grid grid-cols-[auto_1fr] items-center gap-3">
            <CircularGauge
              className="border-moonwalk-navy/10 p-2 dark:border-moonwalk-white/15"
              label="คุณภาพ"
              size="large"
              value={overallScore}
            />
            <div className="grid gap-2">
              <div className="border border-moonwalk-silver p-2 dark:border-moonwalk-slate">
                <p className="text-[10px] font-bold text-moonwalk-slate/70 dark:text-moonwalk-white/65">
                  สถานะ
                </p>
                <p className="mt-1 text-base font-bold leading-none">
                  {metrics.action}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="border border-moonwalk-silver p-2 dark:border-moonwalk-slate">
                  <p className="text-[10px] text-moonwalk-slate/70 dark:text-moonwalk-white/65">
                    เป้าหมาย
                  </p>
                  <p className="mt-1 text-sm font-bold leading-none">
                    {targetComplianceValue}
                  </p>
                </div>
                <div className="border border-moonwalk-silver p-2 dark:border-moonwalk-slate">
                  <p className="text-[10px] text-moonwalk-slate/70 dark:text-moonwalk-white/65">
                    ความมั่นใจ
                  </p>
                  <p className="mt-1 text-sm font-bold leading-none">
                    {Math.round(metrics.confidence * 100)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </GridPanel>

        <div className="grid grid-cols-3 gap-2 md:grid-cols-1 md:grid-rows-3">
        {headlineCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="relative">
            <Icon
              className="absolute right-2 top-2 z-10 size-3.5 text-moonwalk-teal"
              aria-hidden="true"
            />
            <CircularGauge label={label} value={value} />
          </div>
        ))}
        </div>
      </div>

      <GridPanel className="p-2">
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <div>
            <p className="text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
              คำแนะนำถัดไป
            </p>
            <p className="truncate text-base font-bold leading-none">
              {metrics.recommendation}
            </p>
          </div>
          <ChevronRight
            className="size-5 text-moonwalk-slate dark:text-moonwalk-silver"
            aria-hidden="true"
          />
        </div>
      </GridPanel>
    </div>
  );
}
