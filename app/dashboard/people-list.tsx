"use client";

import { useState } from "react";

interface PeopleListProps {
  title: string;
  count: number;
  totalCount?: number;
  people: Array<{ name: string; detail?: string }>;
  icon?: string;
  defaultExpanded?: boolean;
  accentColor?: string;
}

export default function PeopleList({
  title,
  count,
  totalCount,
  people,
  icon,
  defaultExpanded = false,
  accentColor = "text-blue-600",
}: PeopleListProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-800">
          {icon && <span className="mr-1">{icon}</span>}
          {title}: {totalCount != null ? `${count}/${totalCount}` : count}
        </h3>
      </div>

      <button
        onClick={() => setExpanded((prev) => !prev)}
        className={`text-xs ${accentColor} hover:underline cursor-pointer`}
      >
        {expanded ? "Zwiń listę" : "Rozwiń listę"}
      </button>

      {expanded && (
        <div className="mt-3">
          {people.length === 0 ? (
            <p className="text-sm text-gray-400">Brak osób</p>
          ) : (
            <ul className="space-y-1">
              {people.map((p) => (
                <li key={p.detail ? `${p.detail}-${p.name}` : p.name} className="text-sm text-gray-700">
                  {p.detail ? `${p.detail}: ${p.name}` : p.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
