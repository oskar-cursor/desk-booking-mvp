"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import RoomMap from "./room-map";
import type { RoomLayout } from "./room-map";

interface DeskInfo {
  id: string;
  code: string;
  name: string;
  locationLabel: string;
  isReserved: boolean;
  isMine: boolean;
  reservedBy: string | null;
  reservationId: string | null;
}

// Room definitions
const ROOMS = [
  { id: "dzial-raportowy", label: "Dział Raportowy", layout: "2x4" as RoomLayout },
  { id: "open-space", label: "Open Space", layout: "1x3" as RoomLayout },
];

// Client-side mapping: desk → room label (only known labels accepted, else fallback by code prefix)
function getRoomForDesk(desk: DeskInfo): string {
  if (desk.locationLabel === "Dział Raportowy") return "Dział Raportowy";
  if (desk.locationLabel === "Open Space") return "Open Space";
  // Fallback: unknown or missing locationLabel → match by code prefix
  if (desk.code.startsWith("O-")) return "Open Space";
  return "Dział Raportowy";
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [desks, setDesks] = useState<DeskInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeRoom, setActiveRoom] = useState(ROOMS[0].id);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchDesks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, status]);

  async function fetchDesks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/desks?date=${date}`);
      if (res.ok) {
        setDesks(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReserve(deskId: string) {
    setActionLoading(deskId);
    setMessage(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deskId, date }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `Zarezerwowano ${data.desk.code}!` });
        fetchDesks();
      } else {
        setMessage({ type: "error", text: data.error || "Błąd rezerwacji" });
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(reservationId: string) {
    setActionLoading(reservationId);
    setMessage(null);
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ type: "success", text: "Rezerwacja anulowana" });
        fetchDesks();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Błąd anulowania" });
      }
    } finally {
      setActionLoading(null);
    }
  }

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Ładowanie...</div>;
  }

  if (!session) return null;

  const dateFormatted = format(new Date(date + "T00:00:00"), "EEEE, d MMMM yyyy", { locale: pl });
  const currentRoom = ROOMS.find((r) => r.id === activeRoom) || ROOMS[0];

  // Filter desks for current room
  const roomDesks = desks.filter((d) => getRoomForDesk(d) === currentRoom.label);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Desk Booking</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/my-reservations")}
              className="text-sm text-blue-600 hover:underline"
            >
              Moje rezerwacje
            </button>
            <span className="text-sm text-gray-500">{session.user.name}</span>
            <button
              onClick={async () => {
                await signOut({ redirect: false });
                router.push("/login");
              }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Date picker */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <label htmlFor="date" className="font-medium text-gray-700">
            Dzień:
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-500 text-sm capitalize">{dateFormatted}</span>
        </div>

        {/* Room selector tabs */}
        <div className="mb-6 flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {ROOMS.map((room) => (
            <button
              key={room.id}
              onClick={() => setActiveRoom(room.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeRoom === room.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {room.label}
            </button>
          ))}
        </div>

        {/* Messages */}
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

        {/* Room Map */}
        {loading ? (
          <div className="text-center text-gray-500 py-8">Ładowanie biurek...</div>
        ) : roomDesks.length === 0 ? (
          <div className="text-center text-gray-500 py-8">Brak biurek w tym pokoju</div>
        ) : (
          <RoomMap
            title={currentRoom.label}
            layout={currentRoom.layout}
            desks={roomDesks}
            actionLoading={actionLoading}
            onReserve={handleReserve}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
}
