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
import { RadioTower, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";

import { liveSignals } from "@/components/moonwalk-data";
import { GridPanel } from "@/components/moonwalk/panel";
import type { NanoImuSample } from "@/lib/nano-imu";
import { cn } from "@user-interface/ui/lib/utils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler);

type StreamSignal = {
  label: string;
  unit: string;
  value: number;
  samples: number[];
};

const visibleSampleCount = 100;
const sampleIntervalMs = 50;

const streamMeta = {
  ax: { column: 2, group: "ACC", axis: "X", field: "ax_ms2", scale: 12 },
  ay: { column: 3, group: "ACC", axis: "Y", field: "ay_ms2", scale: 12 },
  az: { column: 4, group: "ACC", axis: "Z", field: "az_ms2", scale: 12 },
  gx: { column: 5, group: "GYRO", axis: "X", field: "gx_dps", scale: 250 },
  gy: { column: 6, group: "GYRO", axis: "Y", field: "gy_dps", scale: 250 },
  gz: { column: 7, group: "GYRO", axis: "Z", field: "gz_dps", scale: 250 },
} as const;

function normalizeSample(height: number, index: number) {
  const centered = (height - 50) / 25;
  const detail = Math.sin(index * 2.3) * 0.22 + Math.cos(index * 3.7) * 0.12;
  return Number((centered + detail).toFixed(2));
}

function createInitialStream(): StreamSignal[] {
  return liveSignals.map((signal) => {
    const samples = signal.bars.map(normalizeSample);
    const paddedSamples = Array.from({ length: visibleSampleCount }, (_, index) => {
      return samples[index % samples.length] ?? 0;
    });

    return {
      label: signal.label,
      unit: signal.unit,
      value: samples.at(-1) ?? 0,
      samples: paddedSamples,
    };
  });
}

function sampleToSignalValue(sample: NanoImuSample, label: string) {
  if (label === "ax") {
    return sample.accel.x;
  }

  if (label === "ay") {
    return sample.accel.y;
  }

  if (label === "az") {
    return sample.accel.z;
  }

  if (label === "gx") {
    return sample.gyro.x;
  }

  if (label === "gy") {
    return sample.gyro.y;
  }

  return sample.gyro.z;
}

function formatTimestamp(timestampMs: number | undefined) {
  if (!timestampMs) {
    return "000000";
  }

  return String(timestampMs).padStart(6, "0");
}

function normalizePlotValue(value: number, scale: number) {
  return Number(Math.max(-1, Math.min(1, value / scale)).toFixed(4));
}

function normalizePlotSamples(samples: number[], scale: number) {
  return samples.map((sample) => normalizePlotValue(sample, scale));
}

function SignalRow({
  signal,
  options,
}: {
  signal: StreamSignal;
  options: ChartOptions<"line">;
}) {
  const meta = streamMeta[signal.label as keyof typeof streamMeta];
  const peak = Math.max(...signal.samples.map((sample) => Math.abs(sample)));
  const normalizedSamples = normalizePlotSamples(signal.samples, meta.scale);
  const chartData: ChartData<"line"> = {
    labels: signal.samples.map((_, sampleIndex) => String(sampleIndex)),
    datasets: [
      {
        data: normalizedSamples.map(() => 0),
        borderColor: "rgba(11, 16, 31, 0.26)",
        borderWidth: 1,
        pointRadius: 0,
        tension: 0,
      },
      {
        data: normalizedSamples,
        borderColor: "#41c3c0",
        backgroundColor: "#41c3c0",
        borderWidth: 1.15,
        fill: false,
        pointRadius: 0.75,
        pointHoverRadius: 0,
        tension: 0,
      },
    ],
  };

  return (
    <div className="grid min-h-12 grid-cols-[52px_76px_1fr_42px] items-center border-b border-moonwalk-silver bg-moonwalk-white last:border-b-0 md:min-h-16 md:grid-cols-[64px_100px_1fr_56px] dark:border-moonwalk-white/15 dark:bg-moonwalk-navy">
      <div className="grid h-full grid-cols-[4px_1fr] border-r border-moonwalk-silver dark:border-moonwalk-white/15">
        <span
          className={cn(
            "h-full bg-moonwalk-navy dark:bg-moonwalk-white",
            meta.group === "ACC" && "bg-moonwalk-teal dark:bg-moonwalk-teal",
          )}
        />
        <div className="min-w-0 px-1.5 py-1.5">
          <p className="text-[10px] font-bold uppercase leading-none text-moonwalk-slate/70 dark:text-moonwalk-white/60">
            col {meta.column}
          </p>
          <p className="mt-1 truncate text-xs font-bold uppercase leading-none">
            {signal.label}
          </p>
        </div>
      </div>
      <div className="border-r border-moonwalk-silver px-1.5 py-1.5 dark:border-moonwalk-white/15">
        <p className="text-[10px] font-bold uppercase leading-none text-moonwalk-slate/70 dark:text-moonwalk-white/60">
          {meta.group} {meta.axis}
        </p>
        <p className="mt-1 text-[12px] font-bold leading-none tabular-nums">
          {signal.value.toFixed(2)}
        </p>
        <p className="mt-0.5 text-[9px] leading-none text-moonwalk-slate/70 dark:text-moonwalk-white/60">
          {signal.unit}
        </p>
      </div>
      <div className="h-11 min-w-0 bg-[linear-gradient(90deg,rgba(212,217,221,0.55)_1px,transparent_1px)] bg-[length:18px_100%] px-1.5 py-1 dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)]">
        <Line data={chartData} options={options} />
      </div>
      <div className="grid h-full content-center border-l border-moonwalk-silver px-1 text-center dark:border-moonwalk-white/15">
        <p className="text-[8px] font-bold uppercase leading-none text-moonwalk-slate/60 dark:text-moonwalk-white/55">
          peak
        </p>
        <p className="mt-1 text-[11px] font-bold leading-none tabular-nums text-moonwalk-teal">
          {peak.toFixed(1)}
        </p>
      </div>
    </div>
  );
}

export function SignalsPage({
  badPacketCount,
  isBluetoothConnected,
  latestSample,
  packetCount,
}: {
  badPacketCount: number;
  isBluetoothConnected: boolean;
  latestSample: NanoImuSample | null;
  packetCount: number;
}) {
  const [stream, setStream] = useState(createInitialStream);
  const [tick, setTick] = useState(0);
  const timestampLabel = formatTimestamp(latestSample?.timestamp_ms);
  const pressureLabel = latestSample
    ? `${Math.round(latestSample.pressure)}`
    : "101325";

  useEffect(() => {
    if (isBluetoothConnected) {
      return;
    }

    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
      setStream((current) =>
        current.map((signal, signalIndex) => {
          const now = Date.now() / sampleIntervalMs;
          const base =
            Math.sin(now * 0.42 + signalIndex * 0.9) * (signalIndex < 3 ? 2.4 : 58);
          const detail =
            Math.sin(now * 2.8 + signalIndex * 1.7) * (signalIndex < 3 ? 0.8 : 22);
          const micro =
            Math.cos(now * 5.1 + signalIndex * 0.6) * (signalIndex < 3 ? 0.35 : 8);
          const jitter = (Math.random() - 0.5) * (signalIndex < 3 ? 0.5 : 12);
          const restingGravity = signal.label === "az" ? 9.81 : 0;
          const next = Number(
            (restingGravity + base + detail + micro + jitter).toFixed(3),
          );

          return {
            ...signal,
            value: next,
            samples: [...signal.samples.slice(-visibleSampleCount + 1), next],
          };
        }),
      );
    }, sampleIntervalMs);

    return () => window.clearInterval(timer);
  }, [isBluetoothConnected]);

  useEffect(() => {
    if (!latestSample) {
      return;
    }

    setTick(packetCount);
    setStream((current) =>
      current.map((signal) => {
        const next = sampleToSignalValue(latestSample, signal.label);

        return {
          ...signal,
          value: next,
          samples: [...signal.samples.slice(-visibleSampleCount + 1), next],
        };
      }),
    );
  }, [latestSample, packetCount]);

  const chartOptions = useMemo<ChartOptions<"line">>(
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
          display: false,
          grid: { display: true, color: "rgba(148, 163, 184, 0.13)" },
        },
        y: {
          display: false,
          min: -1,
          max: 1,
          grid: { display: true, color: "rgba(148, 163, 184, 0.16)" },
        },
      },
    }),
    [],
  );

  return (
    <div className="grid gap-2 overflow-hidden">
      <GridPanel className="border-moonwalk-navy bg-moonwalk-navy p-0 text-moonwalk-white dark:border-moonwalk-white">
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-moonwalk-white/20 p-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase leading-none text-moonwalk-silver">
              IMU frame monitor
            </p>
            <h1 className="mt-1 truncate text-base font-bold leading-none">
              IMU + Pressure Payload
            </h1>
          </div>
          <div className="grid grid-cols-[auto_auto] items-center gap-2 border border-moonwalk-white px-2 py-1 text-moonwalk-white">
            <RadioTower className="size-4" aria-hidden="true" />
            <span className="text-xs font-bold leading-none">20Hz</span>
          </div>
        </div>
        <div className="grid grid-cols-4 text-center">
          <div className="border-r border-moonwalk-white/20 px-1 py-1.5">
            <p className="text-[9px] uppercase leading-none text-moonwalk-silver">
              tag
            </p>
            <p className="mt-1 text-[11px] font-bold leading-none text-moonwalk-teal">
              IMU
            </p>
          </div>
          <div className="border-r border-moonwalk-white/20 px-1 py-1.5">
            <p className="text-[9px] uppercase leading-none text-moonwalk-silver">
              stream
            </p>
            <p className="mt-1 text-[11px] font-bold leading-none text-moonwalk-teal">
              {isBluetoothConnected ? "BLE" : "RAW"}
            </p>
          </div>
          <div className="border-r border-moonwalk-white/20 px-1 py-1.5">
            <p className="text-[9px] uppercase leading-none text-moonwalk-silver">
              t ms
            </p>
            <p className="mt-1 truncate text-[11px] font-bold leading-none tabular-nums">
              {isBluetoothConnected ? timestampLabel : formatTimestamp(1234 + tick)}
            </p>
          </div>
          <div className="px-1 py-1.5">
            <p className="text-[9px] uppercase leading-none text-moonwalk-silver">
              pressure
            </p>
            <p className="mt-1 text-[11px] font-bold leading-none tabular-nums text-moonwalk-teal">
              {pressureLabel}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center border-t border-moonwalk-white/20 px-2 py-1">
          <p className="truncate text-[10px] leading-none text-moonwalk-silver">
            IMU,t,ax,ay,az,gx,gy,gz,pressure
          </p>
          <div className="grid grid-cols-[auto_auto] items-center gap-1 text-[10px] font-bold leading-none text-moonwalk-teal">
            <Zap className="size-3" aria-hidden="true" />
            <span>
              {isBluetoothConnected ? `${packetCount}/${badPacketCount}` : "50ms"}
            </span>
          </div>
        </div>
      </GridPanel>

      <GridPanel className="p-0">
        <div className="grid grid-cols-[52px_76px_1fr_42px] border-b border-moonwalk-navy bg-moonwalk-silver/40 text-moonwalk-navy md:grid-cols-[64px_100px_1fr_56px] dark:border-moonwalk-white dark:bg-moonwalk-white/10 dark:text-moonwalk-white">
          <p className="border-r border-moonwalk-navy/15 px-1.5 py-1 text-[9px] font-bold uppercase leading-none dark:border-moonwalk-white/20">
            col
          </p>
          <p className="border-r border-moonwalk-navy/15 px-1.5 py-1 text-[9px] font-bold uppercase leading-none dark:border-moonwalk-white/20">
            value
          </p>
          <p className="px-1.5 py-1 text-[9px] font-bold uppercase leading-none">
            raw plot
          </p>
          <p className="border-l border-moonwalk-navy/15 px-1 py-1 text-center text-[9px] font-bold uppercase leading-none dark:border-moonwalk-white/20">
            peak
          </p>
        </div>
        {stream.map((signal) => (
          <SignalRow
            key={signal.label}
            signal={signal}
            options={chartOptions}
          />
        ))}
      </GridPanel>
    </div>
  );
}
