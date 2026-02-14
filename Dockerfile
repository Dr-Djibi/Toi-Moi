FROM python:3.11-slim

WORKDIR /app

# Copier tous les fichiers
COPY . .

# Exposer le port
EXPOSE 8080

# Commande pour démarrer un serveur HTTP simple
CMD ["python", "-m", "http.server", "8080"]
