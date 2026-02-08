"use client";

import type { ParkingSpot } from "./use-parking";

interface ParkingSpotCardProps {
  spot: ParkingSpot;
  isLoading: boolean;
  onReserve: (spotId: string) => void;
  onCancel: (reservationId: string) => void;
}

export default function ParkingSpotCard({ spot, isLoading, onReserve, onCancel }: ParkingSpotCardProps) {
  // disabled = ONLY technical states: loading or inactive spot
  const disabled = isLoading || !spot.active;

  // Determine visual style
  let bgColor: string;
  let textColor: string;
  let pColor: string;
  let statusText: string;
  let actionLabel: string | null = null;

  if (!spot.active) {
    bgColor = "bg-gray-100 border-gray-200";
    textColor = "text-gray-400";
    pColor = "text-gray-200";
    statusText = "Nieaktywne";
  } else if (spot.isMine) {
    bgColor = "bg-blue-50 border-blue-300 hover:bg-blue-100";
    textColor = "text-blue-700";
    pColor = "text-blue-300";
    statusText = "Twoje";
    actionLabel = "Anuluj";
  } else if (spot.isReserved) {
    bgColor = "bg-gray-100 border-gray-300";
    textColor = "text-gray-500";
    pColor = "text-gray-300";
    statusText = spot.reservedBy || "Zajęte";
  } else {
    // Free and active
    bgColor = "bg-green-50 border-green-300 hover:border-emerald-400 hover:bg-green-100";
    textColor = "text-green-700";
    pColor = "text-green-400";
    statusText = "Wolne";
    actionLabel = "Rezerwuj";
  }

  function handleClick() {
    if (spot.isMine && spot.reservationId) {
      onCancel(spot.reservationId);
    } else if (!spot.isReserved && spot.active) {
      onReserve(spot.id);
    }
  }

  // Reserved by someone else — non-interactive tile
  if (spot.isReserved && !spot.isMine) {
    return (
      <div
        className={`flex flex-col items-center justify-center w-36 h-44 rounded-xl border-2 border-dashed ${bgColor}`}
        aria-label={`Miejsce ${spot.code} — ${statusText}`}
      >
        <span className={`text-6xl font-black select-none ${pColor}`}>P</span>
        <span className={`text-lg font-bold mt-1 ${textColor}`}>{spot.code}</span>
        <span className={`text-xs mt-1 ${textColor}`}>{statusText}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={
        spot.isMine
          ? `Anuluj rezerwację miejsca parkingowego ${spot.code}`
          : `Zarezerwuj miejsce parkingowe ${spot.code}`
      }
      className={`flex flex-col items-center justify-center w-36 h-44 rounded-xl border-2 border-dashed transition-colors ${bgColor} ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <span className={`text-6xl font-black select-none pointer-events-none ${pColor}`}>P</span>
      <span className={`text-lg font-bold mt-1 pointer-events-none ${textColor}`}>{spot.code}</span>
      <span className={`text-xs mt-1 pointer-events-none ${textColor}`}>{statusText}</span>
      {actionLabel && (
        <span
          className={`text-xs mt-2 px-3 py-1 rounded pointer-events-none ${
            spot.isMine
              ? "border border-red-300 text-red-600"
              : "border border-green-400 text-green-700"
          }`}
        >
          {isLoading ? "..." : actionLabel}
        </span>
      )}
    </button>
  );
}
