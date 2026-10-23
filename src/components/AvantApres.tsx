"use client";

import { useState } from "react";

/** Compare la photo d'origine et le visuel généré avec un curseur glissant. */
export function AvantApres({ avant, apres }: { avant: string; apres: string }) {
  const [position, setPosition] = useState(50);
  return (
    <div className="relative select-none overflow-hidden rounded-2xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={apres} alt="Projet aménagé" className="block w-full" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avant} alt="Photo d'origine" className="block h-full w-full object-cover" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${position}%` }} />
      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
        Avant
      </span>
      <span className="absolute right-3 top-3 rounded-full bg-foret/90 px-3 py-1 text-xs font-semibold text-white">
        Après
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-label="Comparer avant et après"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
