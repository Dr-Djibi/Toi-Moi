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
        isMobile ? 1.0 : 1.5, // strength réduit pour mobile
        0.4, // radius
        0.2  // threshold
    );
    bloomPass.exposure = 1.0;
    composer.addPass(bloomPass);

    // Configuration de la caméra
    camera.position.z = isMobile ? 80 : 60; // Reculer un peu sur mobile

    // Contrôles OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;
    controls.enablePan = false;
    controls.enableZoom = !isMobile; // Désactiver le zoom sur mobile pour éviter les conflits
    controls.minDistance = 40;
    controls.maxDistance = 120;

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
    
    // Taille plus petite sur mobile pour économiser la mémoire GPU
    if (isEmoji) {
        canvas.width = 128;
        canvas.height = 128;
    } else {
        canvas.width = isMobile ? 512 : 1024; 
        canvas.height = isMobile ? 64 : 128;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (isEmoji) {
        ctx.font = `bold ${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.fillText(text, 64, 64);
    } else {
        const adjustedFontSize = isMobile ? fontSize / 2 : fontSize;
        ctx.font = `bold ${adjustedFontSize}px "Segoe UI", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.shadowColor = 'rgba(255, 77, 109, 1)';
        ctx.shadowBlur = isMobile ? 5 : 15;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = isMobile ? 1 : 2;
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

const fallbackTexture = createTextTexture("❤", 80, true);
const fallbackMaterial = new THREE.MeshBasicMaterial({ 
    map: fallbackTexture, 
    transparent: true,
    side: THREE.DoubleSide 
});

// === CRÉATION DES ÉLÉMENTS EN ORBITES ===
function addElements() {
    const createdParticles = [];
    
    // Répartition équilibrée pour mobile et desktop
    const counts = isMobile ? 
        { emojis: 60, texts: 40, photos: 20 } : 
        { emojis: 100, texts: 60, photos: 40 };
    
    const totalCount = counts.emojis + counts.texts + counts.photos;

    for (let i = 0; i < totalCount; i++) {
        let radius, type, mesh;
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.1 + Math.random() * 0.4;
        const verticalPhase = Math.random() * Math.PI * 2;
        const verticalAmplitude = 5 + Math.random() * 10;
        
        if (i < counts.emojis) { 
            type = 'emoji';
            radius = 50 + Math.random() * 30;
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]);
            mesh = new THREE.Points(geometry, emojiMaterials[randomEmoji]);
        } 
        else if (i < counts.emojis + counts.texts) { 
            type = 'text';
            radius = 35 + Math.random() * 25;
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            const geometry = isMobile ? new THREE.PlaneGeometry(12, 1.5) : new THREE.PlaneGeometry(16, 2);
            mesh = new THREE.Mesh(geometry, messageMaterials[randomMessage]);
        }
        else {
            type = 'photo';
            radius = 20 + Math.random() * 15;
            const imageIndex = (i - (counts.emojis + counts.texts)) % images.length;
            const imageUrl = images[imageIndex];
            const geometry = isMobile ? new THREE.PlaneGeometry(8, 10.4) : new THREE.PlaneGeometry(10, 13);
            
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
                }
            );
        }

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (Math.random() - 0.5) * 40;

        mesh.position.set(x, y, z);
        mesh.userData = { 
            type, 
            radius, 
            angle, 
            orbitSpeed: speed * (Math.random() > 0.5 ? 1 : -1) * 0.4,
            verticalSpeed: 0.1 + Math.random() * 0.2,
            verticalPhase,
            verticalAmplitude,
            initialY: y
        };

        scene.add(mesh);
        createdParticles.push(mesh);
        updateLoadingProgress(totalCount);
    }
    
    return createdParticles;
}

function addParticleHeart() {
    const particleCount = isMobile ? 2500 : 5000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const color = new THREE.Color('#ff4d6d');
    
    for (let i = 0; i < particleCount; i++) {
        const t = Math.random() * 2 * Math.PI;
        let x = 16 * Math.pow(Math.sin(t), 3);
        let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const z = (Math.random() - 0.5) * 8 * Math.sin(t);
        const noise = 1 + (Math.random() - 0.5) * 0.1;
        
        positions[i * 3] = x * noise;
        positions[i * 3 + 1] = y * noise;
        positions[i * 3 + 2] = z * noise;
        
        const colorVariation = Math.random() * 0.2;
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g + colorVariation;
        colors[i * 3 + 2] = color.b + colorVariation;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
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
        size: isMobile ? 1.5 : 1.2,
        map: particleTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
        sizeAttenuation: true
    });
    
    particleHeart = new THREE.Points(geometry, material);
    scene.add(particleHeart);
    return particleHeart;
}

function addWhiteParticles() {
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = isMobile ? 40 : 80;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 120;
        positions[i + 1] = (Math.random() - 0.5) * 120;
        positions[i + 2] = (Math.random() - 0.5) * 120;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
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
    const wp = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(wp);
    return wp;
}

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

function updateLoadingProgress(targetTotal) {
    loadedItems++;
    const actualTotal = targetTotal || totalItems;
    const progress = Math.min(Math.round((loadedItems / actualTotal) * 100), 100);
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    if (progressFill) progressFill.style.width = progress + '%';
    if (progressText) progressText.textContent = progress + '%';
    if (loadedItems >= actualTotal) hideLoader();
}

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
        }, 1000);
    }, 500);
}

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    if (!renderer || !scene || !camera || !composer) return;
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    
    particles.forEach(obj => {
        if (!obj.userData?.radius) return;
        const data = obj.userData;
        data.angle += data.orbitSpeed * delta;
        const x = Math.cos(data.angle) * data.radius;
        const z = Math.sin(data.angle) * data.radius;
        const verticalOffset = Math.sin(time * data.verticalSpeed + data.verticalPhase) * data.verticalAmplitude;
        const y = data.initialY + verticalOffset;
        obj.position.set(x, y, z);
        if (data.type !== 'emoji') obj.quaternion.copy(camera.quaternion);
    });

    if (particleHeart) {
        const speed = 4;
        const beat = Math.pow(Math.sin(time * speed), 10) * 0.15 + Math.pow(Math.sin(time * speed + 0.4), 10) * 0.08;
        const currentScale = 1.0 + beat;
        particleHeart.scale.set(currentScale, currentScale, currentScale);
        particleHeart.material.size = (isMobile ? 1.5 : 1.2) + beat * 3;
        particleHeart.rotation.y = time * 0.2;
    }

    if (whiteParticles) {
        const pos = whiteParticles.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            pos[i] += Math.sin(time * 0.5 + i) * 0.01;
            pos[i+1] += Math.cos(time * 0.4 + i) * 0.01;
        }
        whiteParticles.geometry.attributes.position.needsUpdate = true;
    }

    controls.update();
    composer.render();
}

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
            backgroundMusic.play().catch(err => console.warn(err.message));
            toggleMusic.classList.add('playing');
            toggleMusic.textContent = '🎵';
            musicPlaying = true;
        }
    });
    document.addEventListener('click', () => {
        if (!musicPlaying && authenticated) {
            backgroundMusic.play().catch(err => console.log(err.message));
            musicPlaying = true;
        }
    }, { once: true });
}

window.addEventListener('load', async () => {
    await loadAuthorizedUsers();
    nameInput.focus();
    setupAudio();
});

function initializeScene() {
    initThreeJS();
    particles = addElements();
    addParticleHeart();
    whiteParticles = addWhiteParticles();
    animate();
}

window.addEventListener('resize', () => {
    if (!camera || !renderer || !composer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });
