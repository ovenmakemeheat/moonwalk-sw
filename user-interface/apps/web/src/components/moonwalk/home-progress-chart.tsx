"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Line } from "react-chartjs-2";

import type { BiofeedbackMetrics } from "@/lib/biofeedback-metrics";
import { cn } from "@user-interface/ui/lib/utils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler);

type ProgressPoint = {
  day: number;
  current: number;
  baseline: number;
};

const baselineStartScore = 42;
const baselineEndScore = 66;
const savedSessionScore = 74;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getBaselineScore(day: number, programDays: number) {
  const progress = clamp((day - 1) / Math.max(1, programDays - 1), 0, 1);

  return Math.round(
    baselineStartScore +
      (baselineEndScore - baselineStartScore) * Math.pow(progress, 0.82),
  );
}

function getMetricScore(metrics: BiofeedbackMetrics, isBluetoothConnected: boolean) {
  if (
    isBluetoothConnected &&
    !metrics.isIdle &&
    metrics.confidence >= 0.35 &&
    metrics.overallQualityPercent > 0
  ) {
    return Math.round(metrics.overallQualityPercent);
  }

  return savedSessionScore;
}

function createProgressPoints({
  currentDay,
  currentScore,
  programDays,
}: {
  currentDay: number;
  currentScore: number;
  programDays: number;
}) {
  const days = [1, 4, 7, 10, 13, 16, currentDay, 24, programDays]
    .filter((day, index, list) => day >= 1 && day <= programDays && list.indexOf(day) === index)
    .sort((a, b) => a - b);
  const startScore = Math.min(baselineStartScore, currentScore - 18);

  return days.map<ProgressPoint>((day) => {
    const progressToCurrent = clamp((day - 1) / Math.max(1, currentDay - 1), 0, 1);
    const projectedAfterCurrent =
      day <= currentDay
        ? currentScore
        : currentScore + (programDays > currentDay ? (day - currentDay) * 0.65 : 0);
    const current =
      day <= currentDay
        ? startScore + (currentScore - startScore) * Math.pow(progressToCurrent, 1.08)
        : projectedAfterCurrent;

    return {
      day,
      baseline: getBaselineScore(day, programDays),
      current: Math.round(clamp(current, 0, 100)),
    };
  });
}

