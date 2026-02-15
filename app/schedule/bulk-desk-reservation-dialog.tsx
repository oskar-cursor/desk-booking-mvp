"use client";

import { useEffect, useRef } from "react";

interface BulkDeskReservationDialogProps {
  open: boolean;
  deskCode: string;
  deskId: string;
  dates: string[];
  onConfirm: () => void;
  onDismiss: () => void;
  isLoading: boolean;
  result: {
    created: string[];
    failed: Array<{ date: string; reason: string }>;
    skipped: Array<{ date: string; reason: string }>;
  } | null;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

export default function BulkDeskReservationDialog({
  open,
  deskCode,
  dates,
  onConfirm,
  onDismiss,
  isLoading,
  result,
}: BulkDeskReservationDialogProps) {
  const dismissBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) dismissBtnRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isLoading) onDismiss();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onDismiss, isLoading]);

  if (!open) return null;

  const sortedDates = [...dates].sort();

  // State 1: asking
  if (!result) {
    return (
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        aria-modal="true"
        role="dialog"
        aria-label="Rezerwacja ulubionego biurka"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isLoading) onDismiss();
        }}
      >
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-yellow-500">&#11088;</span>
            Rezerwacja ulubionego biurka
          </h2>
          <p className="text-sm text-gray-600 mb-1">
            Ustawiono OFFICE na {sortedDates.length} dni.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Czy chcesz zarezerwować biurko {deskCode} na te dni?
          </p>
          <div className="flex gap-3 justify-end">
            <button
              ref={dismissBtnRef}
              onClick={onDismiss}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Nie, dziękuję
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Rezerwowanie..." : `Tak, zarezerwuj ${deskCode}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Result states
  const allCreated = result.failed.length === 0 && result.skipped.length === 0;
  const noneCreated = result.created.length === 0;
  const partial = !allCreated && !noneCreated;

  let icon: string;
  let title: string;
  if (allCreated) {
    icon = "✅";
    title = `Zarezerwowano biurko ${deskCode} na ${result.created.length} dni!`;
  } else if (noneCreated) {
    icon = "❌";
    title = `Biurko ${deskCode} jest zajęte we wszystkich wybranych dniach`;
  } else {
    icon = "⚠️";
    title = `Biurko ${deskCode} zarezerwowane częściowo`;
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-label="Wynik rezerwacji"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          {icon} {title}
        </h2>

        {/* Created */}
        {result.created.length > 0 && (
          <div className="mb-4">
            {partial && (
              <p className="text-sm font-medium text-gray-600 mb-2">
                Zarezerwowano ({result.created.length}):
              </p>
            )}
            <ul className="space-y-1">
              {result.created.sort().map((d) => (
                <li key={d} className="text-sm text-gray-700">
                  • {formatDate(d)} ✅
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Failed */}
        {result.failed.length > 0 && (
          <div className="mb-4">
            {partial && (
              <p className="text-sm font-medium text-gray-600 mb-2">
                Niedostępne ({result.failed.length}):
              </p>
            )}
            <ul className="space-y-1">
              {result.failed.sort((a, b) => a.date.localeCompare(b.date)).map((f) => (
                <li key={f.date} className="text-sm text-gray-700">
                  • {formatDate(f.date)} ❌ — {f.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer message */}
        {(partial || noneCreated) && (
          <p className="text-sm text-gray-500 mb-4">
            Zarezerwuj {noneCreated ? "inne biurko" : "pozostałe dni"} ręcznie na dashboardzie.
          </p>
        )}

        <div className="flex justify-end">
          <button
            ref={dismissBtnRef}
            onClick={onDismiss}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
