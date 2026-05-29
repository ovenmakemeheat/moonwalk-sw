import type { BiofeedbackMetrics } from "@/lib/biofeedback-metrics";

export type LiveRehabMetricSnapshot = {
  capturedAt: string;
  source: "live" | "mock";
  sampleCount: number;
  durationMs: number;
  action: string;
  recommendation: string;
  activationLabel: string;
  overallQualityPercent: number;
  confidence: number;
  rhythmScore: number | null;
  cadenceSpm: number | null;
  dutyFactorPercent: number | null;
  loadPercent: number;
  loadControlLabel: string;
  targetCompliancePercent: number | null;
  sessionWeightSupportTrainingLoad: number | null;
  fatigueLabel: string;
  fatigueSlope: number | null;
  mobilityStrain: number;
  isIdle: boolean;
};

export type LiveRehabCoachRequest = {
  deviceLabel: string;
  isBluetoothConnected: boolean;
  history: LiveRehabMetricSnapshot[];
};

export type LiveRehabCoachResponse = {
  text: string;
  source: "openrouter" | "fallback";
};

export type LiveRehabVoiceResponse = {
  audioUrl: string;
  point?: number;
  provider?: string;
  userMonthlyPoint?: number;
  voice?: string;
};

export function createLiveRehabSnapshot(
  metrics: BiofeedbackMetrics,
): LiveRehabMetricSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    source: "live",
    sampleCount: metrics.sampleCount,
    durationMs: metrics.durationMs,
    action: metrics.action,
    recommendation: metrics.recommendation,
    activationLabel: metrics.activationLabel,
    overallQualityPercent: Math.round(metrics.overallQualityPercent),
    confidence: Number(metrics.confidence.toFixed(2)),
    rhythmScore:
      metrics.rhythmScore === null ? null : Math.round(metrics.rhythmScore),
    cadenceSpm:
      metrics.cadenceSpm === null ? null : Math.round(metrics.cadenceSpm),
    dutyFactorPercent:
      metrics.dutyFactorPercent === null
        ? null
        : Math.round(metrics.dutyFactorPercent),
    loadPercent: Math.round(metrics.loadPercent),
    loadControlLabel: metrics.loadControlLabel,
    targetCompliancePercent:
      metrics.targetCompliancePercent === null
        ? null
        : Math.round(metrics.targetCompliancePercent),
    sessionWeightSupportTrainingLoad:
      metrics.sessionWeightSupportTrainingLoad === null
        ? null
        : Math.round(metrics.sessionWeightSupportTrainingLoad),
    fatigueLabel: metrics.fatigueLabel,
    fatigueSlope:
      metrics.fatigueSlope === null
        ? null
        : Number(metrics.fatigueSlope.toFixed(2)),
    mobilityStrain: Number(metrics.mobilityStrain.toFixed(1)),
    isIdle: metrics.isIdle,
  };
}

export function createMockLiveRehabSnapshot(
  index: number,
): LiveRehabMetricSnapshot {
  const phase = index / 2;
  const rhythmScore = Math.round(78 + Math.sin(phase) * 8);
  const cadenceSpm = Math.round(82 + Math.sin(phase * 0.8) * 7);
  const dutyFactorPercent = Math.round(43 + Math.cos(phase * 0.7) * 5);
  const loadPercent = Math.round(58 + Math.sin(phase * 1.1) * 18);
  const confidence = index < 2 ? 0.42 : 0.78;
  const fatigueSlope = Math.max(0, Math.min(0.7, 0.18 + index * 0.015));
  const isLoadHigh = loadPercent > 73;
  const isRhythmLow = rhythmScore < 72;
  const fatigueLabel =
    fatigueSlope > 0.66 ? "ควรพัก" : fatigueSlope > 0.34 ? "เริ่มล้า" : "ยังคงที่";

  return {
    capturedAt: new Date().toISOString(),
    source: "mock",
    sampleCount: 120 + index * 12,
    durationMs: (index + 1) * 5_000,
    action: isLoadHigh
      ? "ลงน้ำหนักมาก"
      : isRhythmLow
        ? "จังหวะไม่สม่ำเสมอ"
        : "เดินต่อเนื่อง",
    recommendation: isLoadHigh
      ? "ลดแรงกดที่ด้ามจับ"
      : isRhythmLow
        ? "ชะลอและรักษาจังหวะให้เท่ากัน"
        : "คงจังหวะนี้ไว้",
    activationLabel:
      fatigueSlope > 0.45 ? "ใช้แรงสูง" : "กำลังเดินปกติ",
    overallQualityPercent: Math.round(
      (rhythmScore + dutyFactorPercent + Math.max(45, 100 - loadPercent / 2)) /
        3,
    ),
    confidence,
    rhythmScore,
    cadenceSpm,
    dutyFactorPercent,
    loadPercent,
    loadControlLabel: isLoadHigh ? "กดมากไป" : "อยู่ในเป้าหมาย",
    targetCompliancePercent: Math.round(isLoadHigh ? 54 : 82),
    sessionWeightSupportTrainingLoad: Math.round(isLoadHigh ? 49 : 71),
    fatigueLabel,
    fatigueSlope: Number(fatigueSlope.toFixed(2)),
    mobilityStrain: Number((4 + index * 0.25 + (isLoadHigh ? 2 : 0)).toFixed(1)),
    isIdle: false,
  };
}
