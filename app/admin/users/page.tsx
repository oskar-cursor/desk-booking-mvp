"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import AdminTable, { Column } from "../admin-table";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  active: boolean;
  stats: {
    totalReservations: number;
    totalParkingReservations: number;
    currentPresence: "HOME" | "OFFICE" | "ABSENT" | null;
  };
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id;

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [search, setSearch] = useState("");

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<"USER" | "ADMIN">("USER");
  const [addLoading, setAddLoading] = useState(false);

  // Edit modal
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"USER" | "ADMIN">("USER");
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) setUsers(await res.json());
    } catch {
      // keep current
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleAdd() {
    setAddLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName, email: addEmail, password: addPassword, role: addRole }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: `Dodano użytkownika ${addName}` });
        setShowAddModal(false);
        fetchUsers();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Błąd dodawania" });
      }
    } finally {
      setAddLoading(false);
    }
  }

  async function handleEdit() {
    if (!editUser) return;
    setEditLoading(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        name: editName,
        email: editEmail,
        role: editRole,
        active: editActive,
      };
      if (editPassword) body.password = editPassword;

      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Zaktualizowano użytkownika" });
        setEditUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Błąd edycji" });
      }
    } finally {
      setEditLoading(false);
    }
  }

  async function handleToggleActive(user: UserRow) {
    setMessage(null);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    if (res.ok) {
      fetchUsers();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Błąd zmiany statusu" });
    }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ type: "success", text: "Usunięto użytkownika" });
        setDeleteId(null);
        fetchUsers();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Błąd usuwania" });
        setDeleteId(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  function startEdit(user: UserRow) {
    setEditUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditActive(user.active);
    setEditPassword("");
  }

  function presenceBadge(p: "HOME" | "OFFICE" | "ABSENT" | null) {
    if (!p) return <span className="text-gray-300">—</span>;
    const styles = {
      OFFICE: "bg-blue-100 text-blue-700",
      HOME: "bg-gray-100 text-gray-700",
      ABSENT: "bg-orange-100 text-orange-700",
    };
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[p]}`}>
        {p}
      </span>
    );
  }

  const filtered = search
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const activeCount = users.filter((u) => u.active).length;

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      header: "Imię",
      render: (u) => <span className="font-medium">{u.name}</span>,
    },
    {
      key: "email",
      header: "Email",
      render: (u) => <span className="text-gray-600">{u.email}</span>,
    },
    {
      key: "role",
      header: "Rola",
      render: (u) => (
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            u.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {u.role}
        </span>
      ),
      className: "w-24",
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <button
          onClick={() => handleToggleActive(u)}
          disabled={u.id === currentUserId}
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            u.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          } ${u.id === currentUserId ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {u.active ? "Aktywny" : "Nieaktywny"}
        </button>
      ),
      className: "w-28",
    },
    {
      key: "presence",
      header: "Dziś",
      render: (u) => presenceBadge(u.stats.currentPresence),
      className: "w-24",
    },
    {
      key: "actions",
      header: "Akcje",
      render: (u) => (
        <div className="flex gap-2">
          <button
            onClick={() => startEdit(u)}
            className="text-xs text-blue-600 hover:underline"
          >
            Edytuj
          </button>
          {u.id !== currentUserId && (
            <button
              onClick={() => setDeleteId(u.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Usuń
            </button>
          )}
        </div>
      ),
      className: "w-28",
    },
  ];

  if (loading) {
    return <div className="text-center text-gray-500 py-8">Ładowanie...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">
          Użytkownicy ({activeCount} aktywnych / {users.length} łącznie)
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj..."
            className="border rounded-lg px-3 py-2 text-sm w-48"
          />
          <button
            onClick={() => {
              setShowAddModal(true);
              setAddName("");
              setAddEmail("");
              setAddPassword("");
              setAddRole("USER");
            }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Dodaj użytkownika
          </button>
        </div>
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

      <AdminTable columns={columns} data={filtered} getKey={(u) => u.id} />

      {/* Add modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <h3 className="text-lg font-bold text-gray-800 mb-4">Dodaj użytkownika</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Imię</label>
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hasło</label>
              <input
                type="password"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rola</label>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as "USER" | "ADMIN")}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Anuluj
            </button>
            <button
              onClick={handleAdd}
              disabled={addLoading || !addName || !addEmail || !addPassword}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {addLoading ? "Dodawanie..." : "Dodaj"}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editUser && (
        <Modal onClose={() => setEditUser(null)}>
          <h3 className="text-lg font-bold text-gray-800 mb-4">Edytuj użytkownika</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Imię</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rola</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as "USER" | "ADMIN")}
                className="border rounded-lg px-3 py-2 text-sm w-full"
                disabled={editUser.id === currentUserId}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Aktywny</label>
              <button
                type="button"
                onClick={() => setEditActive(!editActive)}
                disabled={editUser.id === currentUserId}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  editActive ? "bg-green-500" : "bg-gray-300"
                } ${editUser.id === currentUserId ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    editActive ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nowe hasło (opcjonalne)
              </label>
              <input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Zostaw puste aby nie zmieniać"
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={() => setEditUser(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Anuluj
            </button>
            <button
              onClick={handleEdit}
              disabled={editLoading || !editName || !editEmail}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {editLoading ? "Zapisywanie..." : "Zapisz"}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete dialog */}
      {deleteId && (
        <Modal onClose={() => setDeleteId(null)}>
          <h3 className="text-lg font-bold text-gray-800 mb-3">Potwierdzenie usunięcia</h3>
          <p className="text-sm text-gray-600 mb-6">
            Czy na pewno chcesz usunąć użytkownika{" "}
            <strong>{users.find((u) => u.id === deleteId)?.name}</strong>?
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
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">{children}</div>
    </div>
  );
}
