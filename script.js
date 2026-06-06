// === DÉTECTION MOBILE ===
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);

// === SYSTÈME D'AUTHENTIFICATION ===
let authenticated = false;
let authorizedUsers = [];
let particles = [];
let particleHeart = null;
let scene, camera, renderer, controls, composer;
let loadedItems = 0;

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
        const backgroundMusic = document.getElementById('backgroundMusic');
        backgroundMusic.play().catch(err => console.warn('Erreur lors de la lecture audio:', err));
        initializeScene();
    } else {
        errorMsg.textContent = 'Accès refusé - Nom non reconnu';
        nameInput.value = '';
        nameInput.focus();
    }
}

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
        antialias: !isMobile, 
        alpha: true,
        precision: isMobile ? 'lowp' : 'mediump'
    });

    const pixelRatio = isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.sortObjects = false;

    composer = new THREE.EffectComposer(renderer);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(window.innerWidth, window.innerHeight);

    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        isMobile ? 0.8 : 1.2, 
        0.4, 
        0.2  
    );
    bloomPass.exposure = 1.0;
    composer.addPass(bloomPass);

    camera.position.z = isMobile ? 100 : 80; 

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;
    controls.enablePan = false;
    controls.enableZoom = true; // RE-ENABLED ZOOM
    controls.minDistance = 30;
    controls.maxDistance = 200;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xff9ec7, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
}

// === GESTION DES TEXTURES ET MATÉRIAUX ===
const textureLoader = new THREE.TextureLoader();

function createTextTexture(text, fontSize = 70, isEmoji = false) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (isEmoji) {
        canvas.width = 128;
        canvas.height = 128;
    } else {
        canvas.width = 1024; 
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
        
        ctx.shadowColor = 'rgba(255, 77, 109, 1)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
}

const images = ["Img/Img1.jpg", "Img/Img2.jpg", "Img/Img3.jpg", "Img/Img4.jpg"];
const emojiMaterials = {};
const emojis = ["❤️", "💖", "🌹", "💋", "💍", "🥰", "✨", "💕", "💞"];
emojis.forEach(emoji => {
    const texture = createTextTexture(emoji, 80, true);
    emojiMaterials[emoji] = new THREE.PointsMaterial({ map: texture, transparent: true, size: 6, sizeAttenuation: true, alphaTest: 0.5 });
});

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
    "Tu es mon plus beau 'bientôt'.",
    "L'amour vrai ne connaît pas de frontières, seulement des horizons.",
    "Nos cœurs battent à l'unisson, peu importe le fuseau horaire."
];
messages.forEach(message => {
    const texture = createTextTexture(message, 32, false);
    messageMaterials[message] = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false });
});

const fallbackTexture = createTextTexture("❤", 80, true);
const fallbackMaterial = new THREE.MeshBasicMaterial({ map: fallbackTexture, transparent: true, side: THREE.DoubleSide });

