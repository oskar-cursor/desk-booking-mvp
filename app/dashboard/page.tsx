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
import CancelReservationsDialog from "./cancel-reservations-dialog";
import PeopleList from "./people-list";

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

  // Presence (HOME/OFFICE/ABSENT)
  const [presenceMode, setPresenceMode] = useState<"HOME" | "OFFICE" | "ABSENT">("HOME");

  // People summary
  const [peopleSummary, setPeopleSummary] = useState<{
    office: { name: string; deskCode?: string }[];
    home: { name: string }[];
    absent: { name: string }[];
    counts: { total: number; totalDesks: number; office: number; home: number; absent: number };
  } | null>(null);

  // Parking (managed by useParking hook)
  const parking = useParking(date, presenceMode, activeRoom === "parking");

  // Cancel reservations dialog state
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    deskCode: string | null;
    parkingCode: string | null;
    targetMode: "HOME" | "ABSENT";
  } | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

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
      fetchPeopleSummary();
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
      setMessage({ type: "error", text: "Aby zarezerwować biurko, ustaw tryb pracy na OFFICE na ten dzień" });
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
        fetchPeopleSummary();
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
        fetchPeopleSummary();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Błąd anulowania" });
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function switchPresence(mode: "HOME" | "OFFICE" | "ABSENT") {
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
      } else {
        fetchPeopleSummary();
      }
    } catch {
      setPresenceMode(previous);
      setMessage({ type: "error", text: "Nie udało się zapisać trybu pracy" });
    }
  }

  async function handlePresenceToggle(mode: "HOME" | "OFFICE" | "ABSENT") {
    // Switching TO OFFICE or not leaving OFFICE → just switch
    if (mode === "OFFICE" || presenceMode !== "OFFICE") {
      switchPresence(mode);
      return;
    }

    // Switching from OFFICE → HOME or ABSENT: check for reservations first
    try {
      const res = await fetch(`/api/reservations/my-daily?date=${date}`);
      if (!res.ok) {
        switchPresence(mode);
        return;
      }
      const data = await res.json();
      if (data.desk || data.parking) {
        setCancelDialog({
          open: true,
          deskCode: data.desk?.code ?? null,
          parkingCode: data.parking?.code ?? null,
          targetMode: mode as "HOME" | "ABSENT",
        });
      } else {
        switchPresence(mode);
      }
    } catch {
      switchPresence(mode);
    }
  }

  async function handleCancelConfirm() {
    const targetMode = cancelDialog?.targetMode ?? "HOME";
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/reservations/my-daily?date=${date}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        const parts: string[] = [];
        if (data.deletedDesks?.length) parts.push(`biurko ${data.deletedDesks.join(", ")}`);
        if (data.deletedParking?.length) parts.push(`parking ${data.deletedParking.join(", ")}`);
        setMessage({ type: "success", text: `Anulowano: ${parts.join(", ")}` });
      }
      await switchPresence(targetMode);
      fetchDesks();
      parking.refreshSpots();
      fetchPeopleSummary();
    } catch {
      setMessage({ type: "error", text: "Błąd podczas anulowania rezerwacji" });
    } finally {
      setCancelLoading(false);
      setCancelDialog(null);
    }
  }

  async function fetchPeopleSummary() {
    try {
      const res = await fetch(`/api/presence/summary?date=${date}`);
      if (res.ok) {
        setPeopleSummary(await res.json());
      }
    } catch {
      // keep current state
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
            <button
              onClick={() => router.push("/schedule")}
              className="text-sm text-blue-600 hover:underline"
            >
              Grafik pracy
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

        {/* HOME / OFFICE / ABSENT toggle */}
        <div className="mb-6">
          <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Home / Office / Absent
          </span>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {(["HOME", "OFFICE", "ABSENT"] as const).map((mode) => {
              const isActive = presenceMode === mode;
              let activeClass = "";
              if (isActive) {
                if (mode === "HOME") activeClass = "bg-white text-gray-900 shadow-sm";
                else if (mode === "OFFICE") activeClass = "bg-blue-600 text-white shadow-sm";
                else activeClass = "bg-orange-500 text-white shadow-sm";
              }
              return (
                <button
                  key={mode}
                  onClick={() => handlePresenceToggle(mode)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? activeClass : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
          {presenceMode === "HOME" && (
            <p className="mt-2 text-xs text-amber-600">
              Wybierz OFFICE, aby zarezerwować biurko na ten dzień.
            </p>
          )}
          {presenceMode === "ABSENT" && (
            <p className="mt-2 text-xs text-orange-600">
              Nieobecność (urlop/choroba) — rezerwacje zablokowane.
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

        {/* People lists */}
        {peopleSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <PeopleList
              title="W biurze"
              count={peopleSummary.counts.office}
              totalCount={peopleSummary.counts.totalDesks}
              people={peopleSummary.office.map((p) => ({ name: p.name, detail: p.deskCode }))}
              icon="🏢"
              accentColor="text-blue-600"
            />
            <PeopleList
              title="Homeoffice"
              count={peopleSummary.counts.home}
              people={peopleSummary.home.map((p) => ({ name: p.name }))}
              icon="🏠"
              accentColor="text-green-600"
            />
            <PeopleList
              title="Nieobecni"
              count={peopleSummary.counts.absent}
              people={peopleSummary.absent.map((p) => ({ name: p.name }))}
              icon="❌"
              accentColor="text-orange-600"
            />
          </div>
        )}
      </div>

      <CancelReservationsDialog
        open={cancelDialog?.open ?? false}
        date={date}
        deskCode={cancelDialog?.deskCode ?? null}
        parkingCode={cancelDialog?.parkingCode ?? null}
        targetMode={cancelDialog?.targetMode ?? "HOME"}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelDialog(null)}
        isLoading={cancelLoading}
      />
    </div>
  );
}
