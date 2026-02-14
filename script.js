// === SYSTÈME D'AUTHENTIFICATION ===
let authenticated = false;
let authorizedUsers = [];
let particles = [];
let scene, camera, renderer, controls;
let loadedItems = 0;
const totalItems = 170; // 110 emojis + 50 messages + 10 images

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
        antialias: true,
        alpha: true,
        precision: 'lowp'
    });

    // Configuration du rendu
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.sortObjects = false;

    // Configuration de la caméra
    camera.position.z = 60;

    // Contrôles OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false; // Démarrera après authentification
    controls.autoRotateSpeed = 0.5;
    controls.enablePan = false;
    controls.minDistance = 40;
    controls.maxDistance = 100;

    // Lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xff9ec7, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    console.log('✅ Three.js initialisé');
}

// === GESTION DES TEXTURES ET MATÉRIAUX ===
const textureLoader = new THREE.TextureLoader();

// Créer une texture à partir de texte/emoji
function createTextTexture(text, fontSize = 60, isEmoji = false) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 256;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (isEmoji) {
        ctx.font = `bold ${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.fillText(text, 128, 128);
    } else {
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ff4d6d';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 15;
        ctx.fillText(text, 128, 128);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.strokeText(text, 128, 128);
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
    const texture = createTextTexture(emoji, 100, true);
    // Taille réduite des emojis pour éviter qu'ils soient trop grands
    emojiMaterials[emoji] = new THREE.PointsMaterial({ 
        map: texture, 
        transparent: true, 
        size: 8,
        sizeAttenuation: true,
        alphaTest: 0.5
    });
});

// Pool de matériaux pour messages
const messageMaterials = {};
const messages = [
    "Je t'aime plus que tout",
    "Pour la vie et au-delà",
    "Mon cœur bat pour toi",
    "Unique et précieux",
    "Éternellement à toi"
];
messages.forEach(message => {
    const texture = createTextTexture(message, 48, false);
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

// === CRÉATION DES ÉLÉMENTS EN ORBITE CYLINDRIQUE ===
function addElements() {
    // Distribution aléatoire dans un volume sphérique pour éviter le regroupement
    const maxRadius = 60;
    const createdParticles = [];

    for (let i = 0; i < totalItems; i++) {
        // random spherical distribution
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = Math.cbrt(Math.random()) * maxRadius; // cube root pour distribution uniforme du volume

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        const pos = new THREE.Vector3(x, y, z);
        const initialPosition = pos.clone();
        
        if (i < 110) { 
            // === EMOJIS ===
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]);
            const points = new THREE.Points(geometry, emojiMaterials[randomEmoji]);
            points.position.copy(pos);
            points.userData = { initialPosition, type: 'emoji' };
            scene.add(points);
            createdParticles.push(points);
            updateLoadingProgress();
        } 
        else if (i < 160) { 
            // === MESSAGES ===
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            const geometry = new THREE.PlaneGeometry(10, 5);
            const mesh = new THREE.Mesh(geometry, messageMaterials[randomMessage]);
            mesh.position.copy(pos);
            mesh.userData = { initialPosition, type: 'text' };
            scene.add(mesh);
            createdParticles.push(mesh);
            updateLoadingProgress();
        }
        else {
            // === IMAGES === (10 images au total)
            const imageIndex = (i - 160) % images.length;
            const imageUrl = images[imageIndex];
            const geometry = new THREE.PlaneGeometry(12, 16);

            textureLoader.load(
                imageUrl,
                (loadedTexture) => {
                    try {
                        loadedTexture.encoding = THREE.sRGBEncoding;
                    } catch (e) {}
                    const material = new THREE.MeshBasicMaterial({
                        map: loadedTexture,
                        side: THREE.DoubleSide,
                        transparent: true
                    });
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.position.copy(pos);
                    mesh.userData = { initialPosition, type: 'photo' };
                    scene.add(mesh);
                    createdParticles.push(mesh);
                    updateLoadingProgress();
                    console.log(`✅ Image chargée: ${imageUrl}`);
                },
                undefined,
                (err) => {
                    console.warn(`❌ Erreur image ${imageUrl}:`, err && err.message ? err.message : err);
                    const mesh = new THREE.Mesh(geometry, fallbackMaterial.clone());
                    mesh.position.copy(pos);
                    mesh.userData = { initialPosition, type: 'fallback' };
                    scene.add(mesh);
                    createdParticles.push(mesh);
                    updateLoadingProgress();
                }
            );
        }
    }
    
    return createdParticles;
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

// === GESTION DES CLICS ===
document.addEventListener('click', (e) => {
    if (!authenticated || e.target.id === 'toggleMusic') return;
    
    const heart = document.createElement('div');
    heart.classList.add('click-heart');
    heart.innerHTML = '❤️';
    heart.style.left = e.clientX + 'px';
    heart.style.top = e.clientY + 'px';
    document.body.appendChild(heart);
    
    setTimeout(() => heart.remove(), 1500);
});

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
    
    // Animation des particules
    particles.forEach(obj => {
        if (!obj.userData?.initialPosition) return;
        
        const { initialPosition } = obj.userData;
        const speed = obj.userData.type === 'photo' ? 0.3 : 0.7;
        const amplitude = obj.userData.type === 'photo' ? 0.8 : 1.5;
        
        // Oscillation naturelle
        obj.position.x = initialPosition.x + Math.sin(time * speed + initialPosition.y) * amplitude;
        obj.position.y = initialPosition.y + Math.cos(time * speed * 0.7 + initialPosition.z) * amplitude * 0.7;
        obj.position.z = initialPosition.z + Math.sin(time * speed * 0.5 + initialPosition.x) * amplitude * 0.5;
        
        // === BILLBOARD RENDERING - Toujours face à la caméra ===
        obj.quaternion.copy(camera.quaternion);
    });

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
    renderer.render(scene, camera);
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
    
    // Ajouter les particules blanches flottantes
    whiteParticles = addWhiteParticles();
    
    // Démarrer l'animation
    animate();
}

// === ÉVÉNEMENTS FENÊTRE ===
window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// === OPTIMISATION MOBILE ===
if ('ontouchstart' in window) {
    console.log('📱 Mode tactile détecté');
    document.addEventListener('DOMContentLoaded', () => {
        if (controls) {
            controls.autoRotate = false;
            controls.enableZoom = false;
        }
    });
    
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
} else {
    console.log('🖥️ Mode bureau');
}