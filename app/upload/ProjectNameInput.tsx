"use client";

import { useState } from "react";

export default function ProjectNameInput({
  onChange,
}: {
  onChange: (value: string) => void;
}) {
  const [name, setName] = useState("");

  return (
    <div className="mb-6">
      <label
        htmlFor="projectName"
        className="mb-1 block text-sm font-medium text-emerald-950/80"
      >
        Nom du projet
      </label>

      <input
        id="projectName"
        type="text"
        placeholder="Ex : Bilan carbone 2026"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          onChange(e.target.value);
        }}
        className="w-full rounded-xl border border-emerald-950/20 px-4 py-2 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
      />
    </div>
  );
}
