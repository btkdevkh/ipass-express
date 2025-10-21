# Étape 1 : build
FROM node:22-alpine

# Créer le répertoire de l'application
WORKDIR /app

# Installer dépendances
COPY package*.json ./
RUN npm install

# Copier le code
COPY . .

# Exposer le port que votre app utilise
EXPOSE 8080
ENV PORT=8080

# Lancer le serveur
CMD ["npm", "run", "start"]
