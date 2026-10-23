# Guide MJ : mettre la fiche Coïa en ligne avec GitHub Pages

Résultat : un lien unique à donner à tous tes joueurs. Ils l'ouvrent sur PC ou téléphone, sans compte, et leur fiche s'enregistre dans leur navigateur. C'est gratuit.

## Avant de commencer
- Décompresse `coia-fiche-personnage-v8.zip`. Tu dois voir 5 fichiers : `index.html`, `style.css`, `data.js`, `script.js`, `aide.html`.
- Ne dépose pas le zip : dépose les 5 fichiers eux-mêmes.
- GitHub est en anglais. Les noms des boutons sont donnés tels qu'ils s'affichent.

## Le lien Drive de l'aide de jeu (facultatif, à faire avant la mise en ligne)
L'encart « À faire à chaque séance » de `aide.html` renvoie vers ton dossier Drive partagé, où chaque joueur dépose ses exports.
1. Dans Drive, crée un dossier par joueur et partage-le avec lui (accès **Éditeur**), ou un dossier commun si tu préfères.
2. Copie le lien de partage.
3. Ouvre `aide.html` avec un éditeur de texte (le Bloc-notes suffit), trouve la ligne `const LIEN_DRIVE = '';` et colle le lien entre les guillemets, par exemple `const LIEN_DRIVE = 'https://drive.google.com/...';`. Enregistre.
4. Tant que cette ligne est vide, l'aide affiche « lien à demander à ton MJ ».

Si tes dossiers sont différents d'un joueur à l'autre, laisse la ligne vide et donne à chacun son lien directement.

## Mise en ligne (environ 5 minutes)
1. Va sur **github.com** et clique sur **Sign up** pour créer un compte gratuit. Ton **nom d'utilisateur apparaîtra dans le lien** : choisis-en un qui te convient.
2. Une fois connecté, clique sur le **+** en haut à droite, puis **New repository**.
3. **Repository name** : `coia-fiche` (le nom fait partie du lien, évite de le changer ensuite). Choisis **Public**. Clique sur **Create repository**.
4. Sur la page du dépôt, clique sur **uploading an existing file** (ou **Add file** puis **Upload files**).
5. Fais glisser les 5 fichiers dans la page, attends la fin du chargement, puis clique sur **Commit changes**.
6. Va dans **Settings** (onglet en haut du dépôt), puis **Pages** dans le menu de gauche.
7. Sous **Build and deployment**, **Source** : **Deploy from a branch**. **Branch** : `main`, dossier `/ (root)`, puis **Save**.
8. Attends 1 à 2 minutes et recharge la page. L'adresse apparaît en haut : `https://TON-NOM.github.io/coia-fiche/`.
9. Ouvre ce lien sur ton téléphone et sur ton PC pour tester.

## Partager avec les joueurs
Envoie-leur :
- le lien de la fiche : `https://TON-NOM.github.io/coia-fiche/`
- le lien de l'aide de jeu : `https://TON-NOM.github.io/coia-fiche/aide.html` (il est aussi accessible par le bouton **Aide** en bas de la fiche).

Conseille-leur de lire l'aide de jeu et d'ajouter la fiche à leur écran d'accueil.

## Mettre à jour la fiche plus tard
1. Ouvre ton dépôt sur github.com.
2. **Add file** puis **Upload files**, et dépose les nouveaux fichiers **avec les mêmes noms**.
3. **Commit changes**.

Le lien ne change pas, et les fiches déjà enregistrées par les joueurs sont conservées. Après une mise à jour, demande-leur de recharger la page (F5, ou tirer vers le bas sur téléphone). Ne renomme pas le dépôt et ne change pas ton nom d'utilisateur : cela changerait l'adresse, et les fiches enregistrées ne suivraient pas (il faudrait alors exporter puis importer).

## À savoir
- Le dépôt est public : le code de la fiche est visible par tous. Les fiches des joueurs, elles, ne sont jamais envoyées : elles restent dans leur navigateur.
- GitHub Pages est gratuit pour un dépôt public. Un site publié ne doit pas dépasser 1 Go, ce qui n'est pas un sujet ici.
- Pense à demander à tes joueurs d'exporter leur fiche après chaque séance : l'hébergement ne la sauvegarde pas.
