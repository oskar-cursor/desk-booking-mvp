"use client";

import { useCallback, useEffect, useState } from "react";
import AdminTable, { Column } from "../admin-table";

interface ReservationRow {
  id: string;
  type: "desk" | "parking";
  date: string;
  resourceCode: string;
  resourceName: string;
  userName: string;
  userEmail: string;
  userId: string;
  createdAt: string;
}

interface Summary {
  totalDesk: number;
  totalParking: number;
}

function formatDateShort(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${day}.${month}`;
}

function formatDatePL(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function AdminReservationsPage() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekLater = new Date(today);
  weekLater.setUTCDate(weekLater.getUTCDate() + 6);

  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalDesk: 0, totalParking: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [type, setType] = useState<"all" | "desk" | "parking">("all");
  const [dateFrom, setDateFrom] = useState(toDateInput(today));
  const [dateTo, setDateTo] = useState(toDateInput(weekLater));
  const [search, setSearch] = useState("");

  // Delete
  const [deleteRes, setDeleteRes] = useState<ReservationRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", type);
      params.set("dateFrom", dateFrom);
      params.set("dateTo", dateTo);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/reservations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations);
        setSummary(data.summary);
        setTotal(data.total);
      }
    } catch {
      // keep current
    } finally {
      setLoading(false);
    }
  }, [type, dateFrom, dateTo, search]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  function shiftWeek(dir: -1 | 1) {
    const from = new Date(dateFrom + "T00:00:00.000Z");
    const to = new Date(dateTo + "T00:00:00.000Z");
    from.setUTCDate(from.getUTCDate() + dir * 7);
    to.setUTCDate(to.getUTCDate() + dir * 7);
    setDateFrom(toDateInput(from));
    setDateTo(toDateInput(to));
  }

  async function handleDelete() {
    if (!deleteRes) return;
    setDeleteLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/reservations/${deleteRes.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: deleteRes.type }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Rezerwacja anulowana" });
        setDeleteRes(null);
        fetchReservations();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Błąd usuwania" });
        setDeleteRes(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  const columns: Column<ReservationRow>[] = [
    {
      key: "type",
      header: "Typ",
      render: (r) => (
        <span className="text-base" title={r.type === "desk" ? "Biurko" : "Parking"}>
          {r.type === "desk" ? "\u{1FA91}" : "\u{1F17F}\uFE0F"}
        </span>
      ),
      className: "w-12 text-center",
    },
    {
      key: "date",
      header: "Data",
      render: (r) => <span className="font-medium">{formatDateShort(r.date)}</span>,
      className: "w-20",
    },
    {
      key: "resource",
      header: "Zasób",
      render: (r) => (
        <div>
          <span className="font-medium">{r.resourceCode}</span>
          <span className="text-gray-400 ml-1 text-xs">{r.resourceName}</span>
        </div>
      ),
    },
    {
      key: "user",
      header: "Użytkownik",
      render: (r) => (
        <button
          onClick={() => setSearch(r.userName)}
          className="text-left hover:underline text-blue-600"
        >
          {r.userName}
        </button>
      ),
    },
    {
      key: "created",
      header: "Utw.",
      render: (r) => (
        <span className="text-gray-500 text-xs">
          {formatDateShort(r.createdAt.slice(0, 10))}
        </span>
      ),
      className: "w-20",
    },
    {
      key: "actions",
      header: "Akcje",
      render: (r) => (
        <button
          onClick={() => setDeleteRes(r)}
          className="text-xs text-red-600 hover:underline"
        >
          Usuń
        </button>
      ),
      className: "w-16",
    },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-4">Rezerwacje</h2>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Typ</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "all" | "desk" | "parking")}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">Wszystkie</option>
              <option value="desk">Biurka</option>
              <option value="parking">Parkingi</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Od</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Do</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Szukaj</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj po nazwisku lub kodzie..."
              className="border rounded-lg px-3 py-2 text-sm w-full"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-600 mb-3">
        Znaleziono: <strong>{total}</strong> ({summary.totalDesk} biurek, {summary.totalParking} parkingów)
      </p>

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

      {loading ? (
        <div className="text-center text-gray-500 py-8">Ładowanie...</div>
      ) : (
        <AdminTable columns={columns} data={reservations} getKey={(r) => `${r.type}-${r.id}`} />
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => shiftWeek(-1)}
          className="text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-1 rounded-lg"
        >
          Poprzedni tydzień
        </button>
        <span className="text-xs text-gray-400">
          {formatDatePL(dateFrom)} — {formatDatePL(dateTo)}
        </span>
        <button
          onClick={() => shiftWeek(1)}
          className="text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-1 rounded-lg"
        >
          Następny tydzień
        </button>
      </div>

      {/* Delete dialog */}
      {deleteRes && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteRes(null);
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Anulowanie rezerwacji</h3>
            <p className="text-sm text-gray-600 mb-6">
              Czy na pewno chcesz anulować rezerwację{" "}
              {deleteRes.type === "desk" ? "biurka" : "parkingu"}{" "}
              <strong>{deleteRes.resourceCode}</strong> użytkownika{" "}
              <strong>{deleteRes.userName}</strong> na{" "}
              <strong>{formatDatePL(deleteRes.date)}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteRes(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? "Usuwanie..." : "Usuń rezerwację"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
