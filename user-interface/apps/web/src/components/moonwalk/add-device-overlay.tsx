"use client";

import { Plus, X } from "lucide-react";

export function AddDeviceOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="font-line-seed-th fixed inset-0 z-30 bg-moonwalk-white text-moonwalk-navy md:flex md:items-center md:justify-center md:bg-moonwalk-navy/60 md:dark:bg-black/60 dark:bg-moonwalk-navy dark:text-moonwalk-white">
      <div className="grid h-full grid-rows-[auto_1fr_auto] md:h-auto md:max-h-[85vh] md:w-full md:max-w-lg md:border md:border-moonwalk-navy md:bg-moonwalk-white md:shadow-xl md:dark:border-moonwalk-white md:dark:bg-moonwalk-navy">
        <header className="grid grid-cols-[1fr_auto] items-center border-b border-moonwalk-navy p-3 dark:border-moonwalk-white">
          <div>
            <p className="text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
              Device setup
            </p>
            <h1 className="text-xl font-bold leading-none">
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
              <h2 className="text-base font-bold">ข้อมูลอุปกรณ์</h2>
              <div className="mt-2 grid gap-2">
                <label className="grid gap-1">
                  <span className="text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
                    ชื่ออุปกรณ์
                  </span>
                  <input
                    className="h-10 border border-moonwalk-silver bg-moonwalk-white px-2 text-sm outline-none focus:border-moonwalk-teal dark:border-moonwalk-white/20 dark:bg-moonwalk-navy"
                    placeholder="เช่น ไม้ค้ำยันของคุณสมชาย"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
                    ประเภทอุปกรณ์
                  </span>
                  <select className="h-10 border border-moonwalk-silver bg-moonwalk-white px-2 text-sm outline-none focus:border-moonwalk-teal dark:border-moonwalk-white/20 dark:bg-moonwalk-navy">
                    <option>ไม้เท้า</option>
                    <option>Walker</option>
                    <option>Crutch</option>
                    <option>Rollator</option>
                    <option>อื่นๆ</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-moonwalk-slate/70 dark:text-moonwalk-white/65">
                    ตำแหน่งติดตั้งโมดูล
                  </span>
                  <input
                    className="h-10 border border-moonwalk-silver bg-moonwalk-white px-2 text-sm outline-none focus:border-moonwalk-teal dark:border-moonwalk-white/20 dark:bg-moonwalk-navy"
                    placeholder="เช่น ด้านขวาของด้ามจับ"
                  />
                </label>
              </div>
            </section>

            <section className="border border-moonwalk-silver p-2 dark:border-moonwalk-white/20">
              <h2 className="text-base font-bold">รูปอุปกรณ์</h2>
              <button
                type="button"
                className="mt-2 grid min-h-24 w-full place-items-center border border-dashed border-moonwalk-teal bg-moonwalk-teal/10 text-moonwalk-navy dark:text-moonwalk-white"
              >
                <div className="grid justify-items-center gap-2">
                  <Plus
                    className="size-8 text-moonwalk-teal"
                    aria-hidden="true"
                  />
                  <span className="text-base font-bold">เพิ่มรูปอุปกรณ์</span>
                </div>
              </button>
            </section>

            <section className="border border-moonwalk-silver p-2 dark:border-moonwalk-white/20">
              <h2 className="text-base font-bold">คำอธิบาย</h2>
              <textarea
                className="mt-2 min-h-20 w-full resize-none border border-moonwalk-silver bg-moonwalk-white p-2 text-sm outline-none focus:border-moonwalk-teal dark:border-moonwalk-white/20 dark:bg-moonwalk-navy"
                placeholder="บันทึกรายละเอียด เช่น ความยาว อุปกรณ์เสริม หรือวิธีติดตั้ง"
              />
            </section>
          </div>
        </div>

        <footer className="grid grid-cols-2 gap-2 border-t border-moonwalk-navy p-2 dark:border-moonwalk-white">
          <button
            type="button"
            className="min-h-12 border border-moonwalk-navy text-base font-bold dark:border-moonwalk-white"
            onClick={onClose}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="min-h-12 border border-moonwalk-teal bg-moonwalk-teal text-base font-bold text-moonwalk-navy"
            onClick={onClose}
          >
            บันทึกอุปกรณ์
          </button>
        </footer>
      </div>
    </div>
  );
}
