"use client";

import { fourchette, metres } from "@/lib/format";
import type { LignePlante, Plante } from "@/lib/types";

const EXPOSITION: Record<string, string> = { soleil: "Soleil", "mi-ombre": "Mi-ombre", ombre: "Ombre" };
const ENTRETIEN = ["", "Très facile", "Modéré", "Exigeant"];
const SOLS: Record<string, string> = {
  normal: "ordinaire",
  argileux: "argileux",
  sec: "sec",
  calcaire: "calcaire",
  humide: "frais à humide",
  acide: "acide",
};

export function FichePlante({ plante: p, ligne }: { plante: Plante; ligne: LignePlante }) {
  const caracteristiques: [string, string][] = [
    ["Exposition", p.exposition.map((e) => EXPOSITION[e]).join(", ")],
    ["Hauteur adulte", metres(p.hauteur)],
    ["Largeur adulte", metres(p.largeur)],
    ["Espacement", metres(p.espacement)],
    ["Rusticité", `${p.rusticite} °C`],
    ["Sol", p.sols.map((s) => SOLS[s]).join(", ")],
    ["Feuillage", p.feuillage],
    ["Floraison", p.floraison ? `${p.floraison.couleur}, ${p.floraison.periode}` : "Non décorative"],
    ["Croissance", p.croissance],
    ["Entretien", ENTRETIEN[p.entretien]],
    ["Conditionnement", p.conditionnement],
  ];
  return (
    <details className="carte group p-0">
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sauge text-lg font-bold text-foret">
          {ligne.quantite}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{p.nom}</span>
          <span className="block text-sm italic text-neutral-500">{p.latin}</span>
          <span className="mt-1 block text-sm text-neutral-700">
            {ligne.role} · {ligne.emplacement}
          </span>
        </span>
        <span className="text-right text-sm">
          <span className="block font-semibold">{fourchette(p.prixMin * ligne.quantite, p.prixMax * ligne.quantite)}</span>
          <span className="block text-xs text-neutral-500">{fourchette(p.prixMin, p.prixMax)} / u</span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-neutral-100 px-4 pb-4 pt-3">
        <p className="text-sm text-neutral-700">{p.description}</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          {caracteristiques.map(([k, v]) => (
            <div key={k}>
              <dt className="text-neutral-500">{k}</dt>
              <dd className="font-medium first-letter:uppercase">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}
