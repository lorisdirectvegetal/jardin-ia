"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEFINITIONS } from "@/lib/questionnaires";
import { listerProjets } from "@/lib/stockage";
import type { Projet, TypeProjet } from "@/lib/types";

const ICONES: Record<TypeProjet, string> = { haie: "🌳🌳🌳", massif: "🌸🌿🌼", isole: "🌳" };

export default function Accueil() {
  const [projets, setProjets] = useState<Projet[]>([]);

  useEffect(() => {
    listerProjets().then(setProjets).catch(() => setProjets([]));
  }, []);

  return (
    <div className="space-y-10">
      <section className="space-y-3 pt-2">
        <h1 className="text-3xl font-bold leading-tight text-foret sm:text-4xl">
          Prenez une photo, voyez votre futur jardin.
        </h1>
        <p className="max-w-2xl text-lg text-neutral-700">
          Répondez à quelques questions sur votre terrain et vos envies. Vous obtenez un visuel de votre
          espace aménagé, la liste détaillée des végétaux adaptés et une estimation du budget.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Quel est votre projet ?</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(DEFINITIONS) as TypeProjet[]).map((type) => (
            <Link
              key={type}
              href={`/nouveau/${type}`}
              className="carte group flex flex-col gap-2 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="text-3xl" aria-hidden>
                {ICONES[type]}
              </span>
              <span className="text-lg font-semibold text-foret group-hover:underline">
                {DEFINITIONS[type].titre}
              </span>
              <span className="text-sm text-neutral-600">{DEFINITIONS[type].accroche}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-3 text-sm text-neutral-700 sm:grid-cols-3">
        {[
          ["1. La photo", "Prise sur place ou importée depuis votre galerie."],
          ["2. Le questionnaire", "Dimensions, sol, exposition, style et budget."],
          ["3. Le projet", "Visuel, variantes, liste des plantes et demande de devis."],
        ].map(([titre, texte]) => (
          <div key={titre} className="rounded-xl bg-sauge p-4">
            <p className="font-semibold text-foret">{titre}</p>
            <p>{texte}</p>
          </div>
        ))}
      </section>

      {projets.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Mes projets</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {projets.map((p) => {
              const v = p.versions[p.versionActive];
              return (
                <Link key={p.id} href={`/projet/${p.id}`} className="carte overflow-hidden p-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v?.image ?? p.photo} alt="" className="aspect-[4/3] w-full object-cover" />
                  <div className="p-3">
                    <p className="truncate font-semibold">{v?.conception.titre ?? DEFINITIONS[p.type].titre}</p>
                    <p className="text-xs text-neutral-500">
                      {new Date(p.creeLe).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
