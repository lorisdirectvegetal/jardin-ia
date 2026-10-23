import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { MATERIAUX, trouverPlante } from "@/data/vegetaux";
import { resumerReponses } from "./questionnaires";
import { preselection, reperesQuantites } from "./selection";
import type { Conception, Plante, Reponses, TypeProjet } from "./types";

const MODELE = "claude-opus-5-5";

const SYSTEME = `Tu es un paysagiste-pépiniériste français expérimenté. À partir de la photo d'un espace extérieur et des réponses d'un client, tu conçois un aménagement réaliste, beau et adapté au terrain.

Règles :
- Tu choisis les végétaux uniquement parmi la liste fournie (identifiants exacts). Elle a déjà été filtrée selon le climat, l'exposition et le sol du client.
- Tu respectes les dimensions adultes : pas de plante plus large que l'espace disponible, espacements conformes aux fiches, quantités cohérentes avec la surface ou la longueur.
- Tu tiens compte de ce que montre la photo : murs, clôtures, pente, éléments existants à conserver, accès.
- Le budget du client est un plafond indicatif pour les végétaux : choisis des espèces et des quantités qui le respectent si possible.
- Tes textes (titre, résumé, emplacements, rôles, conseils) sont en français, clairs pour un particulier.
- Le champ promptImage est en anglais et s'adresse à un modèle de retouche d'image (FLUX Kontext). Il doit :
  1. commencer par une consigne d'ajout précise : quelles plantes (décrites par leur aspect visuel : couleur du feuillage, des fleurs, port, taille sur la photo), où exactement dans l'image (gauche, droite, premier plan, le long de la clôture...) ;
  2. représenter les plantes environ 3 ans après plantation, à l'échelle réelle de la scène, avec le paillage choisi ;
  3. finir par : "Keep everything else in the photo exactly identical: same camera angle, framing, house, fences, ground, sky, lighting and colors. Photorealistic."
  4. faire moins de 120 mots.`;

function ficheCourte(p: Plante): string {
  return [
    `id: ${p.id}`,
    `${p.nom} (${p.latin})`,
    `${p.categorie}, ${p.feuillage}`,
    `H ${p.hauteur} m × L ${p.largeur} m`,
    `espacement ${p.espacement} m`,
    p.floraison ? `fleurs ${p.floraison.couleur} en ${p.floraison.periode}` : "sans floraison marquante",
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
    .map(ficheCourte)
    .join("\n");
  const materiauxTexte = MATERIAUX.map((m) => `${m.id} : ${m.nom} (${m.unite}, ${m.prixMin}-${m.prixMax} €)`).join("\n");

  let consigne = "Conçois l'aménagement.";
  if (d.mode === "variante" && d.precedente) {
    consigne = `Propose une variante nettement différente de la proposition précédente (autres espèces dominantes ou autre composition), toujours adaptée aux mêmes réponses. Proposition précédente : ${JSON.stringify({ titre: d.precedente.titre, plantes: d.precedente.plantes })}`;
  }
  if (d.mode === "modification" && d.precedente) {
    consigne = `Reprends la proposition précédente et applique uniquement la modification demandée par le client, en gardant le reste identique.
Proposition précédente : ${JSON.stringify({ titre: d.precedente.titre, plantes: d.precedente.plantes, materiaux: d.precedente.materiaux })}
Modification demandée : « ${d.instruction ?? ""} »
Si la demande cite une plante absente de la liste, choisis la plus proche disponible et dis-le dans le résumé.`;
  }

  const [entete, donnees] = d.photo.split(",", 2);
  const mediaType = (entete.match(/data:(image\/[a-z]+);/)?.[1] ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";

  const client = new Anthropic();
  const reponse = await client.beta.messages.parse({
    model: MODELE,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
    system: SYSTEME,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: donnees } },
          {
            type: "text",
            text: `Réponses du client :\n${resumerReponses(d.type, d.reponses)}\n\nRepères de quantités : ${reperesQuantites(d.type, d.reponses)}\n\nVégétaux autorisés :\n${plantesTexte}\n\nMatériaux disponibles :\n${materiauxTexte}\n\n${consigne}`,
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

  return {
    ...resultat,
    plantes: resultat.plantes
      .filter((l) => l.quantite > 0)
      .map((l) => ({ ...l, quantite: Math.min(l.quantite, 1000) })),
    materiaux: resultat.materiaux.filter((m) => m.quantite > 0),
  };
}
