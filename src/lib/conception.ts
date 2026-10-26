import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { MATERIAUX, trouverPlante } from "@/data/vegetaux";
import { aspectEnSaison, hauteurALivraison, LIBELLE_SAISON, libelleHorizon, parametresVisuel, tailleApres } from "./croissance";
import { resumerReponses } from "./questionnaires";
import { ajouterIndispensablesManquants, alertesPlante, plantesIndispensables, preselection, reperesQuantites } from "./selection";
import type { Conception, Plante, Reponses, TypeProjet } from "./types";

const MODELE = "claude-opus-5-5";

const SYSTEME = `Tu es un paysagiste-pépiniériste français expérimenté. À partir de la photo d'un espace extérieur et des réponses d'un client, tu conçois un aménagement beau, adapté au terrain et surtout fidèle à la réalité : le client doit retrouver dans son jardin ce que montre le visuel.

Conception :
- Tu choisis les végétaux uniquement parmi la liste fournie (identifiants exacts). Elle a déjà été filtrée selon le climat, l'exposition et le sol du client.
- Les plantes indiquées comme indispensables par le client figurent obligatoirement dans le projet. Si l'une d'elles risque de mal se plaire, garde-la quand même, place-la au mieux et explique le risque dans un conseil.
- Tu respectes les dimensions adultes, les espacements des fiches et la place disponible. Les quantités découlent du calcul longueur ou surface ÷ espacement, sans arrondi généreux.
- Tu tiens compte de ce que montre la photo : murs, clôtures, pente, éléments existants à conserver, accès.
- Le budget du client est un plafond indicatif pour les végétaux.
- Tes textes (titre, résumé, emplacements, rôles, conseils, hypothèses) sont en français, clairs pour un particulier.

Échelle : avant de concevoir, repère sur la photo des objets de taille connue (porte 2,0 m, fenêtre 1,2 m, clôture 1,5 à 1,8 m, parpaing 20 cm, marche 17 cm, voiture 4,5 m, chaise 0,9 m) pour estimer les distances. Indique ces repères dans le champ hypotheses.

Le champ promptImage est en anglais et s'adresse à FLUX Kontext, un modèle qui retouche la photo. Il doit :
1. décrire chaque groupe de plantes avec le nombre exact de sujets, leur emplacement précis dans l'image (left, right, foreground, along the fence…) et leur aspect (couleur du feuillage et des fleurs, port) ;
2. donner la taille de chaque plante telle qu'indiquée dans les fiches pour l'horizon demandé, exprimée par rapport aux objets visibles (« about half the height of the fence », « knee-high », « reaching the bottom of the window ») et non seulement en mètres ; des jeunes plants restent petits et espacés, avec le sol ou le paillage visible entre eux ;
3. respecter l'aspect de saison indiqué dans les fiches (feuillage caduc absent en hiver, fleurs uniquement si la plante fleurit à cette saison) ;
4. décrire le sol : paillage choisi, terre fraîchement travaillée si l'horizon est le jour de la plantation ;
5. finir par : "Do not add any other plants, objects or people. Keep everything else in the photo exactly identical: same camera angle, framing, house, fences, ground, sky, lighting, shadows and colors. Photorealistic, natural garden photography."
6. faire moins de 160 mots.`;

function ficheCourte(p: Plante, type: TypeProjet, r: Reponses): string {
  const { annees, saison, limite } = parametresVisuel(type, r);
  const t = tailleApres(p, annees, limite);
  return [
    `id: ${p.id}`,
    `${p.nom} (${p.latin})`,
    `${p.categorie}, ${p.feuillage}`,
    `adulte H ${p.hauteur} m × L ${p.largeur} m`,
    `livré ${p.conditionnement} (≈ ${hauteurALivraison(p)} m)`,
    `taille sur le visuel ≈ H ${t.hauteur} m × L ${t.largeur} m`,
    `aspect ${LIBELLE_SAISON[saison]} : ${aspectEnSaison(p, saison)}`,
    `espacement ${p.espacement} m`,
    `${p.prixMin}-${p.prixMax} €/u`,
    p.description,
  ].join(" | ");
}

export interface DemandeConception {
  type: TypeProjet;
  reponses: Reponses;
  photo: string;
  mode: "initiale" | "variante" | "modification";
  precedente?: Conception;
  instruction?: string;
}

