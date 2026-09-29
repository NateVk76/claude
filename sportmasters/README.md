# Athleticards

Jeu de cartes à collectionner de sportifs, jouable dans le navigateur. On ouvre des boosters, on collectionne des athlètes réels (des stars mondiales aux pépites méconnues), on les revend au marché des transferts et on les fait jouer en match.

Inspiré de WikiMasters (les cartes y sont des pages Wikipédia) et du mode Ultimate Team de FIFA.

Le logo (`src/components/Logo.tsx`) écrit « athleticards » en minuscules, et le point du i est une carte verte inclinée. Il est dessiné en tracés, sans police à charger. Les sachets de booster n'affichent que lui, sur la couleur du pack.

## Lancer le jeu

```bash
cd sportmasters
npm install
npm run dev          # http://localhost:5173
npm test             # tests du moteur (boosters, marché, matchs)
npm run build        # version de production dans dist/
npm run build:single # un seul fichier HTML autonome dans artifact/
```

`#galerie` à la fin de l'adresse affiche une planche de contrôle visuel : les matières de cartes et tous les drapeaux.

## Les règles du jeu

### Rareté = célébrité

Chaque athlète a un score de célébrité (0-100), estimé d'après son audience. Plus il est connu, plus sa carte est rare. Le jeu compte 1 035 athlètes : 524 dans la base manuelle et 511 ajoutés depuis Wikidata.

| Rareté | Célébrité | Athlètes | Booster gratuit |
| --- | --- | --- | --- |
| Légendaire | 90 et plus | 32 | 0,8 % par carte |
| Épique | 75 à 89 | 50 | 3,2 % |
| Rare | 60 à 74 | 153 | 10 % |
| Peu commune | 44 à 59 | 281 | 26 % |
| Commune | moins de 44 | 519 | 60 % |

À l'intérieur d'une rareté, les plus célèbres sortent encore moins souvent : Messi sort environ 5 fois moins que Duplantis.

### Plus une carte est rare, plus elle est forte

Chaque rareté a sa plage de notes, donc une carte plus rare est toujours plus forte :

| Rareté | Note |
| --- | --- |
| Légendaire | 91 à 99 |
| Épique | 85 à 90 |
| Rare | 78 à 84 |
| Peu commune | 70 à 77 |
| Commune | 58 à 69 |

Dans une même rareté, le niveau sportif réel de l'athlète et sa célébrité le placent dans la plage (Messi, Ronaldo, Jordan et Bolt à 98, Duplantis à 96). Les stats découlent de la note. La version Prime ajoute +3 : elle est bien plus rare que la version classique, donc la règle tient toujours.

### Versions spéciales

- **Icônes** : les légendes retraitées ou disparues (Pelé, Maradona, Kobe Bryant, Ali, Senna, Lomu…). Carte crème et or, années de vie pour les disparus.
- **Prime** : la meilleure saison d'une très grande légende, et seulement d'elles : 36 athlètes (Messi 2012, Cristiano Ronaldo 2014, Ronaldo Nazário 2002, LeBron 2016, Bolt 2009, Duplantis 2025…). +3 de note, +4 à toutes les stats, ulti renforcé, liseré irisé. Une de ces légendes tirée dans un booster a 8 % de chances d'être en Prime, soit environ 1 carte sur 1 200 dans le booster gratuit, dix fois plus rare qu'une Légendaire. Valeur ×6 au marché.

### La carte

Style vignette à collectionner : photo de l'athlète en grand (détourée quand c'est possible), fond métallisé selon la rareté, note et poste en haut à gauche avec le drapeau, écusson du sport en haut à droite, surnom écrit à la verticale (« MONDO », « LA PULGA », « KING JAMES »…), les deux meilleures stats en pastilles, le nom dans un bandeau et, dans le coin, la carte verte du logo. La fiche de chaque carte montre les 6 stats utilisées en match :

| Stat | Ce qu'elle mesure |
| --- | --- |
| VIT | Vitesse |
| FOR | Force |
| END | Endurance |
| TEC | Technique |
| INT | Intelligence, lecture du jeu |
| AUR | Aura : sang-froid, charisme, présence dans les grands rendez-vous |

La popularité ne s'affiche pas sur la carte : c'est elle qui fixe la rareté, et elle compte dans l'épreuve « Bain de foule ».

### Sports et particularités

16 sports, chacun avec un passif en match et ses propres ultis :

| Sport | Particularité |
| --- | --- |
| Football | Collectif : +2 par autre footballeur dans l'équipe |
| Basketball | Main chaude : +6 après une manche gagnée |
| Tennis | Duelliste : +5 en Face-à-face et Money time |
| Athlétisme | Explosivité : +6 à la 1re manche et au Sprint |
| Natation | Fluidité : insensible aux malus adverses |
| Cyclisme | Diesel : +2 par numéro de manche |
| Sports mécaniques | Aspiration : +7 quand l'équipe est menée |
| Sports de combat | Instinct du tueur : +1 énergie après une manche écrasée |
| Rugby | Rouleau compresseur : +6 en Bras de fer et Décathlon |
| Handball, volley, hiver, gym, golf, glisse, sports US | voir l'écran Matchs, section Règles |

