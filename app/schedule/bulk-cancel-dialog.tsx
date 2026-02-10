"use client";

import { useEffect, useRef } from "react";

interface BulkCancelDialogProps {
  open: boolean;
  reservations: Array<{
    date: string;
    deskCode: string | null;
    parkingCode: string | null;
  }>;
  targetMode: "HOME" | "ABSENT";
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export default function BulkCancelDialog({
  open,
  reservations,
  targetMode,
  onConfirm,
  onCancel,
  isLoading,
}: BulkCancelDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelBtnRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  function formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-label="Potwierdzenie anulowania rezerwacji"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-3">
          Rezerwacje do anulowania
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Następujące dni mają aktywne rezerwacje, które zostaną anulowane:
        </p>

        <ul className="space-y-2 mb-6">
          {reservations.map((r) => (
            <li key={r.date} className="text-sm text-gray-700">
              <span className="font-medium">{formatDate(r.date)}:</span>{" "}
              {[
                r.deskCode ? `Biurko ${r.deskCode}` : null,
                r.parkingCode ? `Parking ${r.parkingCode}` : null,
              ]
                .filter(Boolean)
                .join(", ")}
            </li>
          ))}
        </ul>

        <p className="text-sm text-gray-600 mb-6">
          Czy chcesz anulować te rezerwacje i zmienić tryb na {targetMode}?
        </p>

        <div className="flex gap-3 justify-end">
          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Wróć
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Anulowanie..." : "Anuluj rezerwacje i zmień tryb"}
          </button>
        </div>
      </div>
    </div>
  );
}
