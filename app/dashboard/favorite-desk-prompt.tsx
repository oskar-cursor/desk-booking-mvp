"use client";

import { useCallback, useEffect, useState } from "react";

interface FavoriteDeskPromptProps {
  date: string;
  presenceMode: string;
  hasExistingReservation: boolean;
  onReserve: (deskId: string) => Promise<void>;
  onDismiss: () => void;
}

interface AvailabilityData {
  hasFavorite: boolean;
  deskId?: string;
  deskCode?: string;
  deskRoom?: string;
  isAvailable?: boolean;
  reservedBy?: string | null;
}

export default function FavoriteDeskPrompt({
  date,
  presenceMode,
  hasExistingReservation,
  onReserve,
  onDismiss,
}: FavoriteDeskPromptProps) {
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [reserving, setReserving] = useState(false);
  const [visible, setVisible] = useState(false);

  const checkAvailability = useCallback(async () => {
    if (presenceMode !== "OFFICE" || hasExistingReservation) {
      setData(null);
      return;
    }
    try {
      const res = await fetch(`/api/user/favorite-desk/availability?date=${date}`);
      if (res.ok) {
        const result = await res.json();
        if (result.hasFavorite) {
          setData(result);
          setVisible(true);
        } else {
          setData(null);
        }
      }
    } catch {
      // ignore
    }
  }, [date, presenceMode, hasExistingReservation]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // Hide if conditions change
  useEffect(() => {
    if (presenceMode !== "OFFICE" || hasExistingReservation) {
      setVisible(false);
    }
  }, [presenceMode, hasExistingReservation]);

  if (!visible || !data?.hasFavorite) return null;

  async function handleReserve() {
    if (!data?.deskId) return;
    setReserving(true);
    try {
      await onReserve(data.deskId);
      setVisible(false);
    } finally {
      setReserving(false);
    }
  }

  function handleDismiss() {
    setVisible(false);
    onDismiss();
  }

  if (data.isAvailable) {
    return (
      <div className="mb-4 p-4 rounded-xl border border-yellow-300 bg-yellow-50 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Twoje ulubione biurko{" "}
              <strong>{data.deskCode}</strong>{" "}
              <span className="text-yellow-600">({data.deskRoom})</span>{" "}
              jest wolne!
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleReserve}
              disabled={reserving}
              className="px-3 py-1.5 text-sm font-medium bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors"
            >
              {reserving ? "Rezerwuję..." : `Zarezerwuj ${data.deskCode}`}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-sm text-yellow-700 hover:text-yellow-900 transition-colors"
            >
              Nie, dziekuję
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Favorite desk is occupied
  return (
    <div className="mb-4 p-4 rounded-xl border border-gray-200 bg-gray-50 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-700">
            Twoje ulubione biurko <strong>{data.deskCode}</strong> jest dzisiaj zajęte
          </p>
          {data.reservedBy && (
            <p className="text-xs text-gray-500 mt-0.5">
              Zarezerwowane przez {data.reservedBy}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">Wybierz inne biurko z mapki.</p>
        </div>
        <button
          onClick={handleDismiss}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 shrink-0 transition-colors"
        >
          OK, rozumiem
        </button>
      </div>
    </div>
  );
}
