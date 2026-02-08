"use client";

import ParkingSpotCard from "./parking-spot-card";
import type { ParkingSpot, ParkingMessage } from "./use-parking";

interface ParkingGridProps {
  spots: ParkingSpot[];
  loading: boolean;
  actionLoading: string | null;
  message: ParkingMessage | null;
  onReserve: (spotId: string) => void;
  onCancel: (reservationId: string) => void;
}

export default function ParkingGrid({
  spots,
  loading,
  actionLoading,
  message,
  onReserve,
  onCancel,
}: ParkingGridProps) {
  if (loading) {
    return <div className="text-center text-gray-500 py-8">Ładowanie parkingu...</div>;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Parking</h2>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-6 justify-center flex-wrap">
        {spots.map((spot) => (
          <ParkingSpotCard
            key={spot.id}
            spot={spot}
            isLoading={actionLoading != null && (actionLoading === spot.id || actionLoading === spot.reservationId)}
            onReserve={onReserve}
            onCancel={onCancel}
          />
        ))}
      </div>
    </div>
  );
}
