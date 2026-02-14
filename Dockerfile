# Stage de build
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers du projet
COPY . .

# Stage final - serveur de production
FROM node:18-alpine

WORKDIR /app

# Installer http-server pour servir les fichiers statiques
RUN npm install -g http-server

# Copier les fichiers depuis le builder
COPY --from=builder /app .

# Exposer le port
EXPOSE 8080

# Variables d'environnement
ENV PORT=8080

# Commande pour démarrer le serveur
CMD ["http-server", ".", "-p", "8080", "-c-1"]
