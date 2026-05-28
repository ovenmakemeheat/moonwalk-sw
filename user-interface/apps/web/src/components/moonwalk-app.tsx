"use client";

import {
  Activity,
  Bluetooth,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Footprints,
  History,
  Plus,
  RadioTower,
  Sparkles,
  Waves,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  devices,
  type DeviceId,
  historyItems,
  liveSignals,
  pages,
  type PageId,
  recommendations,
} from "@/components/moonwalk-data";
import { formatSessionTime } from "@/lib/format";
import { cn } from "@user-interface/ui/lib/utils";

function GridPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border border-moonwalk-silver bg-moonwalk-white p-2 text-moonwalk-navy dark:border-moonwalk-slate dark:bg-moonwalk-navy dark:text-moonwalk-white sm:p-3",
        className,
      )}
    >
      {children}
    </section>
  );
}

function MiniStatus({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "green" | "amber" | "neutral";
}) {
  return (
    <div className="min-w-0 border border-moonwalk-silver p-2 dark:border-moonwalk-slate">
      <p className="text-xs leading-4 text-moonwalk-slate/70 dark:text-moonwalk-white/65">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Circle
          className={cn(
            "size-2 fill-current",
            tone === "green" && "text-moonwalk-teal",
            tone === "amber" && "text-moonwalk-slate",
            tone === "neutral" && "text-moonwalk-silver",
          )}
          aria-hidden="true"
        />
        <p className="min-w-0 text-lg font-bold leading-none">{value}</p>
      </div>
    </div>
  );
}

