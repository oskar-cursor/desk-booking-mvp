"use client";

import { useCallback, useEffect, useState } from "react";

interface ReservationInfo {
  date: string;
  deskCode: string | null;
  parkingCode: string | null;
}

export function useSchedule() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [presenceData, setPresenceData] = useState<Record<string, "HOME" | "OFFICE" | "ABSENT">>({});
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selectedMode, setSelectedMode] = useState<"HOME" | "OFFICE" | "ABSENT" | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Bulk cancel dialog
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    reservations: ReservationInfo[];
    targetMode: "HOME" | "ABSENT";
  } | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchPresence = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/presence/month?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setPresenceData(data.entries);
      }
    } catch {
      // keep current
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchPresence();
    setSelectedDates(new Set());
    setSelectedMode(null);
    setMessage(null);
  }, [fetchPresence]);

  function toggleDate(date: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function toggleWeekday(weekday: number) {
    // weekday: 0=Mon, 1=Tue, ... 4=Fri
    const today = new Date().toISOString().slice(0, 10);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const weekdayDates: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(Date.UTC(year, month - 1, day));
      let dow = d.getUTCDay() - 1;
      if (dow < 0) dow = 6;
      if (dow === weekday) {
        const ds = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (ds >= today) weekdayDates.push(ds);
      }
    }

    if (weekdayDates.length === 0) return;

    setSelectedDates((prev) => {
      const next = new Set(prev);
      const allSelected = weekdayDates.every((d) => next.has(d));
      if (allSelected) {
        weekdayDates.forEach((d) => next.delete(d));
      } else {
        weekdayDates.forEach((d) => next.add(d));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedDates(new Set());
    setSelectedMode(null);
  }

  async function applyBulk() {
    if (selectedDates.size === 0 || !selectedMode) return;

    const dates = Array.from(selectedDates).sort();

    // Check if switching FROM OFFICE and target is not OFFICE
    if (selectedMode !== "OFFICE") {
      const officeDates = dates.filter((d) => presenceData[d] === "OFFICE");
      if (officeDates.length > 0) {
        // Check for reservations on those dates
        try {
          const res = await fetch("/api/reservations/check-bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dates: officeDates }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.reservations.length > 0) {
              setCancelDialog({
                open: true,
                reservations: data.reservations,
                targetMode: selectedMode as "HOME" | "ABSENT",
              });
              return;
            }
          }
        } catch {
          // Can't check, proceed anyway
        }
      }
    }

    await executeBulkUpdate(dates);
  }

  async function executeBulkUpdate(dates: string[]) {
    setApplying(true);
    setMessage(null);
    try {
      const res = await fetch("/api/presence/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates, mode: selectedMode }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: `Zaktualizowano tryb pracy dla ${dates.length} dni` });
        setSelectedDates(new Set());
        setSelectedMode(null);
        fetchPresence();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Błąd aktualizacji" });
      }
    } catch {
      setMessage({ type: "error", text: "Błąd sieci" });
    } finally {
      setApplying(false);
    }
  }

  async function handleCancelConfirm() {
    if (!cancelDialog) return;
    setCancelLoading(true);
    try {
      const cancelDates = cancelDialog.reservations.map((r) => r.date);
      await fetch("/api/reservations/bulk-daily", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: cancelDates }),
      });

      await executeBulkUpdate(Array.from(selectedDates).sort());
    } catch {
      setMessage({ type: "error", text: "Błąd podczas anulowania rezerwacji" });
    } finally {
      setCancelLoading(false);
      setCancelDialog(null);
    }
  }

  function prevMonth() {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  }

  return {
    year,
    month,
    presenceData,
    selectedDates,
    selectedMode,
    setSelectedMode,
    loading,
    applying,
    message,
    toggleDate,
    toggleWeekday,
    clearSelection,
    applyBulk,
    prevMonth,
    nextMonth,
    cancelDialog,
    cancelLoading,
    handleCancelConfirm,
    closeCancelDialog: () => setCancelDialog(null),
  };
}
