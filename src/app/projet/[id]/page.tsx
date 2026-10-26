"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AvantApres } from "@/components/AvantApres";
import { FichePlante } from "@/components/FichePlante";
import { trouverPlante } from "@/data/vegetaux";
import { hauteurALivraison, LIBELLE_SAISON, libelleHorizon, parametresVisuel, tailleApres } from "@/lib/croissance";
import { euros, fourchette } from "@/lib/format";
import { DEFINITIONS, resumerReponses } from "@/lib/questionnaires";
import { calculerBudget } from "@/lib/selection";
import { enregistrerProjet, lireProjet, supprimerProjet } from "@/lib/stockage";
import type { Projet, Version } from "@/lib/types";

const URL_DEVIS = process.env.NEXT_PUBLIC_URL_DEVIS || "https://www.direct-vegetal.com/index.php/contact-2";

const SUGGESTIONS: Record<Projet["type"], string[]> = {
  haie: ["Plus fleurie", "Uniquement des persistants", "Moins haute", "Plus de plantes pour les oiseaux"],
  massif: ["Plus de couleurs", "Plus de graminées", "Moins d'entretien", "Remplacer le paillage par du gravier"],
  isole: ["Un arbre plus petit", "Un persistant", "Plus de fleurs au pied", "Une ambiance plus exotique"],
};

type Generation = { mode: Version["origine"]; instruction?: string };

