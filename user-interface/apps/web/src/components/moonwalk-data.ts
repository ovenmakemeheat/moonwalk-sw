import {
  Activity,
  BarChart3,
  Brain,
  Home,
} from "lucide-react";

export type PageId = "home" | "biofeedback" | "signals";
export type DeviceId = "cane" | "walker";

export const pages = [
  { id: "home", label: "หน้าหลัก", icon: Home },
  { id: "biofeedback", label: "ฟีดแบ็ก", icon: Brain },
  { id: "signals", label: "สัญญาณสด", icon: BarChart3 },
] satisfies Array<{ id: PageId; label: string; icon: typeof Home }>;

export const devices = [
  {
    id: "cane",
    label: "ไม้เท้า",
    description: "โมดูลติดตั้งกับไม้เท้าเดี่ยว สำหรับติดตามจังหวะการเดิน",
    iconSrc: "/icons/cane_icon.svg",
  },
  {
    id: "walker",
    label: "Walker",
    description:
      "โมดูลติดตั้งกับ walker หรือ rollator สำหรับติดตามการเคลื่อนที่",
    iconSrc: "/icons/walker_icon.svg",
  },
] satisfies Array<{
  id: DeviceId;
  label: string;
  description: string;
  iconSrc: string;
}>;

export const historyItems = [
  {
    date: "วันนี้",
    equipment: "ไม้เท้า",
    duration: "18 นาที",
    rhythm: "+6 จากฐานของคุณ",
  },
  {
    date: "เมื่อวาน",
    equipment: "walker",
    duration: "14 นาที",
    rhythm: "+3 จากฐานของคุณ",
  },
  {
    date: "จันทร์",
    equipment: "ไม้เท้า",
    duration: "12 นาที",
    rhythm: "เริ่มต้นฐาน",
  },
];

export const recommendations = [
  "เริ่มเดินรอบสั้น 5 นาที ก่อนเพิ่มเวลา",
  "ตรวจว่าโมดูลติดแน่นก่อนเริ่มทุกครั้ง",
  "วันนี้จังหวะคงที่ขึ้น ให้รักษาความเร็วที่รู้สึกสบาย",
];

export const liveSignals = [
  {
    label: "ax",
    value: "0.18",
    unit: "g",
    bars: [20, 44, 38, 62, 55, 71, 48, 59, 77, 51, 69, 83],
  },
  {
    label: "ay",
    value: "-0.04",
    unit: "g",
    bars: [31, 28, 46, 42, 64, 58, 49, 66, 53, 48],
  },
  {
    label: "az",
    value: "0.96",
    unit: "g",
    bars: [72, 69, 76, 71, 80, 74, 78, 73, 79, 75, 82, 77],
  },
  {
    label: "gx",
    value: "12.4",
    unit: "dps",
    bars: [35, 52, 41, 67, 74, 63, 58, 81, 73, 66, 84, 70],
  },
  {
    label: "gy",
    value: "-8.7",
    unit: "dps",
    bars: [62, 56, 49, 44, 51, 39, 46, 58, 42, 37, 53, 48],
  },
  {
    label: "gz",
    value: "3.1",
    unit: "dps",
    bars: [18, 24, 33, 28, 39, 44, 36, 31, 47, 52, 43, 40],
  },
];
