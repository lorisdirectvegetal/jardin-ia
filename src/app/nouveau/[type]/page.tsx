"use client";

import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { preparerPhoto } from "@/lib/image";
import { ChoixIndispensables } from "@/components/ChoixIndispensables";
import { DEFINITIONS, reponsesParDefaut, type Question } from "@/lib/questionnaires";
import { enregistrerProjet } from "@/lib/stockage";
import type { Reponses, TypeProjet, ValeurReponse } from "@/lib/types";

export default function NouveauProjet() {
  const { type } = useParams<{ type: TypeProjet }>();
  const definition = DEFINITIONS[type];
  const router = useRouter();
  const [etape, setEtape] = useState(0);
  const [photo, setPhoto] = useState<string>();
  const [chargementPhoto, setChargementPhoto] = useState(false);
  const [reponses, setReponses] = useState<Reponses>(() => (definition ? reponsesParDefaut(type) : {}));
  const champPhoto = useRef<HTMLInputElement>(null);

  if (!definition) return <p>Type de projet inconnu.</p>;

  // Étapes : la photo, les questions du projet, puis les plantes indispensables.
  const total = definition.etapes.length + 2;
  const estPhoto = etape === 0;
  const estIndispensables = etape === total - 1;
  const etapeCourante = definition.etapes[etape - 1];

  async function choisirPhoto(fichier?: File) {
    if (!fichier) return;
    setChargementPhoto(true);
    try {
      setPhoto(await preparerPhoto(fichier));
    } finally {
      setChargementPhoto(false);
    }
  }

  async function lancer() {
    if (!photo) return;
    const id = crypto.randomUUID();
    await enregistrerProjet({
      id,
      creeLe: new Date().toISOString(),
      type,
      photo,
      reponses,
      versions: [],
      versionActive: 0,
    });
    router.push(`/projet/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-medium text-foret-clair">{definition.titre}</p>
        <div className="mt-2 flex gap-1" aria-label={`Étape ${etape + 1} sur ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= etape ? "bg-foret" : "bg-sauge"}`} />
          ))}
        </div>
      </div>

      {estPhoto ? (
        <section className="carte space-y-4">
          <h1 className="text-2xl font-bold">Photographiez l'espace à aménager</h1>
          <p className="text-neutral-700">{definition.conseilPhoto}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">
            <li>Prenez la photo de jour, sans contre-jour.</li>
            <li>Tenez le téléphone à l'horizontale, à hauteur d'yeux.</li>
            <li>Dégagez le sol des objets qui ne resteront pas (outils, jouets).</li>
          </ul>
          <input
            ref={champPhoto}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => choisirPhoto(e.target.files?.[0])}
          />
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Votre photo" className="w-full rounded-xl" />
          ) : (
            <button
              type="button"
              onClick={() => champPhoto.current?.click()}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foret/40 bg-sauge/40 text-foret"
            >
              <span className="text-4xl" aria-hidden>
                📷
              </span>
              <span className="font-semibold">{chargementPhoto ? "Préparation…" : "Prendre ou choisir une photo"}</span>
            </button>
          )}
          {photo && (
            <button type="button" className="bouton-secondaire w-full" onClick={() => champPhoto.current?.click()}>
              Changer de photo
            </button>
          )}
        </section>
      ) : estIndispensables ? (
        <section className="carte space-y-4">
          <h1 className="text-2xl font-bold">Des plantes indispensables ?</h1>
          <p className="text-neutral-700">
            Si vous tenez à certaines plantes, ajoutez-les : elles seront obligatoirement intégrées au projet. Sinon,
            passez directement à la génération.
          </p>
          <ChoixIndispensables
            type={type}
            reponses={reponses}
            onChange={(ids) => setReponses((r) => ({ ...r, indispensables: ids }))}
          />
        </section>
      ) : (
        <section className="carte space-y-6">
          <h1 className="text-2xl font-bold">{etapeCourante.titre}</h1>
          {etapeCourante.questions.map((q) => (
            <ChampQuestion
              key={q.id}
              question={q}
              valeur={reponses[q.id]}
              onChange={(v) => setReponses((r) => ({ ...r, [q.id]: v }))}
            />
          ))}
        </section>
      )}

      <div className="flex gap-3">
        {etape > 0 && (
          <button type="button" className="bouton-secondaire flex-1" onClick={() => setEtape(etape - 1)}>
            Retour
          </button>
        )}
        {etape < total - 1 ? (
          <button
            type="button"
            className="bouton flex-1"
            disabled={estPhoto && !photo}
            onClick={() => setEtape(etape + 1)}
          >
            Continuer
          </button>
        ) : (
          <button type="button" className="bouton flex-1" onClick={lancer}>
            Générer mon projet
          </button>
        )}
      </div>
    </div>
  );
}

function ChampQuestion({
  question: q,
  valeur,
  onChange,
}: {
  question: Question;
  valeur: ValeurReponse | undefined;
  onChange: (v: ValeurReponse) => void;
}) {
  const titre = (
    <div className="mb-2">
      <p className="font-semibold">{q.label}</p>
      {q.aide && <p className="text-sm text-neutral-600">{q.aide}</p>}
    </div>
  );

  if (q.type === "nombre") {
    return (
      <label className="block">
        {titre}
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={q.min}
            max={q.max}
            step="0.1"
            value={valeur === undefined ? "" : String(valeur)}
            placeholder={q.facultatif ? "?" : undefined}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-32 rounded-xl border border-neutral-300 px-3 py-2 text-lg"
          />
          <span className="text-neutral-600">{q.unite}</span>
        </div>
        {q.facultatif && (
          <p className="mt-1 text-sm text-neutral-500">
            Facultatif : laissez vide si vous ne savez pas, la mesure sera estimée d'après la photo.
          </p>
        )}
      </label>
    );
  }

  const multi = q.type === "multi";
  const choisis = multi ? (Array.isArray(valeur) ? valeur : []) : [String(valeur ?? "")];
  return (
    <fieldset>
      <legend className="contents">{titre}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {q.options?.map((o) => {
          const actif = choisis.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={actif}
              onClick={() =>
                onChange(
                  multi
                    ? actif
                      ? choisis.filter((x) => x !== o.value)
                      : [...choisis, o.value]
                    : o.value,
                )
              }
              className={`rounded-xl border px-4 py-3 text-left transition ${
                actif ? "border-foret bg-sauge ring-2 ring-foret" : "border-neutral-300 bg-white hover:border-foret"
              }`}
            >
              <span className="block font-medium">{o.label}</span>
              {o.aide && <span className="block text-sm text-neutral-600">{o.aide}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
