import type { Reponses, TypeProjet } from "./types";

export interface Option {
  value: string;
  label: string;
  aide?: string;
}

export interface Question {
  id: string;
  label: string;
  aide?: string;
  type: "choix" | "multi" | "nombre";
  options?: Option[];
  unite?: string;
  min?: number;
  max?: number;
  defaut?: string | number | string[];
  /** Le client peut laisser la réponse vide : l'IA l'estime alors d'après la photo */
  facultatif?: boolean;
}

export interface Etape {
  titre: string;
  questions: Question[];
}

export interface DefinitionProjet {
  type: TypeProjet;
  titre: string;
  accroche: string;
  conseilPhoto: string;
  etapes: Etape[];
}

const climat: Question = {
  id: "climat",
  label: "Dans quel climat se trouve le jardin ?",
  aide: "Sert à ne proposer que des végétaux qui supportent vos hivers.",
  type: "choix",
  options: [
    { value: "-5", label: "Méditerranéen", aide: "Hivers doux, étés secs" },
    { value: "-7", label: "Littoral atlantique ou Manche", aide: "Doux et humide" },
    { value: "-12", label: "Océanique intérieur", aide: "Ouest, centre, Île-de-France" },
    { value: "-15", label: "Continental", aide: "Est, Bourgogne, vallée du Rhône nord" },
    { value: "-20", label: "Montagne", aide: "Au-dessus de 600 m environ" },
  ],
  defaut: "-12",
};

const exposition: Question = {
  id: "exposition",
  label: "Combien d'heures de soleil direct reçoit l'emplacement ?",
  type: "choix",
  options: [
    { value: "soleil", label: "Plus de 6 h", aide: "Plein soleil" },
    { value: "mi-ombre", label: "Entre 3 et 6 h", aide: "Mi-ombre" },
    { value: "ombre", label: "Moins de 3 h", aide: "Ombre" },
  ],
  defaut: "soleil",
};

const sol: Question = {
  id: "sol",
  label: "À quoi ressemble votre terre ?",
  type: "choix",
  options: [
    { value: "normal", label: "Terre de jardin classique", aide: "Souple, se travaille bien" },
    { value: "argileux", label: "Lourde et collante", aide: "Argileuse, fend l'été" },
    { value: "sec", label: "Sableuse ou caillouteuse", aide: "Sèche vite" },
    { value: "calcaire", label: "Calcaire", aide: "Blanchâtre, fait mousser le vinaigre" },
    { value: "humide", label: "Souvent humide", aide: "Eau qui stagne en hiver" },
    { value: "acide", label: "Acide", aide: "Bruyères, rhododendrons poussent bien" },
    { value: "inconnu", label: "Je ne sais pas" },
  ],
  defaut: "normal",
};

const entretien: Question = {
  id: "entretien",
  label: "Combien de temps voulez-vous consacrer à l'entretien ?",
  type: "choix",
  options: [
    { value: "1", label: "Le minimum", aide: "Une taille par an au plus" },
    { value: "2", label: "Un peu", aide: "Quelques interventions par saison" },
    { value: "3", label: "J'aime jardiner", aide: "Entretien régulier sans problème" },
  ],
  defaut: "1",
};

const arrosage: Question = {
  id: "arrosage",
  label: "Pourrez-vous arroser régulièrement la première année ?",
  type: "choix",
  options: [
    { value: "oui", label: "Oui, ou arrosage automatique" },
    { value: "non", label: "Non, il faut des plantes résistantes à la sécheresse" },
  ],
  defaut: "oui",
};

const budget: Question = {
  id: "budget",
  label: "Quel budget prévoyez-vous pour les végétaux ?",
  type: "choix",
  options: [
    { value: "300", label: "Moins de 300 €" },
    { value: "800", label: "300 à 800 €" },
    { value: "2000", label: "800 à 2 000 €" },
    { value: "5000", label: "Plus de 2 000 €" },
  ],
  defaut: "800",
};

