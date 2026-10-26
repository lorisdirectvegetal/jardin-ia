import type { Plante, Reponses, TypeProjet } from "./types";

export type Saison = "printemps" | "ete" | "automne" | "hiver";

export interface Taille {
  hauteur: number;
  largeur: number;
}

const HERBACEES: Plante["categorie"][] = ["vivace", "graminee", "couvre-sol"];

/** Pousse annuelle moyenne d'un ligneux, en mètres, une fois installé */
const POUSSE: Record<Plante["croissance"], number> = { lente: 0.15, moyenne: 0.3, rapide: 0.45 };

/** Hauteur du végétal tel qu'il est livré, déduite du conditionnement (« Pot 4 L, 60/80 cm »…). */
export function hauteurALivraison(p: Plante): number {
  const c = p.conditionnement.toLowerCase();
  const cm = c.match(/(\d+)\/(\d+)\s*cm/);
  if (cm) {
    const h = (Number(cm[1]) + Number(cm[2])) / 200;
    // Pour un palmier, la cote est celle du stipe : les palmes ajoutent environ un mètre.
    return Math.min(p.hauteur, p.categorie === "palmier" ? h + 1 : h);
  }
  if (/tige|tronc/.test(c)) return Math.min(p.hauteur, 2.5);
  const litres = Number(c.match(/(\d+)\s*l\b/)?.[1] ?? 0);
  const h = /godet/.test(c) ? 0.1 : litres >= 10 ? 0.8 : litres >= 4 ? 0.55 : litres >= 3 ? 0.45 : litres >= 2 ? 0.35 : 0.25;
  return Math.min(p.hauteur, h);
}

/**
 * Taille estimée après un nombre d'années en place.
 * `limite` borne la taille quand la plante est taillée (haie taillée, largeur disponible).
 */
export function tailleApres(p: Plante, annees: number, limite?: Partial<Taille>): Taille {
  const depart = hauteurALivraison(p);
  let hauteur: number;
  if (HERBACEES.includes(p.categorie)) {
    // Une vivace atteint environ 60 % de sa taille la première saison et sa taille adulte la deuxième.
    hauteur = annees <= 0 ? Math.max(depart, p.hauteur * 0.3) : annees < 2 ? p.hauteur * 0.6 : p.hauteur;
  } else {
    // La première année sert à l'enracinement : la plante pousse peu.
    hauteur = Math.min(p.hauteur, depart + POUSSE[p.croissance] * Math.max(0, annees - 0.5));
  }
  let largeur = Math.max(Math.min(p.largeur, depart * 0.6), p.largeur * (hauteur / p.hauteur));
  if (limite?.hauteur) hauteur = Math.min(hauteur, limite.hauteur);
  if (limite?.largeur) largeur = Math.min(largeur, limite.largeur);
  return { hauteur: arrondi(hauteur), largeur: arrondi(largeur) };
}

const arrondi = (n: number) => Math.round(n * 10) / 10;

const MOIS_SAISON: Record<Saison, string[]> = {
  printemps: ["mars", "avril", "mai"],
  ete: ["juin", "juillet", "août"],
  automne: ["septembre", "octobre", "novembre"],
  hiver: ["décembre", "janvier", "février"],
};
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** La plante est-elle en fleurs pendant cette saison ? */
function fleuritEn(p: Plante, saison: Saison): boolean {
  if (!p.floraison) return false;
  const trouves = MOIS.map((m, i) => ({ i, pos: p.floraison!.periode.indexOf(m) }))
    .filter((x) => x.pos >= 0)
    .sort((a, b) => a.pos - b.pos)
    .map((x) => x.i);
  if (!trouves.length) return false;
  const [debut, fin] = [trouves[0], trouves[trouves.length - 1]];
  const mois = new Set<string>();
  for (let k = 0; k <= (fin - debut + 12) % 12; k++) mois.add(MOIS[(debut + k) % 12]);
  return MOIS_SAISON[saison].some((m) => mois.has(m));
}

/** Description de l'aspect de la plante à cette saison, pour le visuel. */
export function aspectEnSaison(p: Plante, saison: Saison): string {
  const fleurs = fleuritEn(p, saison) ? `en fleurs (${p.floraison!.couleur})` : "sans fleurs";
  if (p.feuillage === "caduc") {
    if (saison === "hiver") {
      return HERBACEES.includes(p.categorie) ? "partie aérienne disparue ou sèche, rabattue" : `sans feuilles, branches nues${fleuritEn(p, saison) ? `, ${fleurs}` : ""}`;
    }
    if (saison === "automne" && p.atouts.includes("automne")) return `feuillage aux couleurs d'automne, ${fleurs}`;
  }
  return `feuillage ${p.feuillage === "persistant" ? "persistant" : "en place"}, ${fleurs}`;
}

export const LIBELLE_SAISON: Record<Saison, string> = {
  printemps: "au printemps",
  ete: "en été",
  automne: "en automne",
  hiver: "en hiver",
};

export function libelleHorizon(annees: number): string {
  return annees === 0 ? "le jour de la plantation" : annees === 1 ? "1 an après la plantation" : `${annees} ans après la plantation`;
}

/** Horizon, saison et tailles maximales imposées par les réponses du client */
export function parametresVisuel(type: TypeProjet, r: Reponses) {
  const annees = Number(r.horizon ?? 3) || 0;
  const saison = (["printemps", "ete", "automne", "hiver"].includes(String(r.saisonVisuel)) ? r.saisonVisuel : "ete") as Saison;
  const limite: Partial<Taille> = {};
  if (type === "haie" && r.composition === "taillee") {
    limite.hauteur = Number(r.hauteur) || undefined;
    if (r.largeur !== undefined && r.largeur !== "") limite.largeur = Number(r.largeur) || undefined;
  }
  return { annees, saison, limite };
}