export default function PageProjet() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [projet, setProjet] = useState<Projet | null>();
  const [enCours, setEnCours] = useState<Generation>();
  const [erreur, setErreur] = useState<string>();
  const [instruction, setInstruction] = useState("");
  const [copie, setCopie] = useState(false);
  const lance = useRef(false);

  const generer = useCallback(async (p: Projet, g: Generation) => {
    setEnCours(g);
    setErreur(undefined);
    try {
      const reponse = await fetch("/api/generer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: p.type,
          reponses: p.reponses,
          photo: p.photo,
          mode: g.mode,
          instruction: g.instruction,
          precedente: p.versions[p.versionActive]?.conception,
          decalage: p.versions.length,
        }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) throw new Error(donnees.erreur ?? "La génération a échoué.");
      const suivant: Projet = { ...p, versions: [...p.versions, donnees as Version], versionActive: p.versions.length };
      await enregistrerProjet(suivant);
      setProjet(suivant);
      setInstruction("");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La génération a échoué.");
    } finally {
      setEnCours(undefined);
    }
  }, []);

  useEffect(() => {
    lireProjet(id).then((p) => {
      setProjet(p ?? null);
      if (p && p.versions.length === 0 && !lance.current) {
        lance.current = true;
        generer(p, { mode: "initiale" });
      }
    });
  }, [id, generer]);

  if (projet === undefined) return <p className="text-neutral-600">Chargement…</p>;
  if (projet === null)
    return (
      <p>
        Projet introuvable. <Link href="/" className="underline">Retour à l'accueil</Link>
      </p>
    );

  const version = projet.versions[projet.versionActive];

  if (!version) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={projet.photo} alt="Votre photo" className="w-full rounded-2xl" />
        {erreur ? (
          <div className="carte space-y-3">
            <p className="font-semibold text-red-700">{erreur}</p>
            <button className="bouton" onClick={() => generer(projet, { mode: "initiale" })}>
              Réessayer
            </button>
          </div>
        ) : (
          <Attente />
        )}
      </div>
    );
  }

  const c = version.conception;
  const budget = calculerBudget(c);
  const visuel = parametresVisuel(projet.type, projet.reponses);
  const indispensables = Array.isArray(projet.reponses.indispensables) ? projet.reponses.indispensables : [];
  const recapitulatif = [
    `Projet : ${c.titre}`,
    resumerReponses(projet.type, projet.reponses),
    "",
    "Végétaux :",
    ...c.plantes.map((l) => `- ${l.quantite} × ${trouverPlante(l.planteId)?.nom ?? l.planteId}`),
    "",
    `Estimation végétaux et fournitures : ${fourchette(budget.total.min, budget.total.max)}`,
  ].join("\n");
  const lienDevis = `${URL_DEVIS}${URL_DEVIS.includes("?") ? "&" : "?"}message=${encodeURIComponent(recapitulatif)}`;

  async function choisirVersion(i: number) {
    if (!projet) return;
    const suivant = { ...projet, versionActive: i };
    setProjet(suivant);
    await enregistrerProjet(suivant);
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="space-y-3">
          {version.image ? (
            <AvantApres avant={projet.photo} apres={version.image} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={projet.photo} alt="Votre photo" className="w-full rounded-2xl" />
          )}
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-sauge px-3 py-1 text-foret">
              Visuel {libelleHorizon(visuel.annees)}, {LIBELLE_SAISON[visuel.saison]}
            </span>
            {version.controle && <span className="rounded-full bg-white px-3 py-1 text-neutral-700 ring-1 ring-black/5">{version.controle}</span>}
          </div>
          {c.dimensionsEstimees && (
            <p className="rounded-xl bg-white p-3 text-sm text-neutral-700 ring-1 ring-black/5">
              <span className="font-semibold">Dimensions estimées d'après la photo :</span> {c.dimensionsEstimees} Vous pouvez les
              corriger en demandant une modification (ex. : « la haie fait 12 m »).
            </p>
          )}
          {version.avertissement && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{version.avertissement}</p>
          )}
          {projet.versions.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {projet.versions.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => choisirVersion(i)}
                  className={`shrink-0 overflow-hidden rounded-lg ring-2 ${i === projet.versionActive ? "ring-foret" : "ring-transparent"}`}
                  title={v.instruction ?? v.conception.titre}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.image ?? projet.photo} alt={`Version ${i + 1}`} className="h-16 w-24 object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foret-clair">{DEFINITIONS[projet.type].titre}</p>
            <h1 className="text-2xl font-bold">{c.titre}</h1>
            <p className="mt-2 text-neutral-700">{c.resume}</p>
          </div>

          <div className="carte space-y-3">
            <p className="font-semibold">Retoucher le projet</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS[projet.type].map((s) => (
                <button
                  key={s}
                  onClick={() => setInstruction(s)}
                  className="rounded-full bg-sauge px-3 py-1 text-sm text-foret hover:bg-sauge/70"
                >
                  {s}
                </button>
              ))}
            </div>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={2}
              placeholder="Ex. : remplace les lauriers par des plantes fleuries"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="bouton flex-1"
                disabled={!!enCours || !instruction.trim()}
                onClick={() => generer(projet, { mode: "modification", instruction: instruction.trim() })}
              >
                Appliquer la modification
              </button>
              <button
                className="bouton-secondaire flex-1"
                disabled={!!enCours}
                onClick={() => generer(projet, { mode: "variante" })}
              >
                Nouvelle variante
              </button>
            </div>
            {enCours && <Attente compacte />}
            {erreur && <p className="text-sm text-red-700">{erreur}</p>}
          </div>

          <div className="carte space-y-2 bg-foret text-white">
            <p className="text-sm opacity-80">Estimation végétaux et fournitures</p>
            <p className="text-2xl font-bold">{fourchette(budget.total.min, budget.total.max)}</p>
            <p className="text-xs opacity-80">Hors main-d'œuvre et livraison. Prix indicatifs TTC.</p>
            <a href={lienDevis} target="_blank" rel="noopener" className="bouton mt-2 w-full bg-white text-foret hover:bg-sauge">
              Demander un devis
            </a>
            <button
              className="w-full text-sm underline opacity-90"
              onClick={async () => {
                await navigator.clipboard.writeText(recapitulatif);
                setCopie(true);
                setTimeout(() => setCopie(false), 2000);
              }}
            >
              {copie ? "Récapitulatif copié" : "Copier le récapitulatif du projet"}
            </button>
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Les végétaux du projet</h2>
        <p className="text-sm text-neutral-600">Touchez une plante pour voir sa fiche complète.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {c.plantes.map((l) => {
            const p = trouverPlante(l.planteId);
            return p ? (
              <FichePlante
                key={l.planteId}
                plante={p}
                ligne={l}
                indispensable={indispensables.includes(p.id)}
                livraison={hauteurALivraison(p)}
                surVisuel={tailleApres(p, visuel.annees, visuel.limite)}
                momentVisuel={libelleHorizon(visuel.annees)}
              />
            ) : null;
          })}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="carte">
          <h2 className="mb-3 text-lg font-semibold">Détail du budget</h2>
          <table className="w-full text-sm">
            <tbody>
              {[...budget.lignes, ...budget.lignesMateriaux].map((l) => (
                <tr key={l.libelle} className="border-b border-neutral-100">
                  <td className="py-1.5 pr-2">
                    {l.quantite} × {l.libelle}
                  </td>
                  <td className="whitespace-nowrap py-1.5 text-right">
                    {euros(l.min)} – {euros(l.max)}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="pt-2">Total</td>
                <td className="whitespace-nowrap pt-2 text-right">
                  {euros(budget.total.min)} – {euros(budget.total.max)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="carte space-y-3">
          <h2 className="text-lg font-semibold">Conseils de plantation</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
            {c.conseils.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <h3 className="pt-2 font-semibold">Ce que l'IA a observé sur la photo</h3>
          <p className="text-sm text-neutral-700">{c.analysePhoto}</p>
          {c.hypotheses && (
            <>
              <h3 className="pt-2 font-semibold">Échelle retenue pour le visuel</h3>
              <p className="text-sm text-neutral-700">{c.hypotheses}</p>
            </>
          )}
        </div>
      </section>

      <div className="flex justify-between text-sm">
        <Link href="/" className="underline">
          Retour à l'accueil
        </Link>
        <button
          className="text-red-700 underline"
          onClick={async () => {
            if (!confirm("Supprimer ce projet ?")) return;
            await supprimerProjet(projet.id);
            router.push("/");
          }}
        >
          Supprimer le projet
        </button>
      </div>
    </div>
  );
}

function Attente({ compacte }: { compacte?: boolean }) {
  const etapes = ["Analyse de la photo", "Choix des végétaux adaptés", "Calcul des quantités", "Création du visuel"];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, etapes.length - 1)), 9000);
    return () => clearInterval(t);
  }, [etapes.length]);
  return (
    <div className={compacte ? "flex items-center gap-2 text-sm text-foret" : "carte flex items-center gap-3 text-foret"}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-foret border-t-transparent" />
      <span>
        {etapes[i]}… {!compacte && <span className="text-neutral-500">(environ une minute)</span>}
      </span>
    </div>
  );
}