function StickyDeviceBar({
  selectedDevice,
  onDeviceChange,
  isOpen,
  onToggleOpen,
  onAddDevice,
}: {
  selectedDevice: DeviceId;
  onDeviceChange: (device: DeviceId) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onAddDevice: () => void;
}) {
  const selected =
    devices.find((device) => device.id === selectedDevice) ?? devices[0];

  return (
    <section className="sticky top-0 z-10 -mx-3 border-y border-moonwalk-navy bg-moonwalk-white text-moonwalk-navy dark:border-moonwalk-white dark:bg-moonwalk-navy dark:text-moonwalk-white md:mx-0 md:border-x">
      <div className="grid grid-cols-[1fr_auto] items-center border-b border-moonwalk-white bg-moonwalk-navy px-3 py-1.5 text-moonwalk-white">
        <div className="flex min-w-0 items-center gap-2">
          <Bluetooth
            className="size-4 shrink-0 text-moonwalk-teal"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-bold leading-none">
              Bluetooth connected
            </p>
          </div>
        </div>
        <div className="border border-moonwalk-white px-2 py-0.5 text-xs font-bold text-moonwalk-white">
          LIVE
        </div>
      </div>

      <button
        type="button"
        className="grid min-h-12 w-full grid-cols-[48px_1fr_auto] items-center gap-2 px-3 py-1.5 text-left"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
      >
        <div className="grid h-10 w-12 place-items-center border border-moonwalk-silver bg-moonwalk-silver/35 dark:border-moonwalk-white/25 dark:bg-moonwalk-white/10">
          <img
            src={selected.iconSrc}
            alt=""
            className="h-8 w-8 object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold leading-none">
            {selected.label}
          </p>
          <p className="mt-0.5 truncate text-xs leading-4 text-moonwalk-slate/75 dark:text-moonwalk-white/65">
            {selected.description}
          </p>
        </div>
        <ChevronDown
          className={cn("size-5 transition-transform", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div className="border-t border-moonwalk-navy bg-moonwalk-white dark:border-moonwalk-white/25 dark:bg-moonwalk-navy">
          {devices.map((device) => {
            return (
              <button
                key={device.id}
                type="button"
                className={cn(
                  "grid min-h-16 w-full grid-cols-[56px_1fr_auto] items-center gap-2 border-b border-moonwalk-silver px-3 py-1.5 text-left last:border-b-0 dark:border-moonwalk-white/15",
                  selectedDevice === device.id &&
                    "bg-moonwalk-silver/35 dark:bg-moonwalk-white/10",
                )}
                onClick={() => {
                  onDeviceChange(device.id);
                  onToggleOpen();
                }}
              >
                <div className="grid h-14 w-14 place-items-center border border-moonwalk-silver bg-moonwalk-white dark:border-moonwalk-white/20 dark:bg-moonwalk-slate">
                  <img
                    src={device.iconSrc}
                    alt=""
                    className="h-11 w-11 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none">
                    {device.label}
                  </p>
                  <p className="mt-0.5 text-xs leading-4 text-moonwalk-slate/75 dark:text-moonwalk-white/65">
                    {device.description}
                  </p>
                </div>
                {selectedDevice === device.id ? (
                  <Check
                    className="size-5 text-moonwalk-teal"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
          <button
            type="button"
            className="grid min-h-16 w-full grid-cols-[56px_1fr_auto] items-center gap-2 px-3 py-1.5 text-left"
            onClick={onAddDevice}
          >
            <div className="grid h-14 w-14 place-items-center border border-moonwalk-teal bg-moonwalk-teal/10">
              <Plus className="size-6 text-moonwalk-teal" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none">
                เพิ่มอุปกรณ์ของคุณ
              </p>
              <p className="mt-0.5 text-xs leading-4 text-moonwalk-slate/75 dark:text-moonwalk-white/65">
                เพิ่มชื่อ ประเภท รูปแบบการติดตั้ง และรายละเอียดโมดูล
              </p>
            </div>
            <ChevronRight
              className="size-5 text-moonwalk-slate dark:text-moonwalk-white/65"
              aria-hidden="true"
            />
          </button>
        </div>
      ) : null}
    </section>
  );
}

function HomePage({ selectedDevice }: { selectedDevice: DeviceId }) {
  const deviceLabel =
    devices.find((device) => device.id === selectedDevice)?.label ?? "ไม้เท้า";

  return (
    <div className="grid gap-2">
      <GridPanel className="border-moonwalk-navy bg-moonwalk-navy text-moonwalk-white dark:border-moonwalk-white">
        <div className="grid grid-cols-[1fr_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="text-xs text-moonwalk-silver">Moon Walk</p>
            <h1 className="mt-2 text-[26px] font-bold leading-[0.95] tracking-normal min-[390px]:text-[30px]">
              สวัสดีคุณ สมชาย
            </h1>
          </div>
          <div className="grid size-9 shrink-0 place-items-center border border-moonwalk-teal">
            <Check className="size-5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="border border-moonwalk-white/30 p-2">
            <p className="text-xs text-moonwalk-silver">อุปกรณ์</p>
            <p className="mt-1 text-xl font-bold">{deviceLabel}</p>
          </div>
          <div className="border border-moonwalk-white/30 p-2">
            <p className="text-xs text-moonwalk-silver">เซสชันล่าสุด</p>
            <p className="mt-1 text-xl font-bold">18 นาที</p>
          </div>
        </div>
      </GridPanel>

      <div className="grid grid-cols-2 gap-3">
        <MiniStatus label="Bluetooth" value="เชื่อมต่อ" tone="green" />
        <MiniStatus label="Calibration" value="พร้อมใช้" tone="green" />
      </div>

      <GridPanel>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="size-5" aria-hidden="true" />
            <h2 className="text-xl font-bold leading-none">ประวัติ</h2>
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
                <p className="text-base font-bold leading-none">{item.date}</p>
                <p className="text-sm text-moonwalk-slate/70 dark:text-moonwalk-white/65">
                  {item.equipment} / {item.duration}
                </p>
              </div>
              <p className="self-center text-sm text-moonwalk-slate dark:text-moonwalk-silver min-[430px]:text-right">
                {item.rhythm}
              </p>
            </div>
          ))}
        </div>
      </GridPanel>

      <GridPanel>
        <div className="flex items-center gap-2">
          <Sparkles className="size-5" aria-hidden="true" />
          <h2 className="text-xl font-bold leading-none">คำแนะนำ</h2>
        </div>
        <div className="mt-2 grid gap-2">
          {recommendations.map((item) => (
            <div
              key={item}
              className="grid min-h-11 grid-cols-[1fr_auto] items-center gap-2 border border-moonwalk-silver p-2 dark:border-moonwalk-slate"
            >
              <p className="text-base leading-5">{item}</p>
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

function UsageMeter({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="border border-moonwalk-silver p-2 dark:border-moonwalk-slate">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold leading-none">{label}</p>
        <p className="text-sm font-bold leading-none text-moonwalk-teal">
          {value}%
        </p>
      </div>
      <div className="mt-2 h-2 border border-moonwalk-silver dark:border-moonwalk-slate">
        <div
          className="h-full bg-moonwalk-teal"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="mt-1 truncate text-xs leading-4 text-moonwalk-slate/70 dark:text-moonwalk-white/65">
        {helper}
      </p>
    </div>
  );
}

function BiofeedbackPage({ selectedDevice }: { selectedDevice: DeviceId }) {
  const deviceLabel =
    devices.find((device) => device.id === selectedDevice)?.label ?? "ไม้เท้า";
  const [elapsedSeconds, setElapsedSeconds] = useState(522);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const liveCadence = 82 + (elapsedSeconds % 5) - 2;
  const liveRhythm = 86 + (elapsedSeconds % 3);
  const liveDuty = 41 + (elapsedSeconds % 4);
  const timeProgress = Math.min(96, Math.round((elapsedSeconds / 720) * 100));
  const liveFeedbackCards = [
    {
      label: "Cadence",
      value: String(liveCadence),
      unit: "รอบ/นาที",
      icon: Footprints,
    },
    {
      label: "Rhythm",
      value: String(liveRhythm),
      unit: "/100",
      icon: Waves,
    },
    {
      label: "Duty factor",
      value: String(liveDuty),
      unit: "%",
      icon: Activity,
    },
    {
      label: "Action",
      value: "เดินต่อเนื่อง",
      unit: `${92 + (elapsedSeconds % 2)}%`,
      icon: Brain,
    },
  ];

  return (
    <div className="grid gap-2">
      <GridPanel className="border-moonwalk-navy p-2">
        <div className="grid grid-cols-[1fr_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
              Live walking state
            </p>
            <h1 className="mt-1 text-2xl font-bold leading-none">กำลังเดิน</h1>
          </div>
          <div className="grid size-9 shrink-0 place-items-center border border-moonwalk-teal text-moonwalk-teal">
            <Activity className="size-5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 border border-moonwalk-silver dark:border-moonwalk-slate">
          <div className="border-r border-moonwalk-silver p-2 dark:border-moonwalk-slate">
            <p className="text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
              เวลา
            </p>
            <p className="mt-1 text-xl font-bold leading-none">
              {formatSessionTime(elapsedSeconds)}
            </p>
          </div>
          <div className="border-r border-moonwalk-silver p-2 dark:border-moonwalk-slate">
            <p className="text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
              อุปกรณ์
            </p>
            <p className="mt-1 truncate text-xl font-bold leading-none">
              {deviceLabel}
            </p>
          </div>
          <div className="p-2">
            <p className="text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
              คุณภาพ
            </p>
            <p className="mt-1 text-xl font-bold leading-none text-moonwalk-teal">
              ดี
            </p>
          </div>
        </div>
      </GridPanel>

      <GridPanel className="bg-moonwalk-navy p-2 text-moonwalk-white dark:border-moonwalk-white">
        <p className="text-xs text-moonwalk-silver">Biofeedback now</p>
        <h2 className="mt-1 text-2xl font-bold leading-none">คงจังหวะนี้ไว้</h2>
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-moonwalk-silver">
          ระบบเห็นรูปแบบการเดินต่อเนื่องและจังหวะค่อนข้างสม่ำเสมอ
          ไม่ต้องเร่งความเร็ว
        </p>
      </GridPanel>

      <div className="grid grid-cols-2 gap-2">
        {liveFeedbackCards.map(({ label, value, unit, icon: Icon }) => (
          <GridPanel key={label} className="p-2">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
                {label}
              </p>
              <Icon
                className="size-4 shrink-0 text-moonwalk-slate dark:text-moonwalk-silver"
                aria-hidden="true"
              />
            </div>
            <div className="mt-2 flex items-end gap-1">
              <p className="truncate text-2xl font-bold leading-none">
                {value}
              </p>
              <p className="pb-0.5 text-xs font-bold text-moonwalk-slate/70 dark:text-moonwalk-white/65">
                {unit}
              </p>
            </div>
          </GridPanel>
        ))}
      </div>

      <GridPanel className="p-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold leading-none">Current usage</h2>
          <span className="text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
            live
          </span>
        </div>
        <div className="mt-2 grid gap-2">
          <UsageMeter
            label="เป้าหมายเวลาเดิน"
            value={timeProgress}
            helper={`ทำไปแล้ว ${formatSessionTime(elapsedSeconds)} จากเป้าหมาย 12 นาที`}
          />
          <UsageMeter
            label="ความสม่ำเสมอของจังหวะ"
            value={liveRhythm}
            helper="คะแนนนี้เทียบกับ baseline ส่วนตัว"
          />
          <UsageMeter
            label="ความพร้อมของข้อมูล"
            value={94}
            helper="Bluetooth และ sample rate อยู่ในช่วงดี"
          />
        </div>
      </GridPanel>

      <GridPanel className="p-2">
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <div>
            <p className="text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
              คำแนะนำถัดไป
            </p>
            <p className="truncate text-lg font-bold leading-none">
              เดินต่ออีก 2 นาทีด้วยจังหวะเดิม
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

function SignalBars({ bars }: { bars: number[] }) {
  return (
    <div className="flex h-12 items-end gap-1 border-t border-moonwalk-silver pt-2 dark:border-moonwalk-slate min-[430px]:h-14">
      {bars.map((height, index) => (
        <div
          key={`${height}-${index}`}
          className="w-full bg-moonwalk-teal"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function SignalsPage() {
  return (
    <div className="grid gap-2">
      <GridPanel className="border-moonwalk-navy dark:border-moonwalk-white">
        <div className="grid grid-cols-[1fr_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="text-sm text-moonwalk-slate/70 dark:text-moonwalk-white/65">
              Live Signal Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold leading-none">
              สัญญาณสดจากโมดูล
            </h1>
          </div>
          <RadioTower className="size-6 shrink-0" aria-hidden="true" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MiniStatus label="Rate" value="20Hz" tone="green" />
          <MiniStatus label="Lost" value="0.4%" tone="amber" />
          <MiniStatus label="Slot" value="A" />
        </div>
      </GridPanel>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        {liveSignals.map((signal) => (
          <GridPanel key={signal.label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm uppercase text-moonwalk-slate/70 dark:text-moonwalk-white/65">
                  {signal.label}
                </p>
                <p className="mt-1 text-xl font-bold leading-none min-[430px]:text-2xl">
                  {signal.value}
                </p>
              </div>
              <p className="border border-moonwalk-silver px-1.5 py-0.5 text-xs dark:border-moonwalk-slate">
                {signal.unit}
              </p>
            </div>
            <div className="mt-4">
              <SignalBars bars={signal.bars} />
            </div>
          </GridPanel>
        ))}
      </div>

      <GridPanel>
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Waves className="mt-1 size-5" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-bold leading-none">Raw stream</h2>
            <p className="mt-1 text-sm leading-5 text-moonwalk-slate dark:text-moonwalk-silver">
              หน้านี้แสดงสัญญาณสดสำหรับตรวจสอบระบบ
              ไม่ใช้เป็นคำวินิจฉัยหรือการจัดระดับผู้ใช้
            </p>
          </div>
        </div>
      </GridPanel>
    </div>
  );
}

function AddDeviceOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="font-line-seed-th fixed inset-0 z-30 bg-moonwalk-white text-moonwalk-navy dark:bg-moonwalk-navy dark:text-moonwalk-white">
      <div className="grid h-full grid-rows-[auto_1fr_auto]">
        <header className="grid grid-cols-[1fr_auto] items-center border-b border-moonwalk-navy p-3 dark:border-moonwalk-white">
          <div>
            <p className="text-sm text-moonwalk-slate/70 dark:text-moonwalk-white/65">
              Device setup
            </p>
            <h1 className="text-2xl font-bold leading-none">
              เพิ่มอุปกรณ์ของคุณ
            </h1>
          </div>
          <button
            type="button"
            className="grid size-11 place-items-center border border-moonwalk-navy dark:border-moonwalk-white"
            onClick={onClose}
            aria-label="ปิด"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="overflow-y-auto p-2">
          <div className="grid gap-2">
            <section className="border border-moonwalk-silver p-2 dark:border-moonwalk-white/20">
              <h2 className="text-lg font-bold">ข้อมูลอุปกรณ์</h2>
              <div className="mt-2 grid gap-2">
                <label className="grid gap-1">
                  <span className="text-sm text-moonwalk-slate/70 dark:text-moonwalk-white/65">
                    ชื่ออุปกรณ์
                  </span>
                  <input
                    className="h-10 border border-moonwalk-silver bg-moonwalk-white px-2 text-base outline-none focus:border-moonwalk-teal dark:border-moonwalk-white/20 dark:bg-moonwalk-navy"
                    placeholder="เช่น ไม้ค้ำยันของคุณสมชาย"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-moonwalk-slate/70 dark:text-moonwalk-white/65">
                    ประเภทอุปกรณ์
                  </span>
                  <select className="h-10 border border-moonwalk-silver bg-moonwalk-white px-2 text-base outline-none focus:border-moonwalk-teal dark:border-moonwalk-white/20 dark:bg-moonwalk-navy">
                    <option>ไม้เท้า</option>
                    <option>Walker</option>
                    <option>Crutch</option>
                    <option>Rollator</option>
                    <option>อื่นๆ</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-moonwalk-slate/70 dark:text-moonwalk-white/65">
                    ตำแหน่งติดตั้งโมดูล
                  </span>
                  <input
                    className="h-10 border border-moonwalk-silver bg-moonwalk-white px-2 text-base outline-none focus:border-moonwalk-teal dark:border-moonwalk-white/20 dark:bg-moonwalk-navy"
                    placeholder="เช่น ด้านขวาของด้ามจับ"
                  />
                </label>
              </div>
            </section>

            <section className="border border-moonwalk-silver p-2 dark:border-moonwalk-white/20">
              <h2 className="text-lg font-bold">รูปอุปกรณ์</h2>
              <button
                type="button"
                className="mt-2 grid min-h-24 w-full place-items-center border border-dashed border-moonwalk-teal bg-moonwalk-teal/10 text-moonwalk-navy dark:text-moonwalk-white"
              >
                <div className="grid justify-items-center gap-2">
                  <Plus
                    className="size-8 text-moonwalk-teal"
                    aria-hidden="true"
                  />
                  <span className="text-lg font-bold">เพิ่มรูปอุปกรณ์</span>
                </div>
              </button>
            </section>

            <section className="border border-moonwalk-silver p-2 dark:border-moonwalk-white/20">
              <h2 className="text-lg font-bold">คำอธิบาย</h2>
              <textarea
                className="mt-2 min-h-20 w-full resize-none border border-moonwalk-silver bg-moonwalk-white p-2 text-base outline-none focus:border-moonwalk-teal dark:border-moonwalk-white/20 dark:bg-moonwalk-navy"
                placeholder="บันทึกรายละเอียด เช่น ความยาว อุปกรณ์เสริม หรือวิธีติดตั้ง"
              />
            </section>
          </div>
        </div>

        <footer className="grid grid-cols-2 gap-2 border-t border-moonwalk-navy p-2 dark:border-moonwalk-white">
          <button
            type="button"
            className="min-h-12 border border-moonwalk-navy text-lg font-bold dark:border-moonwalk-white"
            onClick={onClose}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="min-h-12 border border-moonwalk-teal bg-moonwalk-teal text-lg font-bold text-moonwalk-navy"
            onClick={onClose}
          >
            บันทึกอุปกรณ์
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function MoonWalkApp() {
  const [activePage, setActivePage] = useState<PageId>("home");
  const [selectedDevice, setSelectedDevice] = useState<DeviceId>("cane");
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);

  const content = useMemo(() => {
    if (activePage === "biofeedback") {
      return <BiofeedbackPage selectedDevice={selectedDevice} />;
    }

    if (activePage === "signals") {
      return <SignalsPage />;
    }

    return <HomePage selectedDevice={selectedDevice} />;
  }, [activePage, selectedDevice]);

  return (
    <main className="min-h-0 overflow-y-auto bg-moonwalk-white text-moonwalk-navy dark:bg-moonwalk-navy dark:text-moonwalk-white">
      <div className="font-line-seed-th mx-auto grid min-h-full w-full max-w-6xl gap-2 px-3 pb-20 pt-0 md:px-5 md:pt-3">
        <StickyDeviceBar
          selectedDevice={selectedDevice}
          onDeviceChange={setSelectedDevice}
          isOpen={isDeviceMenuOpen}
          onToggleOpen={() => setIsDeviceMenuOpen((value) => !value)}
          onAddDevice={() => {
            setIsDeviceMenuOpen(false);
            setIsAddDeviceOpen(true);
          }}
        />

        {content}

        <div className="border border-moonwalk-silver bg-moonwalk-white p-2 text-sm text-moonwalk-slate dark:border-moonwalk-white/20 dark:bg-moonwalk-navy dark:text-moonwalk-white/65">
          <span>
            โมดูลติดตั้งกับ{" "}
            {devices.find((device) => device.id === selectedDevice)?.label}
          </span>
        </div>
      </div>

      <nav
        className="font-line-seed-th fixed inset-x-0 bottom-0 z-20 border-t border-moonwalk-navy bg-moonwalk-white p-0 pb-[env(safe-area-inset-bottom)] text-moonwalk-navy dark:border-moonwalk-white dark:bg-moonwalk-navy dark:text-moonwalk-white"
        aria-label="หน้าหลัก Moon Walk"
      >
        <div className="mx-auto grid max-w-md grid-cols-3 border-x border-moonwalk-navy dark:border-moonwalk-white">
          {pages.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 border-r border-moonwalk-navy px-1 text-sm font-bold leading-none last:border-r-0 dark:border-moonwalk-white",
                activePage === id &&
                  "bg-moonwalk-navy text-moonwalk-white dark:bg-moonwalk-white dark:text-moonwalk-navy",
              )}
              onClick={() => setActivePage(id)}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {isAddDeviceOpen ? (
        <AddDeviceOverlay onClose={() => setIsAddDeviceOpen(false)} />
      ) : null}
    </main>
  );
}
