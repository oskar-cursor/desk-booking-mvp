"use client";

import { useCallback, useEffect, useState } from "react";
import AdminTable, { Column } from "../admin-table";

interface SpotRow {
  id: string;
  code: string;
  name: string;
  active: boolean;
  reservationsCount: number;
}

export default function AdminParkingPage() {
  const [spots, setSpots] = useState<SpotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addCode, setAddCode] = useState("");
  const [addName, setAddName] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchSpots = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/parking");
      if (res.ok) setSpots(await res.json());
    } catch {
      // keep current
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpots();
  }, [fetchSpots]);

  async function handleAdd() {
    setAddLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/parking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: addCode, name: addName }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: `Dodano miejsce ${addCode}` });
        setAddCode("");
        setAddName("");
        setShowAdd(false);
        fetchSpots();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Błąd dodawania" });
      }
    } finally {
      setAddLoading(false);
    }
  }

  async function handleEdit(id: string) {
    setEditLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/parking/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: editCode, name: editName }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Zaktualizowano miejsce" });
        setEditId(null);
        fetchSpots();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Błąd edycji" });
      }
    } finally {
      setEditLoading(false);
    }
  }

  async function handleToggleActive(spot: SpotRow) {
    setMessage(null);
    const res = await fetch(`/api/admin/parking/${spot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !spot.active }),
    });
    if (res.ok) {
      fetchSpots();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Błąd zmiany statusu" });
    }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/parking/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ type: "success", text: "Usunięto miejsce" });
        setDeleteId(null);
        fetchSpots();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Błąd usuwania" });
        setDeleteId(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  function startEdit(spot: SpotRow) {
    setEditId(spot.id);
    setEditCode(spot.code);
    setEditName(spot.name);
  }

  const activeCount = spots.filter((s) => s.active).length;

  const columns: Column<SpotRow>[] = [
    {
      key: "code",
      header: "Kod",
      render: (spot) =>
        editId === spot.id ? (
          <input
            value={editCode}
            onChange={(e) => setEditCode(e.target.value)}
            className="border rounded px-2 py-1 w-20 text-sm"
          />
        ) : (
          <span className="font-medium">{spot.code}</span>
        ),
      className: "w-24",
    },
    {
      key: "name",
      header: "Nazwa",
      render: (spot) =>
        editId === spot.id ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="border rounded px-2 py-1 w-full text-sm"
          />
        ) : (
          spot.name
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (spot) => (
        <button
          onClick={() => handleToggleActive(spot)}
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            spot.active
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {spot.active ? "Aktywne" : "Nieaktywne"}
        </button>
      ),
      className: "w-28",
    },
    {
      key: "reservations",
      header: "Rezerwacje",
      render: (spot) => <span className="text-gray-500">{spot.reservationsCount}</span>,
      className: "w-24 text-center",
    },
    {
      key: "actions",
      header: "Akcje",
      render: (spot) =>
        editId === spot.id ? (
          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(spot.id)}
              disabled={editLoading}
              className="text-xs text-blue-600 hover:underline disabled:opacity-50"
            >
              {editLoading ? "..." : "Zapisz"}
            </button>
            <button
              onClick={() => setEditId(null)}
              className="text-xs text-gray-500 hover:underline"
            >
              Anuluj
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => startEdit(spot)}
              className="text-xs text-blue-600 hover:underline"
            >
              Edytuj
            </button>
            <button
              onClick={() => setDeleteId(spot.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Usuń
            </button>
          </div>
        ),
      className: "w-32",
    },
  ];

  const addRow = showAdd ? (
    <tr className="border-b border-gray-100 bg-blue-50">
      <td className="px-4 py-3">
        <input
          value={addCode}
          onChange={(e) => setAddCode(e.target.value)}
          placeholder="Kod"
          className="border rounded px-2 py-1 w-20 text-sm"
        />
      </td>
      <td className="px-4 py-3">
        <input
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          placeholder="Nazwa"
          className="border rounded px-2 py-1 w-full text-sm"
        />
      </td>
      <td className="px-4 py-3" />
      <td className="px-4 py-3" />
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            disabled={addLoading || !addCode || !addName}
            className="text-xs text-blue-600 hover:underline disabled:opacity-50"
          >
            {addLoading ? "..." : "Dodaj"}
          </button>
          <button
            onClick={() => setShowAdd(false)}
            className="text-xs text-gray-500 hover:underline"
          >
            Anuluj
          </button>
        </div>
      </td>
    </tr>
  ) : undefined;

  if (loading) {
    return <div className="text-center text-gray-500 py-8">Ładowanie...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">
          Parkingi ({activeCount} aktywnych / {spots.length} łącznie)
        </h2>
        <button
          onClick={() => {
            setShowAdd(true);
            setAddCode("");
            setAddName("");
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Dodaj miejsce
        </button>
      </div>

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

      <AdminTable columns={columns} data={spots} getKey={(s) => s.id} headerRow={addRow} />

      {/* Delete confirmation dialog */}
      {deleteId && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteId(null);
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Potwierdzenie usunięcia</h3>
            <p className="text-sm text-gray-600 mb-6">
              Czy na pewno chcesz usunąć miejsce parkingowe{" "}
              <strong>{spots.find((s) => s.id === deleteId)?.code}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? "Usuwanie..." : "Usuń"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
