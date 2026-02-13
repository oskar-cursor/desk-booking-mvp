"use client";

import { useCallback, useEffect, useState } from "react";
import AdminTable, { Column } from "../admin-table";

interface DeskRow {
  id: string;
  code: string;
  name: string;
  locationLabel: string;
  active: boolean;
  reservationsCount: number;
}

export default function AdminDesksPage() {
  const [desks, setDesks] = useState<DeskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addCode, setAddCode] = useState("");
  const [addName, setAddName] = useState("");
  const [addLocation, setAddLocation] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDesks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/desks");
      if (res.ok) setDesks(await res.json());
    } catch {
      // keep current
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDesks();
  }, [fetchDesks]);

  async function handleAdd() {
    setAddLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/desks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: addCode, name: addName, locationLabel: addLocation }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: `Dodano biurko ${addCode}` });
        setAddCode("");
        setAddName("");
        setAddLocation("");
        setShowAdd(false);
        fetchDesks();
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
      const res = await fetch(`/api/admin/desks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: editCode, name: editName, locationLabel: editLocation }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Zaktualizowano biurko" });
        setEditId(null);
        fetchDesks();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Błąd edycji" });
      }
    } finally {
      setEditLoading(false);
    }
  }

  async function handleToggleActive(desk: DeskRow) {
    setMessage(null);
    const res = await fetch(`/api/admin/desks/${desk.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !desk.active }),
    });
    if (res.ok) {
      fetchDesks();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Błąd zmiany statusu" });
    }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/desks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ type: "success", text: "Usunięto biurko" });
        setDeleteId(null);
        fetchDesks();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Błąd usuwania" });
        setDeleteId(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  function startEdit(desk: DeskRow) {
    setEditId(desk.id);
    setEditCode(desk.code);
    setEditName(desk.name);
    setEditLocation(desk.locationLabel);
  }

  const activeCount = desks.filter((d) => d.active).length;

  const locationLabels = [...new Set(desks.map((d) => d.locationLabel))].sort();

  const columns: Column<DeskRow>[] = [
    {
      key: "code",
      header: "Kod",
      render: (desk) =>
        editId === desk.id ? (
          <input
            value={editCode}
            onChange={(e) => setEditCode(e.target.value)}
            className="border rounded px-2 py-1 w-20 text-sm"
          />
        ) : (
          <span className="font-medium">{desk.code}</span>
        ),
      className: "w-24",
    },
    {
      key: "name",
      header: "Nazwa",
      render: (desk) =>
        editId === desk.id ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="border rounded px-2 py-1 w-full text-sm"
          />
        ) : (
          desk.name
        ),
    },
    {
      key: "location",
      header: "Pokój",
      render: (desk) =>
        editId === desk.id ? (
          <input
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value)}
            className="border rounded px-2 py-1 w-full text-sm"
            list="location-labels"
          />
        ) : (
          desk.locationLabel
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (desk) => (
        <button
          onClick={() => handleToggleActive(desk)}
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            desk.active
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {desk.active ? "Aktywne" : "Nieaktywne"}
        </button>
      ),
      className: "w-28",
    },
    {
      key: "reservations",
      header: "Rezerwacje",
      render: (desk) => <span className="text-gray-500">{desk.reservationsCount}</span>,
      className: "w-24 text-center",
    },
    {
      key: "actions",
      header: "Akcje",
      render: (desk) =>
        editId === desk.id ? (
          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(desk.id)}
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
              onClick={() => startEdit(desk)}
              className="text-xs text-blue-600 hover:underline"
            >
              Edytuj
            </button>
            <button
              onClick={() => setDeleteId(desk.id)}
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
      <td className="px-4 py-3">
        <input
          value={addLocation}
          onChange={(e) => setAddLocation(e.target.value)}
          placeholder="Pokój"
          className="border rounded px-2 py-1 w-full text-sm"
          list="location-labels"
        />
      </td>
      <td className="px-4 py-3" />
      <td className="px-4 py-3" />
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            disabled={addLoading || !addCode || !addName || !addLocation}
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
      <datalist id="location-labels">
        {locationLabels.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">
          Biurka ({activeCount} aktywnych / {desks.length} łącznie)
        </h2>
        <button
          onClick={() => {
            setShowAdd(true);
            setAddCode("");
            setAddName("");
            setAddLocation("");
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Dodaj biurko
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

      <AdminTable columns={columns} data={desks} getKey={(d) => d.id} headerRow={addRow} />

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
              Czy na pewno chcesz usunąć biurko{" "}
              <strong>{desks.find((d) => d.id === deleteId)?.code}</strong>?
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
