import { VEGETAUX, trouverMateriau, trouverPlante } from "@/data/vegetaux";
import type { Conception, LigneMateriau, LignePlante, Plante, Reponses, TypeProjet } from "./types";

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const SAISON_DU_MOIS = [
  "hiver", "hiver", "printemps", "printemps", "printemps", "ete",
  "ete", "ete", "automne", "automne", "automne", "hiver",
];

/** Saisons couvertes par une période de floraison du type « juin-septembre » */
function saisonsDeFloraison(periode: string): Set<string> {
  const trouves = MOIS.map((m, i) => ({ i, pos: periode.indexOf(m) }))
    .filter((x) => x.pos >= 0)
    .sort((a, b) => a.pos - b.pos)
    .map((x) => x.i);
  const saisons = new Set<string>();
  if (trouves.length === 0) return saisons;
  const debut = trouves[0];
  const fin = trouves[trouves.length - 1];
  for (let k = 0; k <= (fin - debut + 12) % 12; k++) {
    saisons.add(SAISON_DU_MOIS[(debut + k) % 12]);
  }
  return saisons;
}

const nombre = (v: unknown, defaut: number) => {
  if (v === undefined || v === null || v === "") return defaut;
  const n = Number(v);
  return Number.isFinite(n) ? n : defaut;
};
const renseigne = (v: unknown) => v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v));
const liste = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);

/** Contraintes communes à tous les projets. Renvoie null si la plante est exclue. */
function scoreCommun(p: Plante, r: Reponses): number | null {
  const climat = nombre(r.climat, -12);
  if (p.rusticite > climat) return null;
  if (r.exposition && !p.exposition.includes(r.exposition as Plante["exposition"][number])) return null;

  let score = 0;
  const sol = String(r.sol ?? "inconnu");
  if (sol !== "inconnu" && !p.sols.includes(sol as Plante["sols"][number])) {
    // Calcaire, humidité, sécheresse et acidité sont éliminatoires ; le reste se corrige à la plantation.
    if (["calcaire", "humide", "sec", "acide"].includes(sol)) return null;
    score -= 2;
  }
  if (r.arrosage === "non" && !p.sols.includes("sec")) score -= 3;
  const entretien = nombre(r.entretien, 1);
  if (p.entretien > entretien) score -= 2 * (p.entretien - entretien);
  return score;
}

function scoreHaie(p: Plante, r: Reponses): number | null {
  if (!p.usages.includes("haie")) return null;
  const hauteur = nombre(r.hauteur, 2);
  if (p.hauteur < hauteur * 0.7) return null;
  if (r.feuillage === "persistant" && p.feuillage === "caduc") return null;

  let score = 0;
  if (r.feuillage === "persistant" && p.feuillage === "semi-persistant") score -= 1;
  if (r.feuillage === "mixte" && p.feuillage !== "caduc") score += 1;
  for (const f of liste(r.fonctions)) if (p.atouts.includes(f)) score += 2;
  if (r.composition === "libre" && p.hauteur > hauteur * 2.5) score -= 2;
  if (r.composition === "taillee" && p.croissance === "rapide") score += 1;
  return score;
}

function scoreMassif(p: Plante, r: Reponses): number | null {
  if (!p.usages.includes("massif") || p.categorie === "arbre") return null;
  const hauteurMax = nombre(r.hauteurMax, 1.5);
  if (p.hauteur > hauteurMax * 1.3 && p.categorie !== "grimpante") return null;
  if (p.categorie === "grimpante" && r.forme !== "mur") return null;

  let score = 0;
  if (r.style && p.styles.includes(String(r.style))) score += 3;
  for (const c of liste(r.couleurs)) if (p.couleurs.includes(c)) score += 1.5;
  const saisons = p.floraison ? saisonsDeFloraison(p.floraison.periode) : new Set<string>();
  for (const s of liste(r.saisons)) {
    if (saisons.has(s)) score += 1;
    if (s === "hiver" && p.feuillage === "persistant") score += 1;
    if (s === "automne" && p.atouts.includes("automne")) score += 1;
  }
  if (r.paillage === "couvre-sol" && p.categorie === "couvre-sol") score += 3;
  return score;
}

