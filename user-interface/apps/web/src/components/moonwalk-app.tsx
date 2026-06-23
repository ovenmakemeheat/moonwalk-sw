"use client";

import { useEffect, useMemo, useState } from "react";

import { AddDeviceOverlay } from "@/components/moonwalk/add-device-overlay";
import { BiofeedbackPage } from "@/components/moonwalk/biofeedback-page";
import { BluetoothConnectOverlay } from "@/components/moonwalk/bluetooth-connect-overlay";
import { BottomNav } from "@/components/moonwalk/bottom-nav";
import { StickyDeviceBar } from "@/components/moonwalk/device-bar";
import { HomePage } from "@/components/moonwalk/home-page";
import { LiveRehabMode } from "@/components/moonwalk/live-rehab-mode";
import { SettingsPage } from "@/components/moonwalk/settings-page";
import { SignalsPage } from "@/components/moonwalk/signals-page";
import { devices, type DeviceId, type PageId } from "@/components/moonwalk-data";
import { useBluetoothDevice } from "@/hooks/use-bluetooth-device";
import { useMounted } from "@/hooks/use-mounted";
import { formatSessionTime } from "@/lib/format";
import {
  calculateBiofeedbackMetrics,
  type BiofeedbackBaseline,
} from "@/lib/biofeedback-metrics";
import type { NanoImuSample } from "@/lib/nano-imu";
import { Activity } from "lucide-react";

function getQualityTextColor(percent: number) {
  if (percent < 34) {
    return "text-red-600 dark:text-red-400";
  }

  if (percent < 67) {
    return "text-yellow-600 dark:text-yellow-300";
  }

  return "text-moonwalk-teal";
}

