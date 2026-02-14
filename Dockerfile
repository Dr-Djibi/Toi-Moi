FROM nginx:stable-alpine

# Dossier de travail
WORKDIR /usr/share/nginx/html

# Copier les fichiers statiques du projet dans le dossier web de Nginx
COPY . .

# Remplacer la configuration par défaut pour écouter sur le port 8080
RUN rm /etc/nginx/conf.d/default.conf && \
	printf "server {\n    listen 8080;\n    server_name localhost;\n    root /usr/share/nginx/html;\n    index index.html;\n    location / {\n        try_files $uri $uri/ /index.html;\n    }\n}\n" > /etc/nginx/conf.d/default.conf

# Exposer le port attendu par les plateformes PaaS (Render, etc.)
EXPOSE 8080

# Lancer Nginx au 1er plan
CMD ["nginx", "-g", "daemon off;"]