function scoreIsole(p: Plante, r: Reponses): number | null {
  if (!p.usages.includes("isole")) return null;
  const categorie = String(r.categorie ?? "indifferent");
  if (categorie === "palmier" && !(p.categorie === "palmier" || p.styles.includes("exotique"))) return null;
  if (["arbre", "arbuste", "conifere"].includes(categorie) && p.categorie !== categorie) return null;
  if (p.hauteur > nombre(r.hauteurMax, 6)) return null;
  // Sans dimension saisie, l'IA vérifie l'espace disponible sur la photo.
  if (renseigne(r.espace) && p.largeur > Number(r.espace) * 1.2) return null;

  let score = 0;
  if (renseigne(r.distanceMaison) && p.categorie === "arbre" && Number(r.distanceMaison) < p.hauteur / 2) score -= 3;
  for (const i of liste(r.interets)) {
    if (i === "persistant" ? p.feuillage === "persistant" : p.atouts.includes(i)) score += 2;
  }
  return score;
}

export interface Candidat {
  plante: Plante;
  score: number;
}

/**
 * Présélectionne les végétaux compatibles avec le terrain et les envies du client.
 * L'IA choisira ensuite uniquement parmi cette liste.
 */
export function preselection(type: TypeProjet, r: Reponses): Candidat[] {
  const scoreType = { haie: scoreHaie, massif: scoreMassif, isole: scoreIsole }[type];
  const resultats: Candidat[] = [];
  for (const plante of VEGETAUX) {
    const commun = scoreCommun(plante, r);
    const specifique = scoreType(plante, r);
    if (commun === null || specifique === null) continue;
    resultats.push({ plante, score: commun + specifique });
  }
  resultats.sort((a, b) => b.score - a.score);
  const limite = { haie: 14, massif: 24, isole: 8 }[type];
  const retenus = resultats.slice(0, limite);

  // Les plantes indispensables du client sont toujours proposées, même hors critères.
  for (const plante of plantesIndispensables(r)) {
    if (!retenus.some((c) => c.plante.id === plante.id)) retenus.unshift({ plante, score: 0 });
  }

  // Pour un sujet isolé avec un petit massif au pied, on ajoute des plantes basses d'accompagnement.
  if (type === "isole" && r.pied === "massif") {
    const accompagnement = preselection("massif", { ...r, hauteurMax: "0.6" })
      .filter((c) => c.plante.hauteur <= 0.7 && !retenus.some((x) => x.plante.id === c.plante.id))
      .slice(0, 8);
    retenus.push(...accompagnement);
  }
  return retenus;
}

export function plantesIndispensables(r: Reponses): Plante[] {
  return liste(r.indispensables)
    .map((id) => VEGETAUX.find((p) => p.id === id))
    .filter((p): p is Plante => Boolean(p));
}

/** Raisons pour lesquelles une plante risque de mal se plaire dans ce jardin */
export function alertesPlante(p: Plante, r: Reponses): string[] {
  const alertes: string[] = [];
  const climat = nombre(r.climat, -12);
  if (p.rusticite > climat) alertes.push(`ne supporte que ${p.rusticite} °C alors que vos hivers peuvent descendre vers ${climat} °C`);
  if (r.exposition && !p.exposition.includes(r.exposition as Plante["exposition"][number])) {
    alertes.push(`préfère ${p.exposition.join(" ou ")} alors que l'emplacement est en ${r.exposition}`);
  }
  const sol = String(r.sol ?? "inconnu");
  if (sol !== "inconnu" && !p.sols.includes(sol as Plante["sols"][number])) alertes.push(`n'aime pas les sols ${sol}`);
  return alertes;
}

/** Repères chiffrés transmis à l'IA pour qu'elle dimensionne les quantités correctement */
export function reperesQuantites(type: TypeProjet, r: Reponses): string {
  const estimer = "Le client n'a pas donné toutes les dimensions : estime-les d'après la photo en t'appuyant sur des repères de taille connue (porte 2,0 m, fenêtre 1,2 m, clôture 1,5 à 1,8 m, parpaing 20 cm, marche 17 cm, voiture 4,5 m), indique-les dans dimensionsEstimees et calcule les quantités avec. ";
  if (type === "haie") {
    if (!renseigne(r.longueur)) return `${estimer}Nombre de plants = longueur ÷ espacement de chaque espèce, multiplié par le nombre de rangs.`;
    const longueur = nombre(r.longueur, 10);
    const rangs = nombre(r.largeur, 1) >= 1.5 && r.composition === "libre" ? 2 : 1;
    return `Haie de ${longueur} m sur ${rangs} rang(s). Nombre de plants = longueur ÷ espacement de chaque espèce, multiplié par le nombre de rangs (en quinconce si 2 rangs).`;
  }
  if (type === "massif") {
    if (!renseigne(r.longueur) || !renseigne(r.largeur)) {
      return `${estimer}Chaque plante occupe environ (espacement)² m². Structure : un tiers de la surface en arbustes, le reste en vivaces et graminées par groupes impairs.`;
    }
    const surface = nombre(r.longueur, 4) * nombre(r.largeur, 1.5);
    return `Massif de ${surface.toFixed(1)} m². Chaque plante occupe environ (espacement)² m². Structure conseillée : environ un tiers de la surface en arbustes, le reste en vivaces et graminées plantées par groupes impairs (3, 5, 7).`;
  }
  return `${renseigne(r.espace) ? "" : estimer}Un seul sujet principal (quantité 1).${r.pied === "massif" ? " Au pied, un cercle d'environ 1,5 m de diamètre (1,8 m²) de plantes basses." : ""}`;
}

/** Conception calculée sans IA : sert de secours si la clé API n'est pas configurée. */
export function conceptionAutomatique(type: TypeProjet, r: Reponses, decalage = 0): Conception {
  const indispensables = new Set(liste(r.indispensables));
  const candidats = preselection(type, r);
  const tourner = <T,>(t: T[]) => (t.length ? [...t.slice(decalage % t.length), ...t.slice(0, decalage % t.length)] : t);
  const plantes: LignePlante[] = [];
  const materiaux: LigneMateriau[] = [];

  if (type === "haie") {
    const longueur = nombre(r.longueur, 10);
    const rangs = nombre(r.largeur, 1) >= 1.5 && r.composition === "libre" ? 2 : 1;
    const especes = [
      ...candidats.filter((c) => indispensables.has(c.plante.id)),
      ...tourner(candidats.filter((c) => !indispensables.has(c.plante.id))),
    ].slice(0, Math.max(indispensables.size, r.composition === "taillee" ? 1 : 4));
    for (const { plante } of especes) {
      const quantite = Math.max(1, Math.ceil((longueur * rangs) / plante.espacement / especes.length));
      plantes.push({ planteId: plante.id, quantite, emplacement: "En alternance sur toute la longueur", role: "Haie" });
    }
    materiaux.push({ materiauId: "paillage-ecorce", quantite: Math.ceil(longueur * nombre(r.largeur, 1)) });
  } else if (type === "massif") {
    const surface = nombre(r.longueur, 4) * nombre(r.largeur, 1.5);
    const tous = [
      ...candidats.filter((c) => indispensables.has(c.plante.id)),
      ...tourner(candidats.filter((c) => !indispensables.has(c.plante.id))),
    ];
    const arbustes = tous.filter((c) => c.plante.categorie === "arbuste").slice(0, 2);
    const basses = tous.filter((c) => c.plante.categorie !== "arbuste").slice(0, 4);
    const ajouter = (groupe: Candidat[], part: number, role: string) => {
      for (const { plante } of groupe) {
        const brut = (surface * part) / groupe.length / plante.espacement ** 2;
        const quantite = role === "Structure" ? Math.max(1, Math.round(brut)) : Math.max(3, Math.round(brut / 2) * 2 + 1);
        plantes.push({ planteId: plante.id, quantite, emplacement: role === "Structure" ? "Arrière-plan" : "Premier plan, par groupes", role });
      }
    };
    ajouter(arbustes, 0.35, "Structure");
    ajouter(basses, arbustes.length ? 0.65 : 1, "Remplissage");
    const paillage = { ecorce: "paillage-ecorce", mineral: "paillage-mineral", ardoise: "paillage-ardoise" }[String(r.paillage)];
    if (paillage) materiaux.push({ materiauId: paillage, quantite: Math.ceil(surface) });
    materiaux.push({ materiauId: "terreau-plantation", quantite: Math.max(1, Math.ceil(plantes.length / 2)) });
  } else {
    const principal =
      candidats.find((c) => indispensables.has(c.plante.id) && c.plante.usages.includes("isole")) ??
      tourner(candidats.filter((c) => c.plante.hauteur > 1.5))[0] ??
      candidats[0];
    if (principal) {
      plantes.push({ planteId: principal.plante.id, quantite: 1, emplacement: "Au centre de l'emplacement", role: "Sujet principal" });
      if (["arbre", "conifere", "palmier"].includes(principal.plante.categorie)) {
        materiaux.push({ materiauId: "tuteur-arbre", quantite: 1 });
      }
    }
    if (r.pied === "massif") {
      for (const { plante } of candidats.filter((c) => c.plante.hauteur <= 0.7).slice(0, 2)) {
        plantes.push({ planteId: plante.id, quantite: 5, emplacement: "Au pied, en couronne", role: "Accompagnement" });
      }
    }
    if (r.pied === "mineral") materiaux.push({ materiauId: "paillage-mineral", quantite: 2 });
    materiaux.push({ materiauId: "terreau-plantation", quantite: 2 });
  }

  ajouterIndispensablesManquants(plantes, r);
  const noms = plantes.map((l) => trouverPlante(l.planteId)?.nom).filter(Boolean);
  return {
    titre: type === "haie" ? "Haie sur mesure" : type === "massif" ? "Massif sur mesure" : "Sujet isolé",
    resume: `Proposition établie à partir de vos réponses : ${noms.join(", ")}.`,
    analysePhoto: "Analyse de la photo indisponible : la clé API de l'IA n'est pas configurée.",
    plantes,
    materiaux,
    conseils: [
      "Plantez de préférence entre octobre et mars, hors période de gel.",
      "Arrosez copieusement à la plantation puis chaque semaine sans pluie la première année.",
    ],
    promptImage: "",
  };
}

