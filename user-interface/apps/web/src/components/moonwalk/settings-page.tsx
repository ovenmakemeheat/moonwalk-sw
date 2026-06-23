"use client";

import { Activity, Bluetooth, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { GridPanel } from "@/components/moonwalk/panel";
import type {
  BluetoothConnectionState,
  BluetoothDeviceSnapshot,
} from "@/hooks/use-bluetooth-device";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@user-interface/ui/lib/utils";

function ThemeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Sun;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "grid min-h-12 grid-cols-[auto_1fr] items-center gap-2 border border-moonwalk-silver px-2 text-left font-bold dark:border-moonwalk-white/20",
        active &&
          "border-moonwalk-navy bg-moonwalk-navy text-moonwalk-white dark:border-moonwalk-white dark:bg-moonwalk-white dark:text-moonwalk-navy",
      )}
      onClick={onClick}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

export function SettingsPage({
  bluetoothDevice,
  bluetoothState,
  onOpenBluetooth,
}: {
  bluetoothDevice: BluetoothDeviceSnapshot | null;
  bluetoothState: BluetoothConnectionState;
  onOpenBluetooth: () => void;
}) {
  const isMounted = useMounted();
  const { setTheme, theme } = useTheme();
  const currentTheme = isMounted ? theme : "system";

  return (
    <div className="grid gap-2">
      <GridPanel className="border-moonwalk-navy bg-moonwalk-navy text-moonwalk-white dark:border-moonwalk-white">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase leading-none text-moonwalk-silver">
              Moon Walk
            </p>
            <h1 className="mt-1 text-xl font-bold leading-none">ตั้งค่า</h1>
          </div>
          <div className="grid size-10 place-items-center border border-moonwalk-teal text-moonwalk-teal">
            <Settings className="size-5" aria-hidden="true" />
          </div>
        </div>
      </GridPanel>

      <div className="grid gap-2 md:grid-cols-2">
        <GridPanel>
          <div className="flex items-center gap-2">
            <Sun className="size-5" aria-hidden="true" />
            <h2 className="text-lg font-bold leading-none">ธีม</h2>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ThemeButton
              active={currentTheme === "light"}
              icon={Sun}
              label="สว่าง"
              onClick={() => setTheme("light")}
            />
            <ThemeButton
              active={currentTheme === "dark"}
              icon={Moon}
              label="มืด"
              onClick={() => setTheme("dark")}
            />
            <ThemeButton
              active={currentTheme === "system"}
              icon={Activity}
              label="ระบบ"
              onClick={() => setTheme("system")}
            />
          </div>
        </GridPanel>

        <GridPanel>
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Bluetooth className="size-5" aria-hidden="true" />
                <h2 className="text-lg font-bold leading-none">Bluetooth</h2>
              </div>
              <p className="mt-2 truncate text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
                {bluetoothDevice?.name ?? "ยังไม่ได้เลือกอุปกรณ์"}
              </p>
            </div>
            <p className="border border-moonwalk-silver px-2 py-1 text-xs font-bold uppercase dark:border-moonwalk-white/20">
              {bluetoothState}
            </p>
          </div>
          <button
            type="button"
            className="mt-2 min-h-12 w-full border border-moonwalk-teal bg-moonwalk-teal text-base font-bold text-moonwalk-navy"
            onClick={onOpenBluetooth}
          >
            จัดการการเชื่อมต่อ
          </button>
        </GridPanel>
      </div>

      <GridPanel>
        <h2 className="text-lg font-bold leading-none">ตัวเลือก</h2>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <div className="grid min-h-11 grid-cols-[1fr_auto] items-center border border-moonwalk-silver px-2 dark:border-moonwalk-white/20">
            <span className="font-bold">ภาษา</span>
            <span className="text-xs text-moonwalk-slate dark:text-moonwalk-silver">
              ไทย
            </span>
          </div>
          <div className="grid min-h-11 grid-cols-[1fr_auto] items-center border border-moonwalk-silver px-2 dark:border-moonwalk-white/20">
            <span className="font-bold">หน้าจอ</span>
            <span className="text-xs text-moonwalk-slate dark:text-moonwalk-silver">
              Mobile
            </span>
          </div>
        </div>
      </GridPanel>
    </div>
  );
}
