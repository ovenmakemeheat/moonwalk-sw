"use client";

import {
  Bluetooth,
  Check,
  Loader2,
  RadioTower,
  Search,
  X,
} from "lucide-react";

import type {
  BluetoothConnectMode,
  BluetoothConnectionState,
  BluetoothDeviceSnapshot,
} from "@/hooks/use-bluetooth-device";
import {
  NANO_IMU_CHAR_UUID,
  NANO_IMU_DEVICE_NAME,
  NANO_IMU_SERVICE_UUID,
} from "@/lib/nano-imu";
import { cn } from "@user-interface/ui/lib/utils";

function DeviceRow({
  device,
  isSelected,
  onConnect,
}: {
  device: BluetoothDeviceSnapshot;
  isSelected: boolean;
  onConnect: () => void;
}) {
  const isNano = device.name.startsWith(NANO_IMU_DEVICE_NAME);

  return (
    <button
      type="button"
      className={cn(
        "grid min-h-14 w-full grid-cols-[44px_1fr_auto] items-center gap-2 border-b border-moonwalk-silver px-2 py-1.5 text-left last:border-b-0 dark:border-moonwalk-white/15",
        isSelected && "bg-moonwalk-teal/15",
      )}
      onClick={onConnect}
    >
      <div
        className={cn(
          "grid size-11 place-items-center border border-moonwalk-silver dark:border-moonwalk-white/20",
          isNano && "border-moonwalk-teal bg-moonwalk-teal/10",
        )}
      >
        <Bluetooth
          className={cn("size-5", isNano && "text-moonwalk-teal")}
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-none">
          {device.name}
        </p>
        <p className="mt-1 truncate text-[11px] leading-none text-moonwalk-slate/70 dark:text-moonwalk-white/60">
          {isNano ? "รองรับ NanoIMU stream" : `อนุญาตแล้ว / ${device.id}`}
        </p>
      </div>
      {isSelected ? (
        <Check className="size-5 text-moonwalk-teal" aria-hidden="true" />
      ) : null}
    </button>
  );
}