export default function MoonWalkApp() {
  const isMounted = useMounted();
  const [activePage, setActivePage] = useState<PageId>("home");
  const [selectedDevice, setSelectedDevice] = useState<DeviceId>("cane");
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [isBluetoothOpen, setIsBluetoothOpen] = useState(false);
  const [sampleHistory, setSampleHistory] = useState<NanoImuSample[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(522);
  const bluetooth = useBluetoothDevice();

  const selectedDeviceLabel = devices.find(
    (device) => device.id === selectedDevice,
  )?.label;
  const baseline = useMemo<BiofeedbackBaseline>(
    () => ({
      activationMad: 0.55,
      activationMedian: 0.85,
      cadenceMedian: 82,
      dutyFactorMedian: 43,
      baselinePressureDeltaPa: 7_730,
      rhythmMedian: 86,
      sessionCount: 7,
    }),
    [],
  );
  const biofeedbackMetrics = useMemo(
    () => calculateBiofeedbackMetrics(sampleHistory, { baseline }),
    [baseline, sampleHistory],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const nextSample = bluetooth.latestSample;

    if (!nextSample) {
      return;
    }

    setSampleHistory((current) => {
      const latest = current.at(-1);

      if (latest?.timestamp_ms === nextSample.timestamp_ms) {
        return current;
      }

      return [...current.slice(-499), nextSample];
    });
  }, [bluetooth.latestSample]);

  const content = useMemo(() => {
    if (activePage === "biofeedback") {
      return (
        <BiofeedbackPage
          isBluetoothConnected={bluetooth.isConnected}
          metrics={biofeedbackMetrics}
        />
      );
    }

    if (activePage === "signals") {
      return (
        <SignalsPage
          badPacketCount={bluetooth.badPacketCount}
          isBluetoothConnected={bluetooth.isConnected}
          latestSample={bluetooth.latestSample}
          packetCount={bluetooth.packetCount}
        />
      );
    }

    if (activePage === "settings") {
      return (
        <SettingsPage
          bluetoothDevice={bluetooth.device}
          bluetoothState={bluetooth.state}
          onOpenBluetooth={() => setIsBluetoothOpen(true)}
        />
      );
    }

    return (
      <HomePage
        selectedDevice={selectedDevice}
        isBluetoothConnected={bluetooth.isConnected}
        metrics={biofeedbackMetrics}
      />
    );
  }, [
    activePage,
    biofeedbackMetrics,
    bluetooth.badPacketCount,
    bluetooth.isConnected,
    bluetooth.latestSample,
    bluetooth.packetCount,
    bluetooth.state,
    selectedDevice,
  ]);

  const liveWalkingPanel = (
    <div className="p-2">
      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
            Live walking state
          </p>
          <h1 className="mt-1 text-xl font-bold leading-none">
            {bluetooth.isConnected && biofeedbackMetrics.isIdle
              ? "Idle"
              : biofeedbackMetrics.activationLabel}
          </h1>
        </div>
        <div className="grid size-9 shrink-0 place-items-center border border-moonwalk-teal text-moonwalk-teal">
          <Activity className="size-5" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 border border-moonwalk-silver dark:border-moonwalk-slate">
        <div className="border-r border-moonwalk-silver p-2 dark:border-moonwalk-slate">
          <p className="text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
            เวลา
          </p>
          <p className="mt-1 text-base font-bold leading-none">
            {formatSessionTime(elapsedSeconds)}
          </p>
        </div>
        <div className="border-r border-moonwalk-silver p-2 dark:border-moonwalk-slate">
          <p className="text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
            อุปกรณ์
          </p>
          <p className="mt-1 truncate text-base font-bold leading-none">
            {selectedDeviceLabel}
          </p>
        </div>
        <div className="p-2">
          <p className="text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
            คุณภาพ
          </p>
          <div className="mt-1 grid gap-1">
            <div className="flex items-center justify-between gap-1">
              <p
                className={`truncate text-[11px] font-bold leading-none ${getQualityTextColor(
                  biofeedbackMetrics.overallQualityPercent,
                )}`}
              >
                {biofeedbackMetrics.sampleCount === 0 && bluetooth.isConnected
                  ? "รอสัญญาณ"
                  : biofeedbackMetrics.overallQualityLabel}
              </p>
              <p className="text-[10px] font-bold leading-none tabular-nums text-moonwalk-slate/70 dark:text-moonwalk-white/65">
                {Math.round(biofeedbackMetrics.overallQualityPercent)}%
              </p>
            </div>
            <div className="relative h-2 border border-moonwalk-silver dark:border-moonwalk-white/20">
              <div className="grid h-full grid-cols-3">
                <span className="bg-red-600" />
                <span className="bg-yellow-400" />
                <span className="bg-moonwalk-teal" />
              </div>
              <span
                className="absolute top-[-3px] h-3 w-0.5 bg-moonwalk-white shadow-[0_0_0_1px_#0b101f]"
                style={{
                  left: `${Math.max(
                    0,
                    Math.min(100, biofeedbackMetrics.overallQualityPercent),
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isMounted) {
    return (
      <main className="h-full overflow-y-auto bg-moonwalk-white text-moonwalk-navy md:pl-48 dark:bg-moonwalk-navy dark:text-moonwalk-white">
        <div className="font-line-seed-th mx-auto grid min-h-full w-full max-w-6xl gap-2 px-3 pb-20 pt-0 md:px-6 md:pt-4 lg:px-8">
          <section className="sticky top-0 z-10 -mx-3 border-y border-moonwalk-navy bg-moonwalk-white text-moonwalk-navy dark:border-moonwalk-white dark:bg-moonwalk-navy dark:text-moonwalk-white md:mx-0 md:border-x">
            <div className="h-12 border-b border-moonwalk-white bg-moonwalk-navy" />
            <div className="h-12" />
          </section>
          <section className="h-32 border border-moonwalk-navy bg-moonwalk-navy" />
          <section className="h-24 border border-moonwalk-silver dark:border-moonwalk-slate" />
        </div>
      </main>
    );
  }

  return (
    <main className="h-full overflow-y-auto bg-moonwalk-white text-moonwalk-navy md:pl-48 dark:bg-moonwalk-navy dark:text-moonwalk-white">
      <div className="font-line-seed-th mx-auto grid min-h-full w-full max-w-6xl gap-2 px-3 pb-20 pt-0 md:px-6 md:pt-4 lg:px-8">
        <StickyDeviceBar
          selectedDevice={selectedDevice}
          onDeviceChange={setSelectedDevice}
          isOpen={isDeviceMenuOpen}
          onToggleOpen={() => setIsDeviceMenuOpen((value) => !value)}
          onAddDevice={() => {
            setIsDeviceMenuOpen(false);
            setIsAddDeviceOpen(true);
          }}
          bluetoothDevice={bluetooth.device}
          bluetoothError={bluetooth.error}
          bluetoothState={bluetooth.state}
          isBluetoothPending={bluetooth.isPending}
          onBluetoothConnect={() => setIsBluetoothOpen(true)}
          onBluetoothDisconnect={bluetooth.disconnect}
          stickyBelow={liveWalkingPanel}
        />

        {content}

        <LiveRehabMode
          deviceLabel={selectedDeviceLabel ?? selectedDevice}
          isBluetoothConnected={bluetooth.isConnected}
          metrics={biofeedbackMetrics}
        />

        <div className="border border-moonwalk-silver bg-moonwalk-white p-2 text-xs text-moonwalk-slate dark:border-moonwalk-white/20 dark:bg-moonwalk-navy dark:text-moonwalk-white/65">
          <span>โมดูลติดตั้งกับ {selectedDeviceLabel}</span>
        </div>
      </div>

      <BottomNav activePage={activePage} onPageChange={setActivePage} />

      {isAddDeviceOpen ? (
        <AddDeviceOverlay onClose={() => setIsAddDeviceOpen(false)} />
      ) : null}

      {isBluetoothOpen ? (
        <BluetoothConnectOverlay
          connectedDevice={bluetooth.device}
          error={bluetooth.error}
          isPending={bluetooth.isPending}
          knownDevices={bluetooth.knownDevices}
          onClose={() => setIsBluetoothOpen(false)}
          onConnect={bluetooth.connect}
          onConnectKnownDevice={bluetooth.connectKnownDevice}
          onDisconnect={bluetooth.disconnect}
          onRefreshKnownDevices={bluetooth.refreshKnownDevices}
          state={bluetooth.state}
        />
      ) : null}
    </main>
  );
}
