# Mon jardin en photo

Application web (pensée pour le téléphone) qui transforme la photo d'un espace vide en projet paysager :
photo → questionnaire adapté → visuel généré → variantes et retouches → liste détaillée des végétaux avec prix → demande de devis.

## Parcours

1. **Choix du projet** : haie, massif ou sujet isolé.
2. **Photo** prise sur place ou importée, réduite à 1600 px avant l'envoi.
3. **Questionnaire** propre à chaque type de projet (dimensions, fonctions de la haie, style et couleurs du massif, espace disponible pour un arbre…), puis conditions du jardin (climat, exposition, sol), contraintes (entretien, arrosage, budget) et moment du visuel (jour de la plantation, dans 3 ans ou à maturité ; saison).
   - Les **dimensions sont facultatives** : laissées vides, l'IA les estime d'après la photo grâce aux repères de taille connue (porte, clôture, fenêtre…) et les affiche.
   - Le client peut désigner des **plantes indispensables**, toujours intégrées au projet, avec une alerte si elles risquent de mal se plaire.
4. **Génération** :
   - le catalogue de végétaux est d'abord filtré par règles (rusticité, exposition, sol, hauteur, usage) ;
   - Claude analyse la photo et compose le projet en choisissant **uniquement** dans cette présélection, avec quantités et emplacements ;
   - chaque plante est dessinée à sa taille réelle au moment choisi (taille à la livraison d'après le conditionnement, puis vitesse de croissance), avec son aspect de saison (floraison, feuillage caduc) ;
   - FLUX Kontext Max (via Replicate) retouche la photo d'origine pour y ajouter les plantations, en gardant la maison, le cadrage et la lumière ;
   - Claude compare ensuite le visuel à la photo et au projet (échelle, nombre de plantes, saison, bâti inchangé) et relance une génération corrigée en cas d'écart.
5. **Résultat** : comparaison avant/après, nouvelle variante ou modification libre (« plus fleurie », « remplace les lauriers… »), fiches des végétaux (exposition, hauteur, largeur, rusticité, sol, floraison, entretien), budget détaillé.
6. **Demander un devis** : ouvre le lien défini dans `NEXT_PUBLIC_URL_DEVIS` en y ajoutant le récapitulatif du projet (paramètre `message`). Le récapitulatif peut aussi être copié.

Les projets sont enregistrés sur l'appareil de l'utilisateur (IndexedDB), sans compte.

## Lancer en local

```bash
npm install
cp .env.example .env.local   # puis renseigner les clés
npm run dev
```

Ouvrir http://localhost:3000.

Sans clé, l'application fonctionne en **mode démonstration** : la sélection des végétaux et les quantités sont calculées par règles, et aucun visuel n'est généré.

| Variable | Rôle |
| --- | --- |
| `ANTHROPIC_API_KEY` | Analyse de la photo et conception du projet (Claude Opus 5.5) |
| `REPLICATE_API_TOKEN` | Génération du visuel (FLUX Kontext Max) |
| `NEXT_PUBLIC_URL_DEVIS` | Lien du bouton « Demander un devis » (par défaut la fiche contact Direct Végétal) |

## Modifier le catalogue

Tout est dans `src/data/vegetaux.ts` : une fiche par végétal (dimensions, exposition, rusticité, sols, usages, prix min/max, conditionnement). Les prix actuels sont **indicatifs** ; ils seront reliés plus tard au site marchand. Une plante ajoutée au catalogue devient immédiatement proposable par l'IA.

## Organisation du code

- `src/lib/questionnaires.ts` : questions de chaque type de projet
- `src/lib/selection.ts` : présélection par règles, plantes indispensables, quantités de secours, calcul du budget
- `src/lib/croissance.ts` : taille des plantes selon les années et aspect selon la saison
- `src/lib/conception.ts` : appel à Claude (sortie structurée, plantes limitées au catalogue) et contrôle du visuel
- `src/lib/rendu.ts` : appel à FLUX Kontext sur Replicate
- `src/app/api/generer/route.ts` : point d'entrée de la génération
- `src/app/nouveau/[type]` : photo et questionnaire
- `src/app/projet/[id]` : résultat, variantes, modifications, devis

## Mise en ligne

Le plus simple est Vercel : importer le dépôt GitHub, renseigner les trois variables, déployer. La génération peut durer une à deux minutes ; la route est configurée avec `maxDuration = 300`, ce qui demande une offre Vercel qui l'autorise.
