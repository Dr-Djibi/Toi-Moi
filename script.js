// === DÉTECTION MOBILE ===
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);

// === SYSTÈME D'AUTHENTIFICATION ===
let authenticated = false;
let authorizedUsers = [];
let particles = [];
let particleHeart = null;
let scene, camera, renderer, controls, composer;
let loadedItems = 0;
const totalItems = isMobile ? 120 : 200; // Réduit pour mobile

// Éléments DOM
const authModal = document.getElementById('authModal');
const nameInput = document.getElementById('nameInput');
const submitBtn = document.getElementById('submitBtn');
const errorMsg = document.getElementById('errorMsg');

// Charger les utilisateurs autorisés depuis users.json
async function loadAuthorizedUsers() {
    try {
        const response = await fetch('users.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        if (!Array.isArray(data.users) || data.users.length === 0) {
            throw new Error('Format JSON invalide ou liste vide');
        }
        
        authorizedUsers = data.users.map(name => name.toString().trim().toLowerCase());
        console.log('Utilisateurs chargés:', authorizedUsers);
    } catch (error) {
        console.error('Erreur chargement users.json:', error);
        errorMsg.textContent = 'Erreur: Veuillez configurer users.json correctement';
        authorizedUsers = [];
    }
}

// Vérifier le nom et accorder l'accès
function checkName() {
    const name = nameInput.value.trim();
    
    if (!name) {
        errorMsg.textContent = 'Veuillez entrer votre nom';
        nameInput.focus();
        return;
    }
    
    if (authorizedUsers.length === 0) {
        errorMsg.textContent = 'Erreur de configuration. Rechargez la page.';
        return;
    }
    
    if (authorizedUsers.includes(name.toLowerCase())) {
        authenticated = true;
        errorMsg.textContent = '';
        authModal.classList.add('hidden');
        document.getElementById('audioControls').style.display = 'block';
        document.getElementById('loader').classList.remove('hidden');
        
        // Jouer l'audio et initialiser
        const backgroundMusic = document.getElementById('backgroundMusic');
        backgroundMusic.play().catch(err => console.warn('Erreur lors de la lecture audio:', err));
        
        initializeScene();
    } else {
        errorMsg.textContent = 'Accès refusé - Nom non reconnu';
        nameInput.value = '';
        nameInput.focus();
    }
}

// Événements d'authentification
submitBtn.addEventListener('click', checkName);
nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        checkName();
    }
});

// === INITIALISATION THREEJS ===
function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('loveCanvas'), 
        antialias: !isMobile, // Désactivé sur mobile pour perf
        alpha: true,
        precision: isMobile ? 'lowp' : 'mediump'
    });

    // Configuration du rendu
    const pixelRatio = isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.sortObjects = false;

    // Post-processing
    composer = new THREE.EffectComposer(renderer);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(window.innerWidth, window.innerHeight);

    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Bloom ajusté pour mobile
    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        isMobile ? 1.2 : 1.5, // strength
        0.4, // radius
        0.2  // threshold
    );
    bloomPass.exposure = 1.0;
    composer.addPass(bloomPass);

    // Configuration de la caméra
    camera.position.z = isMobile ? 70 : 60; // Reculer un peu sur mobile

    // Contrôles OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;
    controls.enablePan = false;
    controls.enableZoom = !isMobile; // Désactiver le zoom sur mobile pour éviter les conflits
    controls.minDistance = 40;
    controls.maxDistance = 100;

    // Lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xff9ec7, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    console.log(`✅ Three.js initialisé (Mobile: ${isMobile})`);
}

// === GESTION DES TEXTURES ET MATÉRIAUX ===
const textureLoader = new THREE.TextureLoader();