const visuel: Etape = {
  titre: "Le visuel",
  questions: [
    {
      id: "horizon",
      label: "À quel moment voulez-vous voir le jardin ?",
      aide: "Les plantes sont dessinées à la taille qu'elles auront réellement à ce moment-là.",
      type: "choix",
      options: [
        { value: "0", label: "Le jour de la plantation", aide: "Jeunes plants tels que livrés" },
        { value: "3", label: "Dans 3 ans", aide: "Plantation bien installée" },
        { value: "10", label: "À maturité", aide: "Environ 10 ans" },
      ],
      defaut: "3",
    },
    {
      id: "saisonVisuel",
      label: "En quelle saison ?",
      aide: "Floraisons et feuillages caducs changent beaucoup d'une saison à l'autre.",
      type: "choix",
      options: [
        { value: "printemps", label: "Printemps" },
        { value: "ete", label: "Été" },
        { value: "automne", label: "Automne" },
        { value: "hiver", label: "Hiver" },
      ],
      defaut: "ete",
    },
  ],
};

const conditions: Etape = {
  titre: "Conditions du jardin",
  questions: [climat, exposition, sol],
};

const contraintes: Etape = {
  titre: "Entretien et budget",
  questions: [entretien, arrosage, budget],
};

export const DEFINITIONS: Record<TypeProjet, DefinitionProjet> = {
  haie: {
    type: "haie",
    titre: "Créer une haie",
    accroche: "Brise-vue, brise-vent, fleurie ou champêtre",
    conseilPhoto:
      "Placez-vous face à l'endroit où passera la haie, en prenant toute sa longueur dans le cadre.",
    etapes: [
      {
        titre: "Dimensions",
        questions: [
          {
            id: "longueur",
            label: "Quelle longueur doit faire la haie ?",
            type: "nombre",
            unite: "m",
            min: 1,
            max: 200,
            facultatif: true,
          },
          {
            id: "largeur",
            label: "Quelle largeur pouvez-vous lui laisser ?",
            aide: "Une haie libre a besoin d'au moins 1,5 m ; une haie taillée peut tenir dans 60 cm.",
            type: "nombre",
            unite: "m",
            min: 0.4,
            max: 6,
            facultatif: true,
          },
          {
            id: "hauteur",
            label: "Quelle hauteur souhaitez-vous à terme ?",
            type: "choix",
            options: [
              { value: "1", label: "Basse, moins de 1 m" },
              { value: "2", label: "Moyenne, 1 à 2 m" },
              { value: "3", label: "Haute, 2 à 3 m" },
              { value: "5", label: "Très haute, plus de 3 m" },
            ],
            defaut: "2",
          },
        ],
      },
      {
        titre: "Votre haie idéale",
        questions: [
          {
            id: "fonctions",
            label: "À quoi doit servir la haie ?",
            aide: "Plusieurs choix possibles.",
            type: "multi",
            options: [
              { value: "brise-vue", label: "Cacher le vis-à-vis" },
              { value: "brise-vent", label: "Couper le vent" },
              { value: "fleurie", label: "Être fleurie" },
              { value: "mellifere", label: "Accueillir oiseaux et insectes" },
              { value: "fruits", label: "Donner des petits fruits" },
              { value: "defensive", label: "Être défensive (épineuse)" },
            ],
            defaut: ["brise-vue"],
          },
          {
            id: "feuillage",
            label: "Le feuillage doit-il rester l'hiver ?",
            type: "choix",
            options: [
              { value: "persistant", label: "Oui, persistant toute l'année" },
              { value: "mixte", label: "En majorité, avec quelques caducs" },
              { value: "indifferent", label: "Peu importe" },
            ],
            defaut: "persistant",
          },
          {
            id: "composition",
            label: "Quel style de haie ?",
            type: "choix",
            options: [
              { value: "taillee", label: "Taillée et uniforme", aide: "Une seule espèce, aspect net" },
              { value: "libre", label: "Libre et variée", aide: "Plusieurs espèces, aspect naturel" },
            ],
            defaut: "libre",
          },
        ],
      },
      conditions,
      contraintes,
      visuel,
    ],
  },

  massif: {
    type: "massif",
    titre: "Aménager un massif",
    accroche: "Plate-bande, îlot, bordure ou talus",
    conseilPhoto:
      "Cadrez tout l'emplacement du massif, avec un peu de contexte autour (mur, pelouse, terrasse).",
    etapes: [
      {
        titre: "Dimensions",
        questions: [
          {
            id: "longueur",
            label: "Quelle est la longueur du massif ?",
            type: "nombre",
            unite: "m",
            min: 0.5,
            max: 100,
            facultatif: true,
          },
          {
            id: "largeur",
            label: "Et sa profondeur ?",
            type: "nombre",
            unite: "m",
            min: 0.3,
            max: 30,
            facultatif: true,
          },
          {
            id: "forme",
            label: "Où se trouve le massif ?",
            type: "choix",
            options: [
              { value: "mur", label: "Le long d'un mur ou d'une clôture", aide: "Vu d'un seul côté" },
              { value: "ilot", label: "En îlot dans la pelouse", aide: "Vu de tous les côtés" },
              { value: "bordure", label: "En bordure d'allée ou de terrasse" },
              { value: "talus", label: "Sur un talus ou une pente" },
            ],
            defaut: "mur",
          },
          {
            id: "hauteurMax",
            label: "Hauteur maximale des plus grandes plantes ?",
            type: "choix",
            options: [
              { value: "0.6", label: "Basse, moins de 60 cm" },
              { value: "1.5", label: "Moyenne, jusqu'à 1,5 m" },
              { value: "3", label: "Haute, jusqu'à 3 m" },
            ],
            defaut: "1.5",
          },
        ],
      },
      {
        titre: "Style et couleurs",
        questions: [
          {
            id: "style",
            label: "Quelle ambiance vous plaît ?",
            type: "choix",
            options: [
              { value: "champetre", label: "Champêtre et naturel" },
              { value: "contemporain", label: "Contemporain et graphique" },
              { value: "mediterraneen", label: "Méditerranéen, jardin sec" },
              { value: "japonais", label: "Japonais, zen" },
              { value: "anglais", label: "Anglais, romantique et fleuri" },
              { value: "exotique", label: "Exotique" },
            ],
            defaut: "champetre",
          },
          {
            id: "couleurs",
            label: "Quelles couleurs aimeriez-vous voir ?",
            type: "multi",
            options: [
              { value: "blanc", label: "Blanc" },
              { value: "rose", label: "Rose" },
              { value: "bleu", label: "Bleu et violet" },
              { value: "jaune", label: "Jaune et orange" },
              { value: "rouge", label: "Rouge" },
              { value: "feuillage", label: "Feuillages colorés" },
            ],
            defaut: ["blanc", "bleu"],
          },
          {
            id: "saisons",
            label: "Quand voulez-vous que le massif soit beau ?",
            type: "multi",
            options: [
              { value: "printemps", label: "Printemps" },
              { value: "ete", label: "Été" },
              { value: "automne", label: "Automne" },
              { value: "hiver", label: "Hiver" },
            ],
            defaut: ["printemps", "ete"],
          },
          {
            id: "paillage",
            label: "Comment couvrir le sol entre les plantes ?",
            type: "choix",
            options: [
              { value: "ecorce", label: "Paillage d'écorce" },
              { value: "mineral", label: "Gravier ou pouzzolane" },
              { value: "ardoise", label: "Paillettes d'ardoise" },
              { value: "couvre-sol", label: "Plantes couvre-sol" },
            ],
            defaut: "ecorce",
          },
        ],
      },
      conditions,
      contraintes,
      visuel,
    ],
  },

  isole: {
    type: "isole",
    titre: "Planter un sujet isolé",
    accroche: "Un arbre ou une plante remarquable",
    conseilPhoto:
      "Prenez la photo depuis l'endroit d'où vous regarderez le plus souvent la plante (terrasse, fenêtre).",
    etapes: [
      {
        titre: "L'emplacement",
        questions: [
          {
            id: "categorie",
            label: "Que souhaitez-vous planter ?",
            type: "choix",
            options: [
              { value: "arbre", label: "Un arbre" },
              { value: "arbuste", label: "Un grand arbuste décoratif" },
              { value: "palmier", label: "Un palmier ou une plante exotique" },
              { value: "conifere", label: "Un conifère" },
              { value: "indifferent", label: "Je ne sais pas, conseillez-moi" },
            ],
            defaut: "indifferent",
          },
          {
            id: "espace",
            label: "Quel diamètre d'espace libre autour de l'emplacement ?",
            aide: "La plante adulte ne doit pas dépasser cet espace.",
            type: "nombre",
            unite: "m",
            min: 1,
            max: 30,
            facultatif: true,
          },
          {
            id: "hauteurMax",
            label: "Hauteur maximale acceptable à l'âge adulte ?",
            type: "choix",
            options: [
              { value: "3", label: "Moins de 3 m" },
              { value: "6", label: "3 à 6 m" },
              { value: "10", label: "6 à 10 m" },
              { value: "30", label: "Pas de limite" },
            ],
            defaut: "6",
          },
          {
            id: "distanceMaison",
            label: "À quelle distance de la maison sera la plante ?",
            aide: "Pour éviter les problèmes de racines et d'ombre portée.",
            type: "nombre",
            unite: "m",
            min: 0.5,
            max: 100,
            facultatif: true,
          },
        ],
      },
      {
        titre: "Ce que vous attendez",
        questions: [
          {
            id: "interets",
            label: "Qu'est-ce qui compte le plus pour vous ?",
            type: "multi",
            options: [
              { value: "fleurie", label: "Une belle floraison" },
              { value: "automne", label: "Des couleurs d'automne" },
              { value: "persistant", label: "Un feuillage persistant" },
              { value: "fruits", label: "Des fruits" },
              { value: "ombrage", label: "De l'ombre en été" },
              { value: "port", label: "Une silhouette remarquable" },
            ],
            defaut: ["fleurie"],
          },
          {
            id: "pied",
            label: "Que mettre au pied de la plante ?",
            type: "choix",
            options: [
              { value: "gazon", label: "Rien, la pelouse" },
              { value: "massif", label: "Un petit massif de vivaces" },
              { value: "mineral", label: "Un cercle minéral (gravier)" },
            ],
            defaut: "massif",
          },
        ],
      },
      conditions,
      contraintes,
      visuel,
    ],
  },
};

