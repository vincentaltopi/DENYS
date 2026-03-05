"use client";

import { useState } from "react";

export default function InviteForm({ onSuccess }: { onSuccess?: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Erreur lors de l'invitation." });
    } else {
      setMessage({ type: "success", text: `Invitation envoyée à ${email}.` });
      setEmail("");
      setRole("user");
      onSuccess?.();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-emerald-950/60 mb-1">
            Adresse email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@exemple.com"
            className="w-full rounded-xl border border-emerald-950/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-emerald-950/60 mb-1">
            Rôle
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "user" | "admin")}
            className="w-full rounded-xl border border-emerald-950/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
          >
            <option value="user">Utilisateur</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {message && (
        <p
          className={`text-sm rounded-xl px-4 py-2 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {loading ? "Envoi…" : "Envoyer l'invitation"}
        </button>
      </div>
    </form>
  );
}