export function iaDisponible() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function blocImage(photo: string) {
  const [entete, donnees] = photo.split(",", 2);
  const mediaType = (entete.match(/data:(image\/[a-z]+);/)?.[1] ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";
  return { type: "image" as const, source: { type: "base64" as const, media_type: mediaType, data: donnees } };
}

export async function concevoirAvecIA(d: DemandeConception): Promise<Conception> {
  const candidats = preselection(d.type, d.reponses);
  const ids = candidats.map((c) => c.plante.id);
  // Lors d'une modification, le client peut demander une plante déjà présente hors présélection.
  for (const l of d.precedente?.plantes ?? []) if (!ids.includes(l.planteId)) ids.push(l.planteId);
  if (ids.length === 0) {
    throw new Error("Aucun végétal du catalogue ne correspond à ces conditions. Essayez d'assouplir vos critères.");
  }

  const schema = z.object({
    titre: z.string().describe("Nom évocateur du projet, 3 à 6 mots"),
    resume: z.string().describe("2 à 3 phrases qui décrivent l'aménagement proposé"),
    analysePhoto: z.string().describe("Ce que tu observes sur la photo et qui a guidé la conception, 2 phrases"),
    dimensionsEstimees: z
      .string()
      .describe("Si le client n'a pas donné les dimensions : celles que tu as estimées d'après la photo, en une phrase. Sinon chaîne vide."),
    hypotheses: z.string().describe("Repères d'échelle utilisés sur la photo et tailles retenues pour le visuel, 1 à 2 phrases"),
    plantes: z.array(
      z.object({
        planteId: z.enum(ids as [string, ...string[]]),
        quantite: z.number().int().describe("Nombre de plants"),
        emplacement: z.string().describe("Où planter, en se référant à la photo"),
        role: z.string().describe("Rôle dans la composition : structure, fond, premier plan, couvre-sol..."),
      }),
    ),
    materiaux: z.array(
      z.object({
        materiauId: z.enum(MATERIAUX.map((m) => m.id) as [string, ...string[]]),
        quantite: z.number().describe("Quantité dans l'unité du matériau"),
      }),
    ),
    conseils: z.array(z.string()).describe("3 à 5 conseils de plantation et d'entretien spécifiques au projet"),
    promptImage: z.string(),
  });

  const plantesTexte = ids
    .map((id) => trouverPlante(id))
    .filter((p): p is Plante => Boolean(p))
    .map((p) => ficheCourte(p, d.type, d.reponses))
    .join("\n");
  const materiauxTexte = MATERIAUX.map((m) => `${m.id} : ${m.nom} (${m.unite}, ${m.prixMin}-${m.prixMax} €)`).join("\n");

  const indispensables = plantesIndispensables(d.reponses);
  const indispensablesTexte = indispensables.length
    ? `Plantes indispensables (à inclure obligatoirement) :\n${indispensables
        .map((p) => {
          const alertes = alertesPlante(p, d.reponses);
          return `- ${p.id}${alertes.length ? ` (attention : ${alertes.join(" ; ")})` : ""}`;
        })
        .join("\n")}`
    : "Aucune plante imposée par le client.";

  const { annees, saison } = parametresVisuel(d.type, d.reponses);
  const visuelTexte = `Le visuel montre le jardin ${libelleHorizon(annees)}, ${LIBELLE_SAISON[saison]}. Utilise les tailles « sur le visuel » et les aspects de saison des fiches.`;

  let consigne = "Conçois l'aménagement.";
  if (d.mode === "variante" && d.precedente) {
    consigne = `Propose une variante nettement différente de la proposition précédente (autres espèces dominantes ou autre composition), toujours adaptée aux mêmes réponses et avec les mêmes plantes indispensables. Proposition précédente : ${JSON.stringify({ titre: d.precedente.titre, plantes: d.precedente.plantes })}`;
  }
  if (d.mode === "modification" && d.precedente) {
    consigne = `Reprends la proposition précédente et applique uniquement la modification demandée par le client, en gardant le reste identique.
Proposition précédente : ${JSON.stringify({ titre: d.precedente.titre, plantes: d.precedente.plantes, materiaux: d.precedente.materiaux })}
Modification demandée : « ${d.instruction ?? ""} »
Si la demande cite une plante absente de la liste, choisis la plus proche disponible et dis-le dans le résumé.`;
  }

  const client = new Anthropic();
  const reponse = await client.beta.messages.parse({
    model: MODELE,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high", format: betaZodOutputFormat(schema) },
    system: SYSTEME,
    messages: [
      {
        role: "user",
        content: [
          blocImage(d.photo),
          {
            type: "text",
            text: [
              `Réponses du client :\n${resumerReponses(d.type, d.reponses)}`,
              `Repères de quantités : ${reperesQuantites(d.type, d.reponses)}`,
              visuelTexte,
              indispensablesTexte,
              `Végétaux autorisés :\n${plantesTexte}`,
              `Matériaux disponibles :\n${materiauxTexte}`,
              consigne,
            ].join("\n\n"),
          },
        ],
      },
    ],
  });

  if (reponse.stop_reason === "refusal") {
    throw new Error("L'IA n'a pas pu traiter cette photo. Essayez avec une autre prise de vue.");
  }
  const resultat = reponse.parsed_output;
  if (!resultat) throw new Error("La réponse de l'IA est incomplète, veuillez réessayer.");

  const plantes = resultat.plantes
    .filter((l) => l.quantite > 0)
    .map((l) => ({ ...l, quantite: Math.min(l.quantite, 1000) }));
  ajouterIndispensablesManquants(plantes, d.reponses);
  return {
    ...resultat,
    dimensionsEstimees: resultat.dimensionsEstimees || undefined,
    plantes,
    materiaux: resultat.materiaux.filter((m) => m.quantite > 0),
  };
}

export interface Controle {
  conforme: boolean;
  ecarts: string;
  promptCorrige: string;
}

/**
 * Compare le visuel généré à la photo d'origine et au projet : bâti inchangé,
 * nombre et taille des plantes, aspect de saison. Propose une consigne corrigée si besoin.
 */
export async function verifierRendu(
  photo: string,
  image: string,
  conception: Conception,
  type: TypeProjet,
  reponses: Reponses,
): Promise<Controle> {
  const schema = z.object({
    conforme: z.boolean().describe("true si le visuel est fidèle à la photo et au projet"),
    ecarts: z.string().describe("Écarts constatés, en français, une ou deux phrases ; chaîne vide si conforme"),
    promptCorrige: z.string().describe("Si non conforme : la consigne FLUX Kontext corrigée, en anglais, moins de 160 mots ; sinon chaîne vide"),
  });
  const { annees, saison } = parametresVisuel(type, reponses);
  const attendu = conception.plantes
    .map((l) => {
      const p = trouverPlante(l.planteId);
      return p ? `${l.quantite} × ${p.nom}, ${l.emplacement}, ≈ ${tailleApres(p, annees, parametresVisuel(type, reponses).limite).hauteur} m de haut, ${aspectEnSaison(p, saison)}` : "";
    })
    .join("\n");

  const client = new Anthropic();
  const reponse = await client.beta.messages.parse({
    model: MODELE,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
    system:
      "Tu contrôles le réalisme d'un visuel d'aménagement paysager généré par retouche d'une photo. Tu es exigeant : un client va comparer ce visuel à son futur jardin.",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Photo d'origine :" },
          blocImage(photo),
          { type: "text", text: "Visuel généré :" },
          blocImage(image),
          {
            type: "text",
            text: `Plantations attendues (${libelleHorizon(annees)}, ${LIBELLE_SAISON[saison]}) :\n${attendu}\n\nHypothèses d'échelle : ${conception.hypotheses ?? "non précisées"}\n\nConsigne utilisée : ${conception.promptImage}\n\nVérifie : 1) maison, clôtures, sol existant, cadrage et lumière identiques ; 2) nombre de plantes cohérent ; 3) tailles cohérentes avec l'échelle de la scène (ni géantes ni miniatures) ; 4) aspect de saison respecté ; 5) aucun élément inventé. Les petits écarts de rendu sont acceptables, pas les erreurs d'échelle, de nombre ou de structure.`,
          },
        ],
      },
    ],
  });
  if (reponse.stop_reason === "refusal" || !reponse.parsed_output) {
    return { conforme: true, ecarts: "", promptCorrige: "" };
  }
  return reponse.parsed_output;
}
