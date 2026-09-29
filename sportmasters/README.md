# SportMasters

Jeu de cartes à collectionner de sportifs, jouable dans le navigateur. On ouvre des boosters, on collectionne des athlètes réels (des stars mondiales aux pépites méconnues), on les revend au marché des transferts et on les fait jouer en match.

Inspiré de WikiMasters (les cartes y sont des pages Wikipédia) et du mode Ultimate Team de FIFA.

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

Chaque athlète a un score de célébrité (0-100), estimé d'après son audience. Plus il est connu, plus sa carte est rare.

| Rareté | Célébrité | Athlètes | Booster gratuit |
| --- | --- | --- | --- |
| Légendaire | 90 et plus | 31 | 0,8 % par carte |
| Épique | 75 à 89 | 42 | 3,2 % |
| Rare | 60 à 74 | 92 | 10 % |
| Peu commune | 44 à 59 | 140 | 26 % |
| Commune | moins de 44 | 218 | 60 % |

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

Style vignette à collectionner : photo de l'athlète en grand (détourée quand c'est possible), fond métallisé selon la rareté, note et poste en haut à gauche avec le drapeau, écusson du sport en haut à droite, surnom écrit à la verticale (« MONDO », « LA PULGA », « KING JAMES »…), les deux meilleures stats en pastilles et le nom dans un bandeau. La fiche de chaque carte montre les 6 stats utilisées en match :

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
  data/athletes.ts   base des athlètes (523 dont 143 Icônes)
  data/sports.ts     sports, particularités, ultis de sport, épreuves
  engine/            moteur pur, sans interface : cartes, boosters, marché, matchs
  store/             état du jeu (sauvegarde locale) et état de l'interface
  components/        carte, pictogrammes, drapeaux, packs
  overlays/          ouverture de booster, fiche carte
  screens/           Boosters, Collection, Mercato, Matchs, Boutique
```

Le moteur (`src/engine`) ne dépend pas de l'interface : il prend un état, l'heure et une source de hasard, et renvoie le nouvel état. C'est ce qui permettra de le faire tourner sur un serveur pour le multijoueur.

## Photos des athlètes

Les photos viennent de Wikimedia Commons : uniquement des images sous licence libre (CC BY, CC BY-SA, domaine public…), avec l'auteur et la licence affichés dans la fiche de chaque carte. Elles sont récupérées et détourées par la GitHub Action `.github/workflows/photos.yml` :

1. `scripts/photos/telecharger-photos.mjs telecharger` cherche pour chaque athlète une photo libre : l'image principale de sa page Wikipédia en français (en vérifiant que c'est le bon sport), sinon celle de sa page en anglais, sinon son image Wikidata.
2. `scripts/photos/detourer.py` détoure les athlètes avec rembg (effet « joueur qui sort de la carte ») et efface ce qui ne tient pas à l'athlète (taches, coéquipiers à côté).
3. `scripts/photos/telecharger-photos.mjs finaliser` produit `public/photos/<id>.webp` et met à jour les crédits dans `src/data/photos.json`.

L'Action se relance à chaque modification de `scripts/photos/`, et ne traite que les athlètes sans photo ou dont la photo a été refusée (`"tout": true` dans `scripts/photos/config.json`, ou l'option « Refaire toutes les photos » au lancement manuel, refait tout). Si un athlète tombe sur la mauvaise page, ajoute le bon titre Wikipédia dans `scripts/photos/titres.json`. Si une photo ne convient pas (plusieurs personnes, athlète de dos…), ajoute son nom de fichier Commons dans `scripts/photos/refus.json` : l'Action prendra la photo suivante. Pour choisir soi-même la photo d'une star, ajoute son identifiant à `"explorer"` dans `config.json` (ou `{ "duplantis": ["Duplantis medal"] }` pour chercher des photos précises) : l'Action enregistre une planche numérotée de ses photos Commons dans `scripts/photos/explorer/`, et il suffit de mettre le nom du fichier retenu dans `scripts/photos/choix.json`. Sans photo libre, la carte affiche une silhouette en buste aux couleurs du sport.

Dans la version en un seul fichier (`npm run build:single`), les photos sont regroupées par paquets de 16 (`artifact/photos/pNN.json`, avec un index `artifact/photos/index.json`) et chargées au fur et à mesure que les cartes s'affichent.

Les photos sont libres de droits d'auteur, mais l'image des personnes reste protégée : pour une sortie commerciale, il faudra des licences officielles (joueurs, clubs, ligues).

## Passer à 10 000 athlètes

La base manuelle (`src/data/athletes.ts`) contient les stars, leurs ultis signatures et leurs versions Prime. Pour le reste, un script va chercher des milliers d'athlètes dans Wikidata et calcule leur célébrité d'après les vues de leur page Wikipédia en français sur 12 mois, comme WikiMasters :

```bash
node scripts/wikidata/generer-athletes.mjs --contact "ton.adresse@exemple.fr" --par-sport 50   # essai
node scripts/wikidata/generer-athletes.mjs --contact "ton.adresse@exemple.fr" --par-sport 700  # ~10 000 athlètes
```

- Le résultat va dans `src/data/athletes.generated.json`, fusionné automatiquement avec la base manuelle (qui garde la priorité).
- La rareté est calculée par percentile : les 0,3 % les plus vus sont Légendaires, les 1,2 % suivants Épiques, puis 6 % Rares, 17,5 % Peu communes, le reste Commune. Sur 10 000 athlètes, ça fait une trentaine de légendaires.
- Le poste et le profil de stats sont devinés depuis la description Wikidata (« spécialiste du saut à la perche » → perchiste).
- `--contact` est obligatoire : Wikimedia demande un moyen de contact dans les requêtes.
- Le script n'a pas pu être lancé là où il a été écrit (pas d'accès réseau à Wikidata) : fais d'abord un essai avec `--par-sport 50` et regarde le fichier produit.
- Le moteur a été testé avec 10 000 athlètes factices : 6 ms par booster, 0,2 s pour rattraper 24 h de marché, et les grilles s'affichent par pages de 120 cartes.

## Et ensuite

- **Multijoueur** : un vrai marché entre joueurs demande un serveur qui fait autorité sur les soldes, l'ouverture des boosters et les ventes (sinon on peut tricher). Piste simple : Supabase (PostgreSQL, comptes, temps réel), puis Node + PostgreSQL + Redis si le nombre de joueurs explose.
- **Matchs entre joueurs**, classement, saisons, événements (cartes « Équipe de la semaine »).

Les notes et stats sont une interprétation de jeu. Les noms des athlètes appartiennent à leurs titulaires ; SportMasters est un projet de fan non officiel.