Les grandes stars ont un **ulti signature** : « Centimètre par centimètre » pour Duplantis (son record inscrit sur la carte monte d'1 cm à chaque utilisation), « Lightning Bolt » pour Bolt, « SIUUU » pour Ronaldo, « The Block » pour LeBron, « Night Night » pour Curry, « Ippon » pour Riner…

### Boosters et boutique

- Un booster gratuit toutes les 10 minutes, jusqu'à 10 en réserve.
- Boutique : Découverte, Pro (1 Rare garantie), Élite (1 Épique garantie), Icônes, Prime (1 Prime de légende garantie, 250 000 Balles), Légende (1 Légendaire garantie) et un pack par sport. Les chances sont affichées sur chaque pack.
- Les Épiques, Légendaires et Prime ont droit à leur « walkout » : drapeau, puis sport, puis note, puis la carte avec confettis et fanfare.
- Pendant l'ouverture, chaque carte révélée s'accompagne de sa fiche express : nom, pays, sport, poste, note, ses trois meilleures stats et l'ulti (toucher une carte déjà retournée affiche la sienne).

### Mercato (marché des transferts)

- Des managers IA mettent des cartes en vente, enchérissent et achètent les tiennes.
- Achat immédiat ou enchères (remboursement automatique si quelqu'un surenchérit).
- Vente : enchère de départ, prix d'achat immédiat, durée de 5 min à 3 h. Taxe de 5 % sur chaque vente.
- La cote de chaque carte fluctue (courbe sur 24 h dans la fiche) et des actus font bouger les prix : « Semaine du tennis +15 % », « Ruée sur les cartes Marchand »…
- Le marché continue de tourner quand le jeu est fermé : les ventes se font pendant ton absence.

### Matchs

- Équipe de 5 athlètes, tous sports mélangés.
- 5 manches, chacune est une épreuve tirée au sort : Sprint, Bras de fer, Marathon, Coup de génie, Geste technique, Money time, Face-à-face, Bain de foule, Décathlon.
- À chaque manche on choisit qui envoyer sans connaître le choix adverse. Puissance = stats de l'épreuve + particularité du sport + ulti + forme du jour.
- Énergie : 2 au départ, un ulti en coûte 1, chaque manche perdue en rend 1.
- Championnat de la division 10 à la division 1 : victoire +3 points, nul +1, promotion à 7 points.

## Organisation du code

```
src/
  data/athletes.ts   base manuelle : 524 athlètes, ultis signatures, versions Prime
  data/athletes.generated.json   511 athlètes ajoutés depuis Wikidata (1 035 au total, dont 200 Icônes)
  data/sports.ts     sports, particularités, ultis de sport, épreuves
  engine/            moteur pur, sans interface : cartes, boosters, marché, matchs
  store/             état du jeu (sauvegarde locale) et état de l'interface
  components/        carte, logo, drapeaux, packs
  overlays/          ouverture de booster, fiche carte
  screens/           Boosters, Collection, Mercato, Matchs, Boutique
```

Le moteur (`src/engine`) ne dépend pas de l'interface : il prend un état, l'heure et une source de hasard, et renvoie le nouvel état. C'est ce qui permettra de le faire tourner sur un serveur pour le multijoueur.

## Photos des athlètes

Les photos viennent de Wikimedia Commons : uniquement des images sous licence libre (CC BY, CC BY-SA, domaine public…), avec l'auteur et la licence affichés dans la fiche de chaque carte. Elles sont récupérées et détourées par la GitHub Action `.github/workflows/photos.yml` :

1. `scripts/photos/telecharger-photos.mjs telecharger` cherche pour chaque athlète une photo libre : l'image principale de sa page Wikipédia en français (en vérifiant que c'est le bon sport), sinon celle de sa page en anglais, sinon son image Wikidata.
2. `scripts/photos/detourer.py` détoure les athlètes avec rembg (effet « joueur qui sort de la carte ») et efface ce qui ne tient pas à l'athlète (taches, coéquipiers à côté).
3. `scripts/photos/telecharger-photos.mjs finaliser` produit `public/photos/<id>.webp` et met à jour les crédits dans `src/data/photos.json`.

L'Action se relance à chaque modification de `scripts/photos/`, et ne traite que les athlètes sans photo ou dont la photo a été refusée (`"tout": true` dans `scripts/photos/config.json`, ou l'option « Refaire toutes les photos » au lancement manuel, refait tout). Si un athlète tombe sur la mauvaise page, ajoute le bon titre Wikipédia dans `scripts/photos/titres.json`. Si une photo ne convient pas (plusieurs personnes, athlète de dos…), ajoute son nom de fichier Commons dans `scripts/photos/refus.json` : l'Action prendra la photo suivante. Pour choisir soi-même la photo d'une star, ajoute son identifiant à `"explorer"` dans `config.json` (ou `{ "duplantis": ["Duplantis medal"] }` pour chercher des photos précises) : l'Action enregistre une planche numérotée de ses photos Commons dans `scripts/photos/explorer/`, et il suffit de mettre le nom du fichier retenu dans `scripts/photos/choix.json` (avec au besoin un recadrage : `{ "fichier": "…", "recadrage": [x, y, largeur, hauteur] }`, en fractions de l'image). Sans photo libre, la carte affiche une silhouette en buste aux couleurs du sport.

