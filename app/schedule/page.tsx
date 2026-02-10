"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import MonthlyCalendar from "./monthly-calendar";
import BulkCancelDialog from "./bulk-cancel-dialog";
import { useSchedule } from "./use-schedule";

const MONTH_NAMES = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

export default function SchedulePage() {
  const { status } = useSession();
  const router = useRouter();
  const schedule = useSchedule();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Ładowanie...</div>;
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Grafik pracy</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-blue-600 hover:underline"
          >
            Wróć do dashboardu
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Month navigation */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={schedule.prevMonth}
            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg text-lg"
          >
            ◀
          </button>
          <h2 className="text-xl font-bold text-gray-800 min-w-[200px] text-center">
            {MONTH_NAMES[schedule.month - 1]} {schedule.year}
          </h2>
          <button
            onClick={schedule.nextMonth}
            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg text-lg"
          >
            ▶
          </button>
        </div>

        {/* Calendar */}
        {schedule.loading ? (
          <div className="text-center text-gray-500 py-8">Ładowanie...</div>
        ) : (
          <MonthlyCalendar
            year={schedule.year}
            month={schedule.month}
            presenceData={schedule.presenceData}
            selectedDates={schedule.selectedDates}
            onToggleDate={schedule.toggleDate}
            onSelectWeekday={schedule.toggleWeekday}
          />
        )}

        {/* Selection info & controls */}
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Zaznaczono: <strong>{schedule.selectedDates.size}</strong> dni
            </p>
            {schedule.selectedDates.size > 0 && (
              <button
                onClick={schedule.clearSelection}
                className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
              >
                Wyczyść zaznaczenie
              </button>
            )}
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Ustaw tryb pracy:
            </p>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
              {(["HOME", "OFFICE", "ABSENT"] as const).map((mode) => {
                const isActive = schedule.selectedMode === mode;
                let activeClass = "";
                if (isActive) {
                  if (mode === "HOME") activeClass = "bg-white text-gray-900 shadow-sm";
                  else if (mode === "OFFICE") activeClass = "bg-blue-600 text-white shadow-sm";
                  else activeClass = "bg-orange-500 text-white shadow-sm";
                }
                return (
                  <button
                    key={mode}
                    onClick={() => schedule.setSelectedMode(mode)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive ? activeClass : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={schedule.applyBulk}
            disabled={schedule.selectedDates.size === 0 || !schedule.selectedMode || schedule.applying}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {schedule.applying ? "Zapisywanie..." : "Zastosuj"}
          </button>

          {/* Message */}
          {schedule.message && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm ${
                schedule.message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {schedule.message.text}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> OFFICE
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-400 inline-block" /> HOME
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> ABSENT
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-blue-500 bg-blue-50 inline-block" /> Zaznaczony
          </span>
        </div>
      </div>

      <BulkCancelDialog
        open={schedule.cancelDialog?.open ?? false}
        reservations={schedule.cancelDialog?.reservations ?? []}
        targetMode={schedule.cancelDialog?.targetMode ?? "HOME"}
        onConfirm={schedule.handleCancelConfirm}
        onCancel={schedule.closeCancelDialog}
        isLoading={schedule.cancelLoading}
      />
    </div>
  );
}
