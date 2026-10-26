"use client";

import { useState } from "react";
import { VEGETAUX } from "@/data/vegetaux";
import { alertesPlante } from "@/lib/selection";
import type { Reponses, TypeProjet } from "@/lib/types";

const sansAccents = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Recherche dans le catalogue et choix des plantes que le projet doit obligatoirement contenir. */
export function ChoixIndispensables({
  type,
  reponses,
  onChange,
}: {
  type: TypeProjet;
  reponses: Reponses;
  onChange: (ids: string[]) => void;
}) {
  const [recherche, setRecherche] = useState("");
  const choisis = Array.isArray(reponses.indispensables) ? reponses.indispensables : [];

  const terme = sansAccents(recherche.trim());
  const resultats = VEGETAUX.filter((p) => !choisis.includes(p.id))
    .filter((p) => (terme ? sansAccents(`${p.nom} ${p.latin}`).includes(terme) : p.usages.includes(type)))
    .slice(0, terme ? 10 : 6);

  return (
    <div className="space-y-4">
      {choisis.length > 0 && (
        <ul className="space-y-2">
          {choisis.map((id) => {
            const p = VEGETAUX.find((x) => x.id === id);
            if (!p) return null;
            const alertes = alertesPlante(p, reponses);
            return (
              <li key={id} className="rounded-xl border border-foret bg-sauge/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{p.nom}</p>
                    <p className="text-sm italic text-neutral-500">{p.latin}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange(choisis.filter((x) => x !== id))}
                    className="text-sm text-foret underline"
                  >
                    Retirer
                  </button>
                </div>
                {alertes.length > 0 && (
                  <p className="mt-2 text-sm text-amber-800">
                    Attention : cette plante {alertes.join(", ")}. Elle sera tout de même intégrée, avec un conseil adapté.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <label className="block">
        <span className="mb-1 block font-semibold">Rechercher une plante</span>
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Ex. : photinia, lavande, olivier…"
          className="w-full rounded-xl border border-neutral-300 px-3 py-2"
        />
      </label>

      <div>
        {!terme && <p className="mb-2 text-sm text-neutral-600">Quelques idées pour ce type de projet :</p>}
        {resultats.length === 0 ? (
          <p className="text-sm text-neutral-600">Aucune plante du catalogue ne correspond à « {recherche} ».</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {resultats.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange([...choisis, p.id]);
                  setRecherche("");
                }}
                className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:border-foret"
              >
                + {p.nom}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