export function HomeProgressChart({
  className,
  currentDay,
  isBluetoothConnected,
  metrics,
  programDays,
  tone = "default",
}: {
  className?: string;
  currentDay: number;
  isBluetoothConnected: boolean;
  metrics: BiofeedbackMetrics;
  programDays: number;
  tone?: "default" | "navy";
}) {
  const isNavy = tone === "navy";
  const currentScore = getMetricScore(metrics, isBluetoothConnected);
  const progressPoints = useMemo(
    () =>
      createProgressPoints({
        currentDay,
        currentScore,
        programDays,
      }),
    [currentDay, currentScore, programDays],
  );
  const currentPoint =
    progressPoints.find((point) => point.day === currentDay) ??
    progressPoints[progressPoints.length - 1];
  const baselineAtCurrent = currentPoint?.baseline ?? 0;
  const currentAtCurrent = currentPoint?.current ?? 0;
  const improvement = currentAtCurrent - baselineAtCurrent;
  const isLiveScore =
    isBluetoothConnected &&
    !metrics.isIdle &&
    metrics.confidence >= 0.35 &&
    metrics.overallQualityPercent > 0;
  const improvementLabel =
    improvement > 0 ? `+${improvement}%` : improvement < 0 ? `${improvement}%` : "0%";
  const statusLabel =
    improvement >= 8 ? "ดีกว่าเส้นฐาน" : improvement >= 0 ? "ใกล้เส้นฐาน" : "ต่ำกว่าเส้นฐาน";
  const sourceLabel = isLiveScore ? "สดจากเซนเซอร์" : "เซสชันล่าสุด";

  const data = useMemo<ChartData<"line">>(
    () => ({
      labels: progressPoints.map((point) => String(point.day)),
      datasets: [
        {
          label: "ค่าเริ่มต้น",
          data: progressPoints.map((point) => point.baseline),
          borderColor: "rgba(148, 163, 184, 0.78)",
          backgroundColor: "rgba(148, 163, 184, 0.08)",
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.18,
        },
        {
          label: "ปัจจุบัน",
          data: progressPoints.map((point) => point.current),
          borderColor: "#41c3c0",
          backgroundColor: "rgba(65, 195, 192, 0.18)",
          borderWidth: 2.5,
          fill: true,
          pointRadius: progressPoints.map((point) => (point.day === currentDay ? 4 : 0)),
          pointBackgroundColor: "#41c3c0",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointHoverRadius: 0,
          tension: 0.18,
        },
      ],
    }),
    [currentDay, progressPoints],
  );

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      animation: false,
      maintainAspectRatio: false,
      responsive: true,
      events: [],
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: {
          border: { display: false },
          grid: {
            color: "rgba(148, 163, 184, 0.16)",
            drawTicks: false,
          },
          ticks: {
            color: "rgba(100, 116, 139, 0.86)",
            font: { size: 9, weight: 700 },
            maxRotation: 0,
            callback: (_value, index) => {
              const day = progressPoints[index]?.day;
              return day === 1 || day === currentDay || day === programDays
                ? `วัน ${day}`
                : "";
            },
          },
        },
        y: {
          min: 20,
          max: 92,
          border: { display: false },
          grid: {
            color: "rgba(148, 163, 184, 0.14)",
            drawTicks: false,
          },
          ticks: {
            color: "rgba(100, 116, 139, 0.72)",
            font: { size: 9, weight: 700 },
            count: 4,
            callback: (value) => `${value}%`,
          },
        },
      },
    }),
    [currentDay, programDays],
  );

  return (
    <section
      className={cn(
        "border border-moonwalk-silver bg-moonwalk-white text-moonwalk-navy dark:border-moonwalk-slate dark:bg-moonwalk-navy dark:text-moonwalk-white",
        isNavy &&
          "border-moonwalk-white/30 bg-moonwalk-navy text-moonwalk-white dark:border-moonwalk-white/30",
        className,
      )}
    >
      <div
        className={cn(
          "grid grid-cols-[1fr_auto] items-start gap-2 border-b border-moonwalk-silver p-2 dark:border-moonwalk-slate",
          isNavy && "border-moonwalk-white/20 dark:border-moonwalk-white/20",
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-moonwalk-teal" aria-hidden="true" />
            <h2 className="text-base font-bold leading-none">
              ความก้าวหน้าเทียบค่าเริ่มต้น
            </h2>
          </div>
          <p
            className={cn(
              "mt-1 text-[11px] leading-4 text-moonwalk-slate/70 dark:text-moonwalk-white/65",
              isNavy && "text-moonwalk-silver",
            )}
          >
            เปรียบเทียบคุณภาพการเดินกับเส้นฐานจากช่วงเริ่มต้น
          </p>
        </div>
        <div className="border border-moonwalk-teal px-2 py-1 text-right">
          <p
            className={cn(
              "text-[9px] font-bold leading-none text-moonwalk-slate/70 dark:text-moonwalk-white/60",
              isNavy && "text-moonwalk-silver",
            )}
          >
            {statusLabel}
          </p>
          <p className="mt-1 text-lg font-bold leading-none text-moonwalk-teal">
            {improvementLabel}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "grid grid-cols-3 border-b border-moonwalk-silver text-center dark:border-moonwalk-slate",
          isNavy && "border-moonwalk-white/20 dark:border-moonwalk-white/20",
        )}
      >
        <div
          className={cn(
            "border-r border-moonwalk-silver px-1 py-1.5 dark:border-moonwalk-slate",
            isNavy && "border-moonwalk-white/20 dark:border-moonwalk-white/20",
          )}
        >
          <p
            className={cn(
              "text-[9px] text-moonwalk-slate/70 dark:text-moonwalk-white/60",
              isNavy && "text-moonwalk-silver",
            )}
          >
            ปัจจุบัน
          </p>
          <p className="mt-0.5 text-sm font-bold leading-none text-moonwalk-teal">
            {currentAtCurrent}%
          </p>
        </div>
        <div
          className={cn(
            "border-r border-moonwalk-silver px-1 py-1.5 dark:border-moonwalk-slate",
            isNavy && "border-moonwalk-white/20 dark:border-moonwalk-white/20",
          )}
        >
          <p
            className={cn(
              "text-[9px] text-moonwalk-slate/70 dark:text-moonwalk-white/60",
              isNavy && "text-moonwalk-silver",
            )}
          >
            ค่าเริ่มต้น
          </p>
          <p className="mt-0.5 text-sm font-bold leading-none">
            {baselineAtCurrent}%
          </p>
        </div>
        <div className="px-1 py-1.5">
          <p
            className={cn(
              "text-[9px] text-moonwalk-slate/70 dark:text-moonwalk-white/60",
              isNavy && "text-moonwalk-silver",
            )}
          >
            วันที่
          </p>
          <p className="mt-0.5 text-sm font-bold leading-none">
            {currentDay}
          </p>
        </div>
      </div>

      <div className="relative h-[168px] p-2">
        <div
          className={cn(
            "absolute left-[67%] top-3 z-10 border border-moonwalk-teal bg-moonwalk-white px-2 py-1 text-[10px] font-bold leading-none text-moonwalk-navy shadow-[4px_4px_0_rgba(65,195,192,0.18)] dark:bg-moonwalk-navy dark:text-moonwalk-white",
            isNavy &&
              "bg-moonwalk-navy text-moonwalk-white shadow-[4px_4px_0_rgba(65,195,192,0.24)]",
          )}
        >
          วันนี้ {currentAtCurrent}%
        </div>
        <Line data={data} options={options} />
      </div>

      <div
        className={cn(
          "grid grid-cols-[auto_1fr] items-center gap-2 border-t border-moonwalk-silver p-2 dark:border-moonwalk-slate",
          isNavy && "border-moonwalk-white/20 dark:border-moonwalk-white/20",
        )}
      >
        <span className="size-2 bg-moonwalk-teal" />
        <p
          className={cn(
            "text-[11px] leading-4 text-moonwalk-slate/75 dark:text-moonwalk-white/65",
            isNavy && "text-moonwalk-silver",
          )}
        >
          {sourceLabel}: เส้นสีฟ้าคือคะแนนคุณภาพการเดิน เทียบกับเส้นฐานสีเทา
        </p>
      </div>
    </section>
  );
}
