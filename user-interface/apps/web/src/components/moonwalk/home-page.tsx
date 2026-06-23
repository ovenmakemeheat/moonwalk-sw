import { CalendarDays, ChevronRight, History, Sparkles, Zap } from "lucide-react";

import {
  devices,
  type DeviceId,
  historyItems,
  recommendations,
} from "@/components/moonwalk-data";
import { HomeProgressChart } from "@/components/moonwalk/home-progress-chart";
import { GridPanel, MiniStatus } from "@/components/moonwalk/panel";
import type { BiofeedbackMetrics } from "@/lib/biofeedback-metrics";

export function HomePage({
  selectedDevice,
  isBluetoothConnected,
  metrics,
}: {
  selectedDevice: DeviceId;
  isBluetoothConnected: boolean;
  metrics: BiofeedbackMetrics;
}) {
  const deviceLabel =
    devices.find((device) => device.id === selectedDevice)?.label ?? "ไม้เท้า";
  const dutyValue =
    metrics.dutyFactorPercent === null
      ? "--"
      : String(Math.round(metrics.dutyFactorPercent));
  const rhythmValue =
    metrics.rhythmScore === null
      ? isBluetoothConnected
        ? "--"
        : "86"
      : String(Math.round(metrics.rhythmScore));
  const wsTrainingLoadValue =
    metrics.sessionWeightSupportTrainingLoad === null
      ? "--"
      : String(Math.round(metrics.sessionWeightSupportTrainingLoad));
  const targetComplianceValue =
    metrics.targetCompliancePercent === null
      ? "--"
      : `${Math.round(metrics.targetCompliancePercent)}%`;
  const trainingTone =
    metrics.sessionWeightSupportTrainingLoad === null
      ? "neutral"
      : metrics.sessionWeightSupportTrainingLoad >= 55
        ? "green"
        : "amber";
  const currentProgramDay = 20;
  const programDays = 28;

  return (
    <div className="grid gap-2">
      <GridPanel className="border-moonwalk-navy bg-moonwalk-navy text-moonwalk-white dark:border-moonwalk-white">
        <div className="grid grid-cols-[1fr_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="text-xs text-moonwalk-silver">มูนวอล์ก</p>
            <h1 className="mt-2 text-[22px] font-bold leading-[0.95] tracking-normal min-[390px]:text-[24px]">
              สวัสดีคุณ เอ้อ
            </h1>
          </div>
          <div className="grid size-9 shrink-0 place-items-center border border-moonwalk-teal">
            <CalendarDays className="size-5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-4 border border-moonwalk-white/30 p-3">
          <p className="text-xs text-moonwalk-silver">วันที่ใช้งานปัจจุบัน</p>
          <div className="mt-2 flex items-end gap-2">
            <p className="text-[56px] font-bold leading-[0.85] tracking-normal">
              {currentProgramDay}
            </p>
            <div className="pb-1">
              <p className="text-base font-bold leading-none">
                จากวันที่เริ่มต้น
              </p>
              <p className="mt-1 text-xs text-moonwalk-silver">
                วันที่ {currentProgramDay} จาก {programDays} วัน
              </p>
            </div>
          </div>
        </div>
        <HomeProgressChart
          className="mt-2 border-moonwalk-white/30 dark:border-moonwalk-white/30"
          currentDay={currentProgramDay}
          isBluetoothConnected={isBluetoothConnected}
          metrics={metrics}
          programDays={programDays}
          tone="navy"
        />
      </GridPanel>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <MiniStatus
          label="บลูทูธ"
          value={isBluetoothConnected ? "เชื่อมต่อ" : "ยังไม่เชื่อมต่อ"}
          tone={isBluetoothConnected ? "green" : "neutral"}
        />
        <MiniStatus label="อุปกรณ์" value={deviceLabel} tone="green" />
        <MiniStatus
          label="ฝึกลงน้ำหนัก"
          value={wsTrainingLoadValue}
          tone={trainingTone}
        />
      </div>

      <GridPanel className="p-0">
        <div className="grid grid-cols-[1fr_auto] items-center border-b border-moonwalk-silver p-2 dark:border-moonwalk-slate">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-moonwalk-teal" aria-hidden="true" />
            <h2 className="text-base font-bold leading-none">คำแนะนำวันนี้</h2>
          </div>
          <span className="text-[10px] font-bold uppercase text-moonwalk-slate/70 dark:text-moonwalk-white/60">
            สด
          </span>
        </div>
        <div className="grid grid-cols-3 text-center">
          <div className="border-r border-moonwalk-silver p-2 dark:border-moonwalk-slate">
            <p className="text-[10px] text-moonwalk-slate/70 dark:text-moonwalk-white/65">
              จังหวะ
            </p>
            <p className="mt-1 text-base font-bold">{rhythmValue}</p>
          </div>
          <div className="border-r border-moonwalk-silver p-2 dark:border-moonwalk-slate">
            <p className="text-[10px] text-moonwalk-slate/70 dark:text-moonwalk-white/65">
              ลงไม้เท้า
            </p>
            <p className="mt-1 text-base font-bold">{dutyValue}</p>
          </div>
          <div className="p-2">
            <p className="text-[10px] text-moonwalk-slate/70 dark:text-moonwalk-white/65">
              ฝึกน้ำหนัก
            </p>
            <p className="mt-1 text-base font-bold">{wsTrainingLoadValue}</p>
          </div>
        </div>
      </GridPanel>

      <GridPanel>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="size-5" aria-hidden="true" />
            <h2 className="text-lg font-bold leading-none">ประวัติ</h2>
          </div>
          <span className="text-xs text-moonwalk-slate/70">3 รายการ</span>
        </div>
        <div className="mt-2 divide-y divide-moonwalk-silver border-y border-moonwalk-silver dark:divide-moonwalk-slate dark:border-moonwalk-slate">
          {historyItems.map((item) => (
            <div
              key={`${item.date}-${item.duration}`}
              className="grid gap-0.5 py-2 min-[430px]:grid-cols-[1fr_auto] min-[430px]:gap-3"
            >
              <div>
                <p className="text-[10px] font-bold uppercase leading-none text-moonwalk-slate/70 dark:text-moonwalk-white/55">
                  {item.date} / {item.equipment} / {item.duration}
                </p>
                <p className="mt-1 text-sm font-bold leading-none">
                  {item.title}
                </p>
                <p className="text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
                  {item.detail}
                </p>
              </div>
              <p className="self-center text-xs text-moonwalk-slate dark:text-moonwalk-silver min-[430px]:text-right">
                {item.outcome}
              </p>
            </div>
          ))}
        </div>
      </GridPanel>

      <GridPanel>
        <div className="flex items-center gap-2">
          <Sparkles className="size-5" aria-hidden="true" />
          <h2 className="text-lg font-bold leading-none">คำแนะนำ</h2>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "คำแนะนำจากรอบล่าสุด",
              detail: metrics.recommendation,
            },
            ...recommendations.slice(0, 2),
          ].map((item) => (
              <div
                key={`${item.title}-${item.detail}`}
                className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-2 border border-moonwalk-silver p-2 dark:border-moonwalk-slate"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-none">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-4 text-moonwalk-slate/75 dark:text-moonwalk-white/65">
                    {item.detail}
                  </p>
                </div>
                <ChevronRight
                  className="size-5 text-moonwalk-slate"
                  aria-hidden="true"
                />
              </div>
            ))}
        </div>
      </GridPanel>
    </div>
  );
}
