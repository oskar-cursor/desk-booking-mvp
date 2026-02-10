"use client";

import { useCallback, useEffect, useState } from "react";

export interface ParkingSpot {
  id: string;
  code: string;
  name: string;
  active: boolean;
  isReserved: boolean;
  isMine: boolean;
  reservedBy: string | null;
  reservationId: string | null;
}

export interface ParkingMessage {
  type: "success" | "error";
  text: string;
}

export function useParking(date: string, presenceMode: "HOME" | "OFFICE" | "ABSENT", enabled: boolean) {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<ParkingMessage | null>(null);

  const fetchSpots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/parking/spots?date=${date}`);
      if (res.ok) {
        setSpots(await res.json());
      }
    } catch {
      // keep current state
    } finally {
      setLoading(false);
    }
  }, [date]);

  // Fetch spots when date changes and tab is active
  useEffect(() => {
    if (enabled) {
      fetchSpots();
    }
  }, [enabled, fetchSpots]);

  async function createReservation(spotId: string) {
    // Client-side guard — shows message, but backend is the final authority
    if (presenceMode !== "OFFICE") {
      setMessage({ type: "error", text: "Aby zarezerwować parking, ustaw tryb pracy na OFFICE na ten dzień" });
      return;
    }

    setActionLoading(spotId);
    setMessage(null);
    try {
      const res = await fetch("/api/parking/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotId, date }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `Zarezerwowano parking ${data.spot.code}!` });
        fetchSpots();
      } else {
        setMessage({ type: "error", text: data.error || "Błąd rezerwacji parkingu" });
      }
    } catch {
      setMessage({ type: "error", text: "Błąd sieci — nie udało się zarezerwować parkingu" });
    } finally {
      setActionLoading(null);
    }
  }

  async function cancelReservation(reservationId: string) {
    setActionLoading(reservationId);
    setMessage(null);
    try {
      const res = await fetch(`/api/parking/reservations/${reservationId}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ type: "success", text: "Rezerwacja parkingowa anulowana" });
        fetchSpots();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Błąd anulowania" });
      }
    } catch {
      setMessage({ type: "error", text: "Błąd sieci — nie udało się anulować rezerwacji" });
    } finally {
      setActionLoading(null);
    }
  }

  return {
    spots,
    loading,
    actionLoading,
    message,
    clearMessage: () => setMessage(null),
    createReservation,
    cancelReservation,
    refreshSpots: fetchSpots,
  };
}
