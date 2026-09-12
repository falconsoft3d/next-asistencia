"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { inputClass } from "./ui";
import type { Project } from "@/lib/types";

interface ProjectComboboxProps {
  projects: Project[];
  value: number | "";
  onChange: (id: number | "") => void;
  placeholder?: string;
}

function projectLabel(p: Project) {
  return `[${p.name}] ${p.nombre}${p.state ? ` [${p.state}]` : ""}`;
}

export function ProjectCombobox({ projects, value, onChange, placeholder }: ProjectComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => projects.find((p) => p.id === value) ?? null, [projects, value]);

  useEffect(() => {
    setQuery(selected ? projectLabel(selected) : "");
  }, [selected]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(selected ? projectLabel(selected) : "");
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && projectLabel(selected).toLowerCase() === q)) return projects;
    return projects.filter((p) => projectLabel(p).toLowerCase().includes(q));
  }, [projects, query, selected]);

  function handleSelect(p: Project) {
    onChange(p.id);
    setQuery(projectLabel(p));
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        className={inputClass}
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value !== "") onChange("");
        }}
      />
      {open && filtered.length > 0 ? (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(p)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
              >
                {projectLabel(p)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && filtered.length === 0 ? (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 shadow-lg">
          Sin resultados
        </div>
      ) : null}
    </div>
  );
}