// Créer une texture à partir de texte/emoji
function createTextTexture(text, fontSize = 60, isEmoji = false) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Taille dynamique pour les messages longs
    if (isEmoji) {
        canvas.width = 128;
        canvas.height = 128;
    } else {
        canvas.width = 1024; // Plus large pour les phrases
        canvas.height = 128;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (isEmoji) {
        ctx.font = `bold ${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.fillText(text, 64, 64);
    } else {
        ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Glow effect pour lisibilité sur Bloom
        ctx.shadowColor = 'rgba(255, 77, 109, 1)';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Deuxième passe pour renforcer le contour
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
}

// URL des images locales du dossier Img
const images = [
    "Img/Img1.jpg",
    "Img/Img2.jpg",
    "Img/Img3.jpg",
    "Img/Img4.jpg"
];

// Pool de matériaux pour emojis
const emojiMaterials = {};
const emojis = ["❤️", "💖", "🌹", "💋", "💍", "🥰", "✨", "💕", "💞"];
emojis.forEach(emoji => {
    const texture = createTextTexture(emoji, 80, true);
    // Taille réduite des emojis pour éviter qu'ils soient trop grands
    emojiMaterials[emoji] = new THREE.PointsMaterial({ 
        map: texture, 
        transparent: true, 
        size: 6,
        sizeAttenuation: true,
        alphaTest: 0.5
    });
});

// Pool de matériaux pour messages
const messageMaterials = {};
const messages = [
    "Mes yeux ne t'ont jamais vue, mais mon cœur te reconnaîtrait entre mille.",
    "La distance n'est qu'un test pour voir jusqu'où l'amour peut voyager.",
    "Un écran ne pourra jamais contenir toute l'immensité de ce que je ressens pour toi.",
    "Chaque kilomètre qui nous sépare est une promesse de plus : nos retrouvailles seront éternelles.",
    "L'amour, ce n'est pas se voir tous les jours, c'est se sentir partout, tout le temps.",
    "On ne s'est jamais touchés, mais nos âmes sont déjà enlacées.",
    "Le hasard n'existe pas, il n'y a que des rendez-vous que nous avions déjà fixés.",
    "Ton âme est le seul endroit au monde où je me sens vraiment chez moi.",
    "Je t'aimais déjà avant de te connaître, et je t'aimerai encore quand le temps se sera arrêté.",
    "Chaque jour avec toi est une éternité que je voudrais recommencer.",
    "L'absence de ta présence physique est comblée par l'omniprésence de ton souvenir.",
    "Tu es mon plus beau 'bientôt'.",
    "L'amour vrai ne connaît pas de frontières, seulement des horizons.",
    "Nos cœurs battent à l'unisson, peu importe le fuseau horaire.",
    "Chaque battement de mon cœur porte ton nom.",
    "La distance sépare les corps, pas les cœurs.",
    "Tu es ma plus belle pensée avant de m'endormir.",
    "Loin des yeux, mais plus proche que jamais du cœur.",
    "Je compte les jours jusqu'à ce que je n'aie plus à les compter.",
    "Notre amour est plus fort que n'importe quelle distance."
];
messages.forEach(message => {
    const texture = createTextTexture(message, 32, false);
    messageMaterials[message] = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });
});

// Fallback si les images ne chargent pas
const fallbackTexture = createTextTexture("❤", 80, true);
const fallbackMaterial = new THREE.MeshBasicMaterial({ 
    map: fallbackTexture, 
    transparent: true,
    side: THREE.DoubleSide 
});

// === CRÉATION DES ÉLÉMENTS EN ORBITES ===
function addElements() {
    const createdParticles = [];

    for (let i = 0; i < totalItems; i++) {
        let radius, type, mesh, material, userData;
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.1 + Math.random() * 0.4;
        const verticalPhase = Math.random() * Math.PI * 2;
        const verticalAmplitude = 5 + Math.random() * 10;
        
        if (i < 120) { 
            // === EMOJIS (Constellation lointaine) ===
            type = 'emoji';
            radius = 50 + Math.random() * 30;
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]);
            mesh = new THREE.Points(geometry, emojiMaterials[randomEmoji]);
        } 
        else if (i < 180) { 
            // === MESSAGES (Orbite intermédiaire) ===
            type = 'text';
            radius = 35 + Math.random() * 25;
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            const geometry = new THREE.PlaneGeometry(16, 2); // Aspect ratio allongé pour les phrases
            mesh = new THREE.Mesh(geometry, messageMaterials[randomMessage]);
        }
        else {
            // === IMAGES (Orbite proche et prioritaire) ===
            type = 'photo';
            radius = 20 + Math.random() * 15;
            const imageIndex = (i - 180) % images.length;
            const imageUrl = images[imageIndex];
            const geometry = new THREE.PlaneGeometry(10, 13);
            
            // Créer un mesh temporaire avec le fallback en attendant le chargement
            mesh = new THREE.Mesh(geometry, fallbackMaterial.clone());
            
            textureLoader.load(
                imageUrl,
                (loadedTexture) => {
                    loadedTexture.encoding = THREE.sRGBEncoding;
                    mesh.material = new THREE.MeshBasicMaterial({
                        map: loadedTexture,
                        side: THREE.DoubleSide,
                        transparent: true
                    });
                    console.log(`✅ Image chargée: ${imageUrl}`);
                }
            );
        }

        // Calcul position initiale
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (Math.random() - 0.5) * 40;

        mesh.position.set(x, y, z);
        mesh.userData = { 
            type, 
            radius, 
            angle, 
            orbitSpeed: speed * (Math.random() > 0.5 ? 1 : -1) * 0.5,
            verticalSpeed: 0.2 + Math.random() * 0.3,
            verticalPhase,
            verticalAmplitude,
            initialY: y
        };

        scene.add(mesh);
        createdParticles.push(mesh);
        updateLoadingProgress();
    }
    
    return createdParticles;
}

// === AJOUT DU COEUR DE PARTICULES 3D ===
function addParticleHeart() {
    const particleCount = isMobile ? 2500 : 5000; // Optimisé pour mobile
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const color = new THREE.Color('#ff4d6d');
    
    for (let i = 0; i < particleCount; i++) {
        // Paramètres pour la forme de cœur (Taubin)
        const t = Math.random() * 2 * Math.PI;
        
        // Formule du cœur 2D
        let x = 16 * Math.pow(Math.sin(t), 3);
        let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        
        // Rendre 3D : on ajoute une composante Z et un peu de volume
        // On crée une coque en variant Z selon la position X/Y pour donner du relief
        const z = (Math.random() - 0.5) * 8 * Math.sin(t);
        
        // Un peu de bruit pour le côté "énergie"
        const noise = 1 + (Math.random() - 0.5) * 0.1;
        
        positions[i * 3] = x * noise;
        positions[i * 3 + 1] = y * noise;
        positions[i * 3 + 2] = z * noise;
        
        // Variation légère de couleur
        const colorVariation = Math.random() * 0.2;
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g + colorVariation;
        colors[i * 3 + 2] = color.b + colorVariation;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Matériau de particule avec glow
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 77, 109, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 77, 109, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 77, 109, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const particleTexture = new THREE.CanvasTexture(canvas);
    
    const material = new THREE.PointsMaterial({
        size: isMobile ? 1.5 : 1.2, // Particules un peu plus grandes sur mobile pour compenser la densité moindre
        map: particleTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
        sizeAttenuation: true
    });
    
    particleHeart = new THREE.Points(geometry, material);
    scene.add(particleHeart);
    
    console.log(`❤️ Cœur de particules 3D initialisé (${particleCount} particules)`);
    return particleHeart;
}

// === AJOUT DE PARTICULES BLANCHES FLOTTANTES ===
function addWhiteParticles() {
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 80;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 120;      // x
        positions[i + 1] = (Math.random() - 0.5) * 120;  // y
        positions[i + 2] = (Math.random() - 0.5) * 120;  // z
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Créer un canvas pour la texture des particules
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Dessiner un point blanc avec dégradé
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const particleTexture = new THREE.CanvasTexture(canvas);
    const particleMaterial = new THREE.PointsMaterial({
        map: particleTexture,
        transparent: true,
        size: 2,
        sizeAttenuation: true,
        color: 0xffffff,
        opacity: 0.8
    });
    
    const whiteParticles = new THREE.Points(particleGeometry, particleMaterial);
    whiteParticles.userData = { isWhiteParticles: true };
    scene.add(whiteParticles);
    
    return whiteParticles;
}

// === GESTION DES INTERACTIONS (CLIC/TOUCH) ===
function createClickHeart(x, y) {
    if (!authenticated) return;
    
    const heart = document.createElement('div');
    heart.classList.add('click-heart');
    heart.innerHTML = '❤️';
    heart.style.left = x + 'px';
    heart.style.top = y + 'px';
    document.body.appendChild(heart);
    
    setTimeout(() => heart.remove(), 1500);
}

document.addEventListener('mousedown', (e) => {
    if (e.target.closest('#toggleMusic') || e.target.closest('.auth-container')) return;
    createClickHeart(e.clientX, e.clientY);
});

document.addEventListener('touchstart', (e) => {
    if (e.target.closest('#toggleMusic') || e.target.closest('.auth-container')) return;
    const touch = e.touches[0];
    createClickHeart(touch.clientX, touch.clientY);
}, { passive: true });

// === PROGRESSION DU CHARGEMENT ===
function updateLoadingProgress() {
    loadedItems++;
    const progress = Math.round((loadedItems / totalItems) * 100);
    
    // Mettre à jour la barre de progression
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }
    if (progressText) {
        progressText.textContent = progress + '%';
    }
    
    console.log(`Chargement: ${progress}%`);

    // Attendre que toutes les ressources soient chargées avant de masquer le loader
    if (loadedItems >= totalItems) {
        hideLoader();
    }
}

// Masquer le loader
function hideLoader() {
    const loader = document.getElementById('loader');
    const canvas = document.getElementById('loveCanvas');
    
    if (!loader || loader.classList.contains('hidden')) return;
    
    setTimeout(() => {
        loader.style.opacity = '0';
        canvas.classList.add('loaded');
        
        setTimeout(() => {
            loader.classList.add('hidden');
            controls.autoRotate = true;
            console.log('🎉 Scène prête!');
        }, 1000);
    }, 500);
}

// === ANIMATION PRINCIPALE ===
const clock = new THREE.Clock();
let whiteParticles = null;

function animate() {
    requestAnimationFrame(animate);
    
    if (!renderer || !scene || !camera) return;
    
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    
    // Animation des éléments en orbite
    particles.forEach(obj => {
        if (!obj.userData?.radius) return;
        
        const data = obj.userData;
        
        // Mise à jour de l'angle d'orbite
        data.angle += data.orbitSpeed * delta;
        
        // Calcul de la nouvelle position (Orbite Circulaire)
        const x = Math.cos(data.angle) * data.radius;
        const z = Math.sin(data.angle) * data.radius;
        
        // Oscillation verticale douce
        const verticalOffset = Math.sin(time * data.verticalSpeed + data.verticalPhase) * data.verticalAmplitude;
        const y = data.initialY + verticalOffset;
        
        obj.position.set(x, y, z);
        
        // === BILLBOARD RENDERING PERFECTO ===
        // Utiliser lookAt pour que les plans fassent toujours face à la caméra
        // Mais pour les points (emojis), Three.js gère déjà ça si on ne change pas la rotation
        if (data.type !== 'emoji') {
            obj.quaternion.copy(camera.quaternion);
        }
    });

    // Animation du cœur de particules (Battement)
    if (particleHeart) {
        // Double battement réaliste : deux pics de sinus décalés
        const speed = 4;
        const beat1 = Math.pow(Math.sin(time * speed), 10) * 0.15;
        const beat2 = Math.pow(Math.sin(time * speed + 0.4), 10) * 0.08;
        const pulse = beat1 + beat2;
        
        const baseScale = 1.0;
        const currentScale = baseScale + pulse;
        particleHeart.scale.set(currentScale, currentScale, currentScale);
        
        // Faire varier la taille des particules et l'opacité pour le glow
        particleHeart.material.size = 1.2 + pulse * 3;
        
        // Rotation lente du cœur sur lui-même
        particleHeart.rotation.y = time * 0.2;
    }

    // Animation des particules blanches
    if (whiteParticles) {
        const positions = whiteParticles.geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            const x0 = positions[i];
            const y0 = positions[i + 1];
            const z0 = positions[i + 2];
            
            const index = i / 3;
            
            // Oscillation douce des particules blanches
            positions[i] = x0 + Math.sin(time * 0.5 + index) * 0.5;
            positions[i + 1] = y0 + Math.cos(time * 0.4 + index) * 0.5;
            positions[i + 2] = z0 + Math.sin(time * 0.3 + index) * 0.3;
        }
        
        whiteParticles.geometry.attributes.position.needsUpdate = true;
    }

    controls.update();
    composer.render();
}

// === GESTION AUDIO ===
function setupAudio() {
    const backgroundMusic = document.getElementById('backgroundMusic');
    const toggleMusic = document.getElementById('toggleMusic');
    let musicPlaying = false;

    toggleMusic.addEventListener('click', (e) => {
        e.stopPropagation();
        
        if (musicPlaying) {
            backgroundMusic.pause();
            toggleMusic.classList.remove('playing');
            toggleMusic.textContent = '🔇';
            musicPlaying = false;
        } else {
            backgroundMusic.play().catch(err => {
                console.warn('Erreur lecture audio:', err.message);
            });
            toggleMusic.classList.add('playing');
            toggleMusic.textContent = '🎵';
            musicPlaying = true;
        }
    });

    // Autoplay au premier clic
    document.addEventListener('click', () => {
        if (!musicPlaying && authenticated) {
            backgroundMusic.play().catch(err => console.log('Autoplay bloqué:', err.message));
            musicPlaying = true;
        }
    }, { once: true });
}

// === INITIALISATION AU CHARGEMENT ===
window.addEventListener('load', async () => {
    console.log('🚀 Démarrage du site...');
    
    // Charger les utilisateurs
    await loadAuthorizedUsers();
    
    // Focus sur le champ de nom
    nameInput.focus();
    
    // Setup audio
    setupAudio();
    
    // Événements authentification
    submitBtn.addEventListener('click', checkName);
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            checkName();
        }
    });
    
    // Masquer les contrôles audio
    document.getElementById('audioControls').style.display = 'none';
});

// Initialiser la scène après authentification
function initializeScene() {
    console.log('🎬 Initialisation de la scène 3D...');
    
    // Initialiser Three.js
    initThreeJS();
    
    // Ajouter les éléments
    particles = addElements();
    
    // Ajouter le cœur de particules central
    addParticleHeart();
    
    // Ajouter les particules blanches flottantes
    whiteParticles = addWhiteParticles();
    
    // Démarrer l'animation
    animate();
}

// === ÉVÉNEMENTS FENÊTRE ===
window.addEventListener('resize', () => {
    if (!camera || !renderer || !composer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Prévenir le zoom par double-tap sur iOS
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });