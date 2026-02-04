"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format, isPast, parseISO } from "date-fns";
import { pl } from "date-fns/locale";

interface Reservation {
  id: string;
  date: string;
  createdAt: string;
  desk: {
    code: string;
    name: string;
    locationLabel: string;
  };
}

export default function MyReservationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") fetchReservations();
  }, [status]);

  async function fetchReservations() {
    setLoading(true);
    try {
      const res = await fetch("/api/reservations/mine");
      if (res.ok) setReservations(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: string) {
    setCancellingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ type: "success", text: "Rezerwacja anulowana" });
        fetchReservations();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Błąd anulowania" });
      }
    } finally {
      setCancellingId(null);
    }
  }

  if (status === "loading" || !session) {
    return <div className="min-h-screen flex items-center justify-center">Ładowanie...</div>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = reservations.filter((r) => !isPast(parseISO(r.date)) || parseISO(r.date) >= today);
  const past = reservations.filter((r) => isPast(parseISO(r.date)) && parseISO(r.date) < today);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Moje rezerwacje</h1>
          <button onClick={() => router.push("/dashboard")} className="text-sm text-blue-600 hover:underline">
            Wróć do dashboardu
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
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
        ) : reservations.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>Nie masz żadnych rezerwacji.</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-3 text-blue-600 hover:underline text-sm"
            >
              Zarezerwuj biurko
            </button>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Nadchodzące
                </h2>
                <div className="space-y-3">
                  {upcoming.map((r) => (
                    <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <div className="font-mono font-bold text-lg">{r.desk.code}</div>
                        <div className="text-sm text-gray-500">{r.desk.locationLabel}</div>
                        <div className="text-sm text-gray-700 mt-1 capitalize">
                          {format(parseISO(r.date), "EEEE, d MMMM yyyy", { locale: pl })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancel(r.id)}
                        disabled={cancellingId === r.id}
                        className="text-sm py-1.5 px-4 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {cancellingId === r.id ? "..." : "Anuluj"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Przeszłe
                </h2>
                <div className="space-y-3">
                  {past.map((r) => (
                    <div key={r.id} className="bg-white border border-gray-100 rounded-lg p-4 opacity-60">
                      <div className="font-mono font-bold">{r.desk.code}</div>
                      <div className="text-sm text-gray-500">{r.desk.locationLabel}</div>
                      <div className="text-sm text-gray-500 mt-1 capitalize">
                        {format(parseISO(r.date), "EEEE, d MMMM yyyy", { locale: pl })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
