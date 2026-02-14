# Notre Univers D'Amour - Guide de Configuration

## 🔐 Authentification

### Configuration des noms autorisés

Modifiez le fichier `users.json` pour ajouter les noms des personnes qui peuvent accéder au site :

```json
{
  "users": [
    "Alice",
    "Bob",
    "Charlie",
    "Diana",
    "Eva"
  ]
}
```

**Important:** 
- Les noms ne sont **pas** sensibles à la casse (Alice = alice)
- Vous pouvez ajouter autant de noms que vous voulez
- Séparez les noms par des virgules
- Chaque nom doit être entre guillemets

### Exemple d'utilisation
1. Au démarrage, le site demande votre nom
2. Entrez un nom qui est dans la liste `users.json`
3. Si le nom est reconnu, vous accédez au site ✅
4. Sinon, un message d'erreur s'affiche ❌

---

## 🎵 Musique de Fond

- Bouton contrôle en bas à droite de l'écran
- 🎵 = Musique activée
- 🔇 = Musique désactivée
- La musique se lance automatiquement au premier clic (si autorisé par le navigateur)

---

## 🖼️ Images - Chargement Local ✅

### Images actuelles :
Les images sont stockées dans le dossier **`Img/`** :
- ✅ `Img1.jpg` (40 KB)
- ✅ `Img2.jpg` (1.8 MB)
- ✅ `Img3.jpg` (1.8 MB)
- ✅ `Img4.jpg` (79 KB)

**Total: 4 images locales qui se chargent automatiquement**

### Avantages du chargement local :
✅ Aucun problème CORS
✅ Chargement instantané (pas de serveur externe)
✅ Pas d'erreur 404
✅ Fonctionne hors ligne
✅ Performance optimale

### Si une image ne charge pas :
1. Un cœur rouge ❤ s'affiche à la place (fallback)
2. Le chargement continue normalement
3. Vérifiez que les fichiers JPG existent dans le dossier `Img/`

### Ajouter/Changer les images :
1. Ajoutez vos fichiers `.jpg` ou `.png` dans le dossier `Img/`
2. Modifiez l'array `images` dans `script.js` (ligne ~139) :
```javascript
const images = [
    "Img/Img1.jpg",
    "Img/Img2.jpg",
    "Img/Img3.jpg",
    "Img/Img4.jpg",
    "Img/VotreImage.jpg"  // Ajoutez comme ça
];
```

### Tester les images :
Ouvrez le fichier **`test-images.html`** dans votre navigateur pour vérifier que toutes les images se chargent correctement.

---

## 🔍 Images - Vérification de Chargement (Ancien)

**NOTE: Les images sont maintenant chargées localement depuis le dossier `Img/`**

**Avantages :**
✅ Pas d'erreur 404
✅ Hébergement sécurisé
✅ Compatible mobile
✅ Chargement progressif avec barre de progression

### Vérification du chargement :
Ouvrez la console du navigateur (F12) pour voir :
- ✅ Image chargée: [URL]
- 📥 Chargement [URL]: X%
- ❌ Erreur image: [raison] (affiche un cœur de secours)

### Si une image ne charge pas :
1. Un cœur rouge ❤ s'affiche à la place (fallback)
2. Le chargement continue normalement
3. Aucun blocage de la scène

---

## 📱 Optimisation Mobile

✅ **100% optimisé pour smartphone**
- Pas de zoom involontaire
- Contrôles tactiles intuitifs
- Glisser-déposer pour explorer
- Performance optimisée

---

## 🎨 Personnalisation

### Changer les images :
Modifiez l'array `images` dans `script.js` (ligne ~138) :
```javascript
const images = [
    "votre-url-1.jpg",
    "votre-url-2.jpg",
    "votre-url-3.jpg"
];
```

**Important:** Les URLs doivent accepter les requêtes CORS !

### Ajouter des emojis :
Modifiez l'array `emojis` dans `script.js` (ligne ~157) :
```javascript
const emojis = ["❤️", "💖", "🌹", "💋", "💍", "🥰", "✨", "💕", "💞"];
```

### Ajouter des messages :
Modifiez l'array `messages` dans `script.js` (ligne ~168) :
```javascript
const messages = ["Je t'aime", "Pour la vie", "Mon Coeur", "Unique", "Éternel"];
```

---

## 🐛 Dépannage

### "Erreur: Veuillez configurer users.json correctement"
- Vérifiez que `users.json` existe
- Vérifiez le format JSON (guillemets, virgules)
- Vérifiez que la liste n'est pas vide

### Les images ne chargent pas
- Ouvrez la console (F12)
- Cherchez les messages ❌ Erreur image
- L'URL est peut-être invalide ou bloquée par CORS
- Des cœurs rouges s'affichent à la place (fallback)

### La musique ne joue pas
- Vérifiez que l'audio est autorisé dans le navigateur
- Les navigateurs bloquent l'autoplay sans interaction utilisateur
- Cliquez d'abord dans la page, puis utilisez le bouton 🎵

### Le site est lent sur mobile
- Réduisez le nombre d'éléments (200 -> 100) ligne ~171 dans `script.js`
- Les images hautes résolution ralentissent le chargement
- Utilisez des images plus légères

---

## ✨ Caractéristiques

✅ Authentification par JSON
✅ Orbite cylindrique (pas sphérique)
✅ 200 éléments animés
✅ Musique de fond
✅ Billboard rendering (tout face à caméra)
✅ Responsive 100% mobile
✅ Chargement progressif
✅ Gestion d'erreurs robuste

---

## 📞 Support

Si vous avez des problèmes :
1. Vérifiez la console (F12)
2. Vérifiez les fichiers JSON
3. Testez sur une autre connexion (peut-être bloquée par firewall)

**Bon amusement! 💕**