/** Garantit que chaque plante indispensable figure dans le projet (au moins un exemplaire). */
export function ajouterIndispensablesManquants(plantes: LignePlante[], r: Reponses) {
  for (const p of plantesIndispensables(r)) {
    if (!plantes.some((l) => l.planteId === p.id)) {
      plantes.push({ planteId: p.id, quantite: 1, emplacement: "À placer selon vos souhaits", role: "Plante indispensable" });
    }
  }
}

export interface LigneBudget {
  libelle: string;
  quantite: number;
  unite: string;
  min: number;
  max: number;
}

export function calculerBudget(c: Conception) {
  const lignes: LigneBudget[] = [];
  for (const l of c.plantes) {
    const p = trouverPlante(l.planteId);
    if (!p) continue;
    lignes.push({ libelle: p.nom, quantite: l.quantite, unite: p.conditionnement, min: p.prixMin * l.quantite, max: p.prixMax * l.quantite });
  }
  const vegetaux = { min: sum(lignes, "min"), max: sum(lignes, "max") };
  const lignesMateriaux: LigneBudget[] = [];
  for (const l of c.materiaux) {
    const m = trouverMateriau(l.materiauId);
    if (!m) continue;
    lignesMateriaux.push({ libelle: m.nom, quantite: l.quantite, unite: m.unite, min: m.prixMin * l.quantite, max: m.prixMax * l.quantite });
  }
  const materiaux = { min: sum(lignesMateriaux, "min"), max: sum(lignesMateriaux, "max") };
  return {
    lignes,
    lignesMateriaux,
    vegetaux,
    materiaux,
    total: { min: vegetaux.min + materiaux.min, max: vegetaux.max + materiaux.max },
  };
}

const sum = (t: LigneBudget[], k: "min" | "max") => t.reduce((s, l) => s + l[k], 0);