export function BluetoothConnectOverlay({
  connectedDevice,
  error,
  isPending,
  knownDevices,
  onClose,
  onConnect,
  onConnectKnownDevice,
  onDisconnect,
  onRefreshKnownDevices,
  state,
}: {
  connectedDevice: BluetoothDeviceSnapshot | null;
  error: string | null;
  isPending: boolean;
  knownDevices: BluetoothDeviceSnapshot[];
  onClose: () => void;
  onConnect: (mode: BluetoothConnectMode) => void;
  onConnectKnownDevice: (deviceId: string) => void;
  onDisconnect: () => void;
  onRefreshKnownDevices: () => void;
  state: BluetoothConnectionState;
}) {
  const isConnected = state === "connected";
  const isUnsupported = state === "unsupported";
  const isIosUnsupported = state === "ios-unsupported";

  return (
    <div className="font-line-seed-th fixed inset-0 z-40 bg-moonwalk-white text-moonwalk-navy md:flex md:items-center md:justify-center md:bg-moonwalk-navy/60 md:dark:bg-black/60 dark:bg-moonwalk-navy dark:text-moonwalk-white">
      <div className="grid h-full grid-rows-[auto_1fr_auto] md:h-auto md:max-h-[85vh] md:w-full md:max-w-lg md:border md:border-moonwalk-navy md:bg-moonwalk-white md:shadow-xl md:dark:border-moonwalk-white md:dark:bg-moonwalk-navy">
        <header className="grid grid-cols-[1fr_auto] items-center border-b border-moonwalk-navy p-3 dark:border-moonwalk-white">
          <div className="min-w-0">
            <p className="text-xs uppercase leading-none text-moonwalk-slate/70 dark:text-moonwalk-white/60">
              Bluetooth setup
            </p>
            <h1 className="mt-1 truncate text-xl font-bold leading-none">
              เชื่อมต่ออุปกรณ์
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
            <section className="border border-moonwalk-navy bg-moonwalk-navy p-2 text-moonwalk-white dark:border-moonwalk-white">
              <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-moonwalk-silver">
                    Recommended device
                  </p>
                  <h2 className="mt-1 text-lg font-bold leading-none">
                    {NANO_IMU_DEVICE_NAME}
                  </h2>
                  <p className="mt-2 break-all text-[11px] leading-4 text-moonwalk-silver">
                    {NANO_IMU_SERVICE_UUID}
                  </p>
                </div>
                <div className="grid size-10 place-items-center border border-moonwalk-teal text-moonwalk-teal">
                  <RadioTower className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-2 border border-moonwalk-white/20 p-2">
                <p className="text-[10px] uppercase leading-none text-moonwalk-silver">
                  characteristic
                </p>
                <p className="mt-1 break-all text-xs font-bold leading-4">
                  {NANO_IMU_CHAR_UUID}
                </p>
              </div>
            </section>

            <section className="border border-moonwalk-silver dark:border-moonwalk-white/20">
              <div className="grid grid-cols-[1fr_auto] items-center border-b border-moonwalk-silver p-2 dark:border-moonwalk-white/20">
                <div>
                  <h2 className="text-base font-bold leading-none">
                    อุปกรณ์ที่เคยอนุญาต
                  </h2>
                  <p className="mt-1 text-xs leading-none text-moonwalk-slate/70 dark:text-moonwalk-white/60">
                    เบราว์เซอร์จะแสดงเฉพาะอุปกรณ์ที่เคยเลือกไว้
                  </p>
                </div>
                <button
                  type="button"
                  className="border border-moonwalk-navy px-2 py-1 text-xs font-bold dark:border-moonwalk-white"
                  onClick={onRefreshKnownDevices}
                >
                  รีเฟรช
                </button>
              </div>
              {knownDevices.length > 0 ? (
                knownDevices.map((device) => (
                  <DeviceRow
                    key={device.id}
                    device={device}
                    isSelected={connectedDevice?.id === device.id}
                    onConnect={() => onConnectKnownDevice(device.id)}
                  />
                ))
              ) : (
                <div className="p-3 text-xs text-moonwalk-slate/75 dark:text-moonwalk-white/65">
                  ยังไม่มีอุปกรณ์ที่อนุญาตไว้ กดค้นหาเพื่อเปิดหน้าต่างของเบราว์เซอร์
                </div>
              )}
            </section>

            {error ? (
              <div className="border border-moonwalk-teal bg-moonwalk-teal/10 p-2 text-xs font-bold leading-5">
                {error}
              </div>
            ) : null}

            {isIosUnsupported ? (
              <section className="border border-moonwalk-navy p-2 dark:border-moonwalk-white">
                <h2 className="text-base font-bold leading-none">
                  วิธีใช้บน iPhone / iPad
                </h2>
                <div className="mt-2 grid gap-2 text-xs leading-5 text-moonwalk-slate/80 dark:text-moonwalk-white/70">
                  <p>
                    Safari บน iOS ยังไม่เปิด Web Bluetooth ให้เว็บไซต์เชื่อมต่อ BLE โดยตรง
                    จึงค้นหา NanoIMU จาก Safari ไม่ได้
                  </p>
                  <div className="border border-moonwalk-silver p-2 dark:border-moonwalk-white/20">
                    <p className="font-bold text-moonwalk-navy dark:text-moonwalk-white">
                      ตัวเลือกที่ใช้ได้ตอนนี้
                    </p>
                    <p className="mt-1">
                      เปิดเว็บนี้ผ่านแอปเบราว์เซอร์ iOS ที่มี Web Bluetooth bridge เช่น
                      WebBLE หรือ Bluefy แล้วกดค้นหา NanoIMU จากในแอปนั้น
                    </p>
                  </div>
                  <div className="border border-moonwalk-silver p-2 dark:border-moonwalk-white/20">
                    <p className="font-bold text-moonwalk-navy dark:text-moonwalk-white">
                      ทางเลือกที่เสถียรกว่า
                    </p>
                    <p className="mt-1">
                      ทำแอป iOS native ด้วย CoreBluetooth แล้วส่งข้อมูลเข้าเว็บผ่าน API
                      หรือเปิดหน้าจอ Moon Walk ในแอปโดยตรง
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            {isUnsupported ? (
              <div className="border border-moonwalk-silver p-2 text-xs leading-5 dark:border-moonwalk-white/20">
                Web Bluetooth ต้องใช้ Chrome/Edge บน localhost หรือ HTTPS
              </div>
            ) : null}
          </div>
        </div>

        <footer className="grid gap-2 border-t border-moonwalk-navy p-2 dark:border-moonwalk-white">
          {isConnected ? (
            <button
              type="button"
              className="min-h-12 border border-moonwalk-navy text-base font-bold dark:border-moonwalk-white"
              onClick={onDisconnect}
            >
              ตัดการเชื่อมต่อ
            </button>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="grid min-h-12 grid-cols-[auto_auto] place-content-center items-center gap-2 border border-moonwalk-teal bg-moonwalk-teal text-sm font-bold text-moonwalk-navy disabled:opacity-50"
              onClick={() => onConnect("supported")}
              disabled={isPending || isUnsupported || isIosUnsupported}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="size-4" aria-hidden="true" />
              )}
              <span>NanoIMU</span>
            </button>
            <button
              type="button"
              className="grid min-h-12 grid-cols-[auto_auto] place-content-center items-center gap-2 border border-moonwalk-navy text-sm font-bold disabled:opacity-50 dark:border-moonwalk-white"
              onClick={() => onConnect("all")}
              disabled={isPending || isUnsupported || isIosUnsupported}
            >
              <Bluetooth className="size-4" aria-hidden="true" />
              <span>ทั้งหมด</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
