"use client";

import { pages, type PageId } from "@/components/moonwalk-data";
import { cn } from "@user-interface/ui/lib/utils";

export function BottomNav({
  activePage,
  onPageChange,
}: {
  activePage: PageId;
  onPageChange: (page: PageId) => void;
}) {
  return (
    <nav
      className="font-line-seed-th fixed inset-x-0 bottom-0 z-20 border-t border-moonwalk-navy bg-moonwalk-white p-0 pb-[env(safe-area-inset-bottom)] text-moonwalk-navy md:inset-x-auto md:inset-y-0 md:left-0 md:w-48 md:border-r md:border-t-0 md:pb-0 dark:border-moonwalk-white dark:bg-moonwalk-navy dark:text-moonwalk-white"
      aria-label="หน้าหลัก Moon Walk"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 border-x border-moonwalk-navy md:max-w-none md:grid-cols-1 md:border-x-0 md:pt-4 dark:border-moonwalk-white">
        {pages.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 border-r border-moonwalk-navy px-0.5 text-[12px] font-bold leading-none last:border-r-0 md:flex-row md:justify-start md:gap-3 md:border-b md:border-r-0 md:px-4 md:text-sm dark:border-moonwalk-white",
              activePage === id &&
                "bg-moonwalk-navy text-moonwalk-white dark:bg-moonwalk-white dark:text-moonwalk-navy",
            )}
            onClick={() => onPageChange(id)}
          >
            <Icon className="size-4 md:size-5" aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
