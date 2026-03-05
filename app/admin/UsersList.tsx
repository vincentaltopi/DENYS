"use client";

import { useState } from "react";

type User = {
  id: string;
  email: string | undefined;
  role: "admin" | "user";
  created_at: string;
};

export default function UsersList({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleRole(userId: string, currentRole: "admin" | "user") {
    const newRole = currentRole === "admin" ? "user" : "admin";
    setLoading(userId);
    setError(null);

    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    const data = await res.json();
    setLoading(null);

    if (!res.ok) {
      setError(data.error ?? "Erreur lors de la mise à jour.");
      return;
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 border border-red-200">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-emerald-950/10 text-left text-xs font-semibold text-emerald-950/50">
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Rôle</th>
              <th className="pb-2 pr-4">Créé le</th>
              <th className="pb-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-emerald-950/5 last:border-0">
                <td className="py-2.5 pr-4 text-emerald-950">{u.email}</td>
                <td className="py-2.5 pr-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.role === "admin"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {u.role === "admin" ? "Admin" : "Utilisateur"}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-emerald-950/50">
                  {new Date(u.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="py-2.5">
                  <button
                    onClick={() => toggleRole(u.id, u.role)}
                    disabled={loading === u.id}
                    className="rounded-lg border border-emerald-950/15 px-3 py-1 text-xs font-medium text-emerald-950/70 hover:bg-emerald-50 disabled:opacity-40 transition"
                  >
                    {loading === u.id
                      ? "…"
                      : u.role === "admin"
                      ? "Rétrograder"
                      : "Promouvoir admin"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-emerald-950/40">
        L'utilisateur doit se déconnecter et se reconnecter pour que le changement de rôle prenne effet.
      </p>
    </div>
  );
}