Dans la version en un seul fichier (`npm run build:single`), les photos sont regroupées par paquets de 16 (`artifact/photos/pNN.json`, avec un index `artifact/photos/index.json`) et chargées au fur et à mesure que les cartes s'affichent.

Les photos sont libres de droits d'auteur, mais l'image des personnes reste protégée : pour une sortie commerciale, il faudra des licences officielles (joueurs, clubs, ligues).

## Ajouter des athlètes depuis Wikidata

La base manuelle (`src/data/athletes.ts`) contient les stars, leurs ultis signatures et leurs versions Prime. Le reste vient de Wikidata, par la GitHub Action `.github/workflows/athletes.yml` (lancée à chaque modification de `scripts/wikidata/`, ou à la main avec une taille au choix) :

```bash
node scripts/wikidata/generer-athletes.mjs --contact "https://github.com/ton-compte/ton-depot"              # ~500 athlètes
node scripts/wikidata/generer-athletes.mjs --contact "https://github.com/ton-compte/ton-depot" --echelle 20  # ~10 000
node scripts/wikidata/generer-athletes.mjs --recaler   # sans réseau : recalcule célébrité et note
```

- **Qui** : pour chaque sport, un quota (120 footballeurs, 45 basketteurs, 40 joueurs de tennis, 40 athlètes, 30 rugbymen, 30 cyclistes…). Parmi les athlètes les plus présents dans les Wikipédias du monde, on garde ceux dont la description confirme le sport, puis les plus consultés sur Wikipédia en français.
- **Écartés** : les doublons de la base manuelle (même identifiant Wikidata ou même nom), les personnes de `scripts/wikidata/exclus.json` (entraîneurs célèbres surtout comme tels, personnalités connues hors du sport…), avec la raison.
- **Célébrité** : la popularité (vues Wikipédia en français × nombre de Wikipédias au carré, pour mêler audience en France et notoriété mondiale) est comparée à celle des athlètes de la base manuelle : à popularité égale, même célébrité, donc même rareté. Un ancien joueur devenu entraîneur ne dépasse pas « rare ». `scripts/wikidata/celebrite.json` permet de corriger un cas à la main.
- **Fiche** : pays sportif (y compris Angleterre, Écosse, pays de Galles), poste ou discipline d'après Wikidata, description comme phrase de la carte, noms d'usage dans `scripts/wikidata/noms.json` (Isco, Bernardinho…). Un décès n'est retenu (carte Icône avec les années) que si l'introduction Wikipédia le confirme. Les retraités deviennent aussi des Icônes : l'introduction le dit (« est un ancien footballeur », « qui évoluait au poste de… », « a mis un terme à sa carrière »…), ou l'athlète a 50 ans passés sans « qui évolue… » au présent.
- **Recalage hors ligne** : les mesures (vues, nombre de Wikipédias) sont gardées dans le fichier et dans `scripts/wikidata/reperes.json` ; `--recaler` refait le calcul après une retouche, sans réseau.
- `--contact` est obligatoire : Wikimedia demande un moyen de contact dans les requêtes (l'adresse du dépôt suffit).
- Le moteur a été testé avec 10 000 athlètes factices : 6 ms par booster, 0,2 s pour rattraper 24 h de marché, et les grilles s'affichent par pages de 120 cartes.

## Et ensuite

- **Multijoueur** : un vrai marché entre joueurs demande un serveur qui fait autorité sur les soldes, l'ouverture des boosters et les ventes (sinon on peut tricher). Piste simple : Supabase (PostgreSQL, comptes, temps réel), puis Node + PostgreSQL + Redis si le nombre de joueurs explose.
- **Matchs entre joueurs**, classement, saisons, événements (cartes « Équipe de la semaine »).

Les notes et stats sont une interprétation de jeu. Les noms des athlètes appartiennent à leurs titulaires ; Athleticards est un projet de fan non officiel.