export function reponsesParDefaut(type: TypeProjet): Reponses {
  const r: Reponses = {};
  for (const etape of DEFINITIONS[type].etapes) {
    for (const q of etape.questions) {
      if (q.defaut !== undefined) r[q.id] = q.defaut;
    }
  }
  return r;
}

/** Résumé lisible des réponses, utilisé dans le prompt et le récapitulatif de devis */
export function resumerReponses(type: TypeProjet, r: Reponses): string {
  const lignes: string[] = [`Type de projet : ${DEFINITIONS[type].titre}`];
  for (const etape of DEFINITIONS[type].etapes) {
    for (const q of etape.questions) {
      const v = r[q.id];
      if (v === undefined && q.facultatif) {
        lignes.push(`- ${q.label} non renseigné, à estimer d'après la photo`);
        continue;
      }
      if (v === undefined || (Array.isArray(v) && v.length === 0)) continue;
      let texte: string;
      if (q.type === "nombre") texte = v === "" ? "non renseigné, à estimer d'après la photo" : `${v} ${q.unite ?? ""}`.trim();
      else {
        const valeurs = Array.isArray(v) ? v : [String(v)];
        texte = valeurs
          .map((x) => q.options?.find((o) => o.value === x)?.label ?? x)
          .join(", ");
      }
      lignes.push(`- ${q.label} ${texte}`);
    }
  }
  return lignes.join("\n");
}
