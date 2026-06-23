"use client";

import {
  Bluetooth,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Unplug,
} from "lucide-react";

import { devices, type DeviceId } from "@/components/moonwalk-data";
import type {
  BluetoothConnectionState,
  BluetoothDeviceSnapshot,
} from "@/hooks/use-bluetooth-device";
import { cn } from "@user-interface/ui/lib/utils";
import type { ReactNode } from "react";

function getBluetoothCopy(
  state: BluetoothConnectionState,
  device: BluetoothDeviceSnapshot | null,
) {
  if (state === "connected") {
    return {
      label: "Bluetooth connected",
      detail: device?.name ?? "อุปกรณ์เชื่อมต่อแล้ว",
      action: "ตัดการเชื่อมต่อ",
      live: "LIVE",
    };
  }

  if (state === "searching") {
    return {
      label: "กำลังค้นหาอุปกรณ์",
      detail: "เลือกอุปกรณ์ Bluetooth จากหน้าต่างของเบราว์เซอร์",
      action: "กำลังค้นหา",
      live: "SCAN",
    };
  }

  if (state === "connecting") {
    return {
      label: "กำลังเชื่อมต่อ",
      detail: device?.name ?? "กำลังเปิด GATT connection",
      action: "กำลังเชื่อมต่อ",
      live: "PAIR",
    };
  }

  if (state === "ios-unsupported") {
    return {
      label: "บลูทูธบน iOS ต้องใช้แอปช่วย",
      detail: "Safari บน iPhone/iPad ไม่รองรับ Web Bluetooth โดยตรง",
      action: "ดูวิธีใช้",
      live: "iOS",
    };
  }

  if (state === "unsupported") {
    return {
      label: "Bluetooth ไม่พร้อมใช้งาน",
      detail: "ต้องใช้ Chrome/Edge บน HTTPS หรือ localhost",
      action: "ไม่รองรับ",
      live: "OFF",
    };
  }

  if (state === "error") {
    return {
      label: "Bluetooth เชื่อมต่อไม่สำเร็จ",
      detail: "แตะเพื่อค้นหาและลองเชื่อมต่อใหม่",
      action: "ลองใหม่",
      live: "ERR",
    };
  }

  return {
    label: "Bluetooth ยังไม่เชื่อมต่อ",
    detail: "แตะค้นหาเพื่อเลือกอุปกรณ์จากเว็บไซต์",
    action: "ค้นหาอุปกรณ์",
    live: "OFF",
  };
}

export function StickyDeviceBar({
  selectedDevice,
  onDeviceChange,
  isOpen,
  onToggleOpen,
  onAddDevice,
  bluetoothDevice,
  bluetoothError,
  bluetoothState,
  isBluetoothPending,
  onBluetoothConnect,
  onBluetoothDisconnect,
  stickyBelow,
}: {
  selectedDevice: DeviceId;
  onDeviceChange: (device: DeviceId) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onAddDevice: () => void;
  bluetoothDevice: BluetoothDeviceSnapshot | null;
  bluetoothError: string | null;
  bluetoothState: BluetoothConnectionState;
  isBluetoothPending: boolean;
  onBluetoothConnect: () => void;
  onBluetoothDisconnect: () => void;
  stickyBelow?: ReactNode;
}) {
  const selected =
    devices.find((device) => device.id === selectedDevice) ?? devices[0];
  const bluetoothCopy = getBluetoothCopy(bluetoothState, bluetoothDevice);
  const isBluetoothConnected = bluetoothState === "connected";
  const canOpenBluetooth = bluetoothState !== "unsupported";

  return (
    <section className="sticky top-0 z-30 -mx-3 border-y border-moonwalk-navy bg-moonwalk-white text-moonwalk-navy shadow-[0_1px_0_rgba(11,16,31,0.18)] md:mx-0 md:border-x dark:border-moonwalk-white dark:bg-moonwalk-navy dark:text-moonwalk-white">
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-moonwalk-white bg-moonwalk-navy px-3 py-1.5 text-moonwalk-white">
        <div className="flex min-w-0 items-center gap-2">
          <Bluetooth
            className={cn(
              "size-4 shrink-0",
              isBluetoothConnected ? "text-moonwalk-teal" : "text-moonwalk-white",
            )}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-none">
              {bluetoothCopy.label}
            </p>
            <p className="mt-0.5 truncate text-[11px] leading-none text-moonwalk-silver">
              {bluetoothError ?? bluetoothCopy.detail}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="grid min-h-9 grid-cols-[auto_auto] items-center gap-1 border border-moonwalk-white px-2 text-xs font-bold text-moonwalk-white disabled:opacity-50"
          onClick={
            isBluetoothConnected ? onBluetoothDisconnect : onBluetoothConnect
          }
          disabled={!canOpenBluetooth || isBluetoothPending}
        >
          {isBluetoothPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : isBluetoothConnected ? (
            <Unplug className="size-3.5" aria-hidden="true" />
          ) : (
            <Bluetooth className="size-3.5" aria-hidden="true" />
          )}
          <span>{isBluetoothPending ? bluetoothCopy.live : bluetoothCopy.action}</span>
        </button>
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
            className="h-8 w-8 object-contain dark:brightness-0 dark:invert"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-none">
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
                    className="h-11 w-11 object-contain dark:brightness-0 dark:invert"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold leading-none">
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
              <p className="text-base font-bold leading-none">
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

      {stickyBelow ? (
        <div className="border-t border-moonwalk-navy bg-moonwalk-white dark:border-moonwalk-white/25 dark:bg-moonwalk-navy">
          {stickyBelow}
        </div>
      ) : null}
    </section>
  );
}