// === CRÉATION DES ÉLÉMENTS EN ORBITES ===
function addElements() {
    const createdParticles = [];
    const counts = isMobile ? { emojis: 20, texts: 10, photos: 10 } : { emojis: 50, texts: 20, photos: 15 };
    const totalCount = counts.emojis + counts.texts + counts.photos;

    for (let i = 0; i < totalCount; i++) {
        let radius, type, mesh;
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.05 + Math.random() * 0.15;
        const verticalPhase = Math.random() * Math.PI * 2;
        const verticalAmplitude = 5 + Math.random() * 5;
        
        if (i < counts.emojis) { 
            type = 'emoji';
            radius = 60 + Math.random() * 40;
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]);
            mesh = new THREE.Points(geometry, emojiMaterials[randomEmoji]);
        } 
        else if (i < counts.emojis + counts.texts) { 
            type = 'text';
            radius = 35 + Math.random() * 25;
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            // LARGER TEXT PLANES
            const geometry = isMobile ? new THREE.PlaneGeometry(28, 3.5) : new THREE.PlaneGeometry(36, 4.5);
            mesh = new THREE.Mesh(geometry, messageMaterials[randomMessage]);
        }
        else {
            type = 'photo';
            radius = 20 + Math.random() * 20;
            const imageIndex = (i - (counts.emojis + counts.texts)) % images.length;
            const imageUrl = images[imageIndex];
            const geometry = isMobile ? new THREE.PlaneGeometry(12, 16) : new THREE.PlaneGeometry(16, 21);
            mesh = new THREE.Mesh(geometry, fallbackMaterial.clone());
            textureLoader.load(imageUrl, (t) => {
                t.encoding = THREE.sRGBEncoding;
                mesh.material = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, transparent: true });
            });
        }

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (Math.random() - 0.5) * 40;
        mesh.position.set(x, y, z);
        mesh.userData = { type, radius, angle, orbitSpeed: speed * (Math.random() > 0.5 ? 1 : -1) * 0.4, verticalSpeed: 0.1 + Math.random() * 0.2, verticalPhase, verticalAmplitude, initialY: y };
        scene.add(mesh);
        createdParticles.push(mesh);
        updateLoadingProgress(totalCount);
    }
    return createdParticles;
}

function addParticleHeart() {
    const particleCount = isMobile ? 2000 : 4000;
    const geometry = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    const cols = new Float32Array(particleCount * 3);
    const color = new THREE.Color('#ff4d6d');
    for (let i = 0; i < particleCount; i++) {
        const t = Math.random() * 2 * Math.PI;
        let x = 16 * Math.pow(Math.sin(t), 3);
        let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const z = (Math.random() - 0.5) * 8 * Math.sin(t);
        const noise = 1 + (Math.random() - 0.5) * 0.1;
        pos[i * 3] = x * noise; pos[i * 3 + 1] = y * noise; pos[i * 3 + 2] = z * noise;
        const v = Math.random() * 0.2;
        cols[i * 3] = color.r; cols[i * 3 + 1] = color.g + v; cols[i * 3 + 2] = color.b + v;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)'); grad.addColorStop(0.2, 'rgba(255, 77, 109, 0.8)'); grad.addColorStop(1, 'rgba(255, 77, 109, 0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.PointsMaterial({ size: isMobile ? 1.4 : 1.1, map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true, sizeAttenuation: true });
    particleHeart = new THREE.Points(geometry, mat);
    scene.add(particleHeart);
    return particleHeart;
}

function addWhiteParticles() {
    const geo = new THREE.BufferGeometry();
    const count = isMobile ? 30 : 60;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 150;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)'); grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
    const mat = new THREE.PointsMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, size: 2, sizeAttenuation: true, color: 0xffffff, opacity: 0.6 });
    const wp = new THREE.Points(geo, mat);
    scene.add(wp);
    return wp;
}

function createClickHeart(x, y) {
    if (!authenticated) return;
    const h = document.createElement('div');
    h.classList.add('click-heart'); h.innerHTML = '❤️';
    h.style.left = x + 'px'; h.style.top = y + 'px';
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 1500);
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
    const progress = Math.min(Math.round((loadedItems / targetTotal) * 100), 100);
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    if (progressFill) progressFill.style.width = progress + '%';
    if (progressText) progressText.textContent = progress + '%';
    if (loadedItems >= targetTotal) hideLoader();
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
        const y = data.initialY + Math.sin(time * data.verticalSpeed + data.verticalPhase) * data.verticalAmplitude;
        obj.position.set(x, y, z);
        if (data.type !== 'emoji') obj.quaternion.copy(camera.quaternion);
    });
    if (particleHeart) {
        const beat = Math.pow(Math.sin(time * 4), 10) * 0.15 + Math.pow(Math.sin(time * 4 + 0.4), 10) * 0.08;
        const s = 1.0 + beat;
        particleHeart.scale.set(s, s, s);
        particleHeart.material.size = (isMobile ? 1.4 : 1.1) + beat * 3;
        particleHeart.rotation.y = time * 0.2;
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
