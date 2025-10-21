# ipass

![ipass](https://github.com/btkdevkh/ipass-express/blob/main/public/home.png?raw=true)

---

## Description

C'est un gestionnaire de mots de passe, un peu comme Google Password. Ici, pour démarrer, il permet d'ajouter, de lister et de supprimer des mots de passe.

---

## L'utilisation

Pour utiliser cette application en localhost ou docker container :

- Cloner le répos;
- Installer les dépendances via `npm i`;
- Créer un fichier `db.sqlite` à la raçine du projet;
- Créer un fichier `.env` à la raçine du projet avec ces deux variables `MASTER_KEY=VOTRE_MASTER_KEY` de 32 caratères avec cette commande sous Linux `openssl rand -hex 16` et enfin `MASTER_PASSWORD=VOTRE_MASTER_PASSWORD`;
- Lancer la commande `npm run css` pour compiler avec Tailwind CSS;
- Lancer la commande `npm run dev` pour développer de nouvelle fonctionalité / tester;

## Technologies utilisées

- Backend (Node.js, Express.js, SQLite)
- Frontend (EJS, Tailwind)
