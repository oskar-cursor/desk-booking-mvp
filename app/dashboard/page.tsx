"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import RoomMap from "./room-map";
import type { RoomLayout } from "./room-map";
import ParkingGrid from "./parking/parking-grid";
import { useParking } from "./parking/use-parking";

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

const TABS = [
  ...ROOMS.map((r) => ({ id: r.id, label: r.label })),
  { id: "parking", label: "Parking" },
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

  // Presence (HOME/OFFICE)
  const [presenceMode, setPresenceMode] = useState<"HOME" | "OFFICE">("HOME");

  // Office people list
  const [peopleExpanded, setPeopleExpanded] = useState(false);
  const [officeData, setOfficeData] = useState<{
    reservedCount: number;
    capacity: number;
    people: { deskCode: string; userName: string }[];
  } | null>(null);

  // Parking (managed by useParking hook)
  const parking = useParking(date, presenceMode, activeRoom === "parking");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchPresence = useCallback(async (d: string) => {
    try {
      const res = await fetch(`/api/presence?date=${d}`);
      if (res.ok) {
        const data = await res.json();
        setPresenceMode(data.mode);
      }
    } catch {
      // keep current state
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchDesks();
      fetchPresence(date);
      // Reset people list on date change
      setPeopleExpanded(false);
      setOfficeData(null);
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

  const bookingEnabled = presenceMode === "OFFICE";

  async function handleReserve(deskId: string) {
    if (!bookingEnabled) {
      setMessage({ type: "error", text: "Wybierz tryb OFFICE, aby zarezerwować biurko na ten dzień" });
      return;
    }
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

  async function handlePresenceToggle(mode: "HOME" | "OFFICE") {
    const previous = presenceMode;
    setPresenceMode(mode); // optimistic
    try {
      const res = await fetch("/api/presence", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, mode }),
      });
      if (!res.ok) {
        setPresenceMode(previous);
        setMessage({ type: "error", text: "Nie udało się zapisać trybu pracy" });
      }
    } catch {
      setPresenceMode(previous);
      setMessage({ type: "error", text: "Nie udało się zapisać trybu pracy" });
    }
  }

  async function fetchOfficeData() {
    try {
      const res = await fetch(`/api/office?date=${date}`);
      if (res.ok) {
        setOfficeData(await res.json());
      }
    } catch {
      // keep null
    }
  }

  function handleTogglePeople() {
    if (!peopleExpanded) {
      fetchOfficeData();
    }
    setPeopleExpanded((prev) => !prev);
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

        {/* HOME / OFFICE toggle */}
        <div className="mb-6">
          <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Home / Office
          </span>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {(["HOME", "OFFICE"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handlePresenceToggle(mode)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  presenceMode === mode
                    ? mode === "HOME"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          {!bookingEnabled && (
            <p className="mt-2 text-xs text-amber-600">
              Wybierz OFFICE, aby zarezerwować biurko na ten dzień.
            </p>
          )}
        </div>

        {/* Room / Parking selector tabs */}
        <div className="mb-6 flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveRoom(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeRoom === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
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

        {/* Room Map / Parking Map */}
        {activeRoom === "parking" ? (
          <ParkingGrid
            spots={parking.spots}
            loading={parking.loading}
            actionLoading={parking.actionLoading}
            message={parking.message}
            onReserve={parking.createReservation}
            onCancel={parking.cancelReservation}
          />
        ) : loading ? (
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

        {/* Collapsible people list */}
        <div className="mt-8 border-t pt-4">
          <button
            onClick={handleTogglePeople}
            className="text-sm text-blue-600 hover:underline"
          >
            {peopleExpanded ? "Zwiń listę osób" : "Rozwiń listę osób"}
          </button>

          {peopleExpanded && officeData && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Liczba ludzi w biurze: {officeData.reservedCount}/{officeData.capacity}
              </p>
              {officeData.people.length === 0 ? (
                <p className="text-sm text-gray-400">Brak rezerwacji na ten dzień</p>
              ) : (
                <ul className="space-y-1">
                  {officeData.people.map((p) => (
                    <li key={p.deskCode} className="text-sm text-gray-600">
                      {p.deskCode}: {p.userName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
