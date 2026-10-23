export type TypeProjet = "haie" | "massif" | "isole";

export type Exposition = "soleil" | "mi-ombre" | "ombre";
export type Sol = "argileux" | "normal" | "sec" | "calcaire" | "humide" | "acide";
export type Categorie =
  | "arbre"
  | "arbuste"
  | "vivace"
  | "graminee"
  | "couvre-sol"
  | "grimpante"
  | "conifere"
  | "palmier";

export interface Plante {
  id: string;
  nom: string;
  latin: string;
  categorie: Categorie;
  usages: TypeProjet[];
  exposition: Exposition[];
  /** Hauteur adulte maximale, en mètres */
  hauteur: number;
  /** Largeur adulte maximale, en mètres */
  largeur: number;
  /** Température minimale supportée, en °C */
  rusticite: number;
  sols: Sol[];
  /** 1 = très facile, 2 = modéré, 3 = exigeant */
  entretien: 1 | 2 | 3;
  feuillage: "persistant" | "caduc" | "semi-persistant";
  floraison?: { periode: string; couleur: string };
  /** Couleurs dominantes (fleurs ou feuillage) */
  couleurs: string[];
  atouts: string[];
  styles: string[];
  croissance: "lente" | "moyenne" | "rapide";
  /** Distance de plantation conseillée entre deux sujets, en mètres */
  espacement: number;
  conditionnement: string;
  /** Prix unitaire indicatif TTC, en euros */
  prixMin: number;
  prixMax: number;
  description: string;
}

export interface Materiau {
  id: string;
  nom: string;
  unite: "m²" | "unité" | "sac";
  prixMin: number;
  prixMax: number;
}

export type ValeurReponse = string | number | string[];
export type Reponses = Record<string, ValeurReponse>;

export interface LignePlante {
  planteId: string;
  quantite: number;
  emplacement: string;
  role: string;
}

export interface LigneMateriau {
  materiauId: string;
  quantite: number;
}

export interface Conception {
  titre: string;
  resume: string;
  analysePhoto: string;
  plantes: LignePlante[];
  materiaux: LigneMateriau[];
  conseils: string[];
  /** Consigne en anglais envoyée au modèle d'image */
  promptImage: string;
}

export interface Version {
  id: string;
  creeLe: string;
  /** Ce qui a produit cette version : première génération, variante ou modification demandée */
  origine: "initiale" | "variante" | "modification";
  instruction?: string;
  conception: Conception;
  /** Image générée (data URL), ou absente si la génération d'image n'est pas configurée */
  image?: string;
  avertissement?: string;
}

export interface Projet {
  id: string;
  creeLe: string;
  type: TypeProjet;
  photo: string;
  reponses: Reponses;
  versions: Version[];
  versionActive: number;
}
