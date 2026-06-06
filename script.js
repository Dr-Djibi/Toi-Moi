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
const romanticMessageElement = document.getElementById('romanticMessage');

// Charger les utilisateurs autorisés depuis users.json
async function loadAuthorizedUsers() {
    try {
        const response = await fetch('users.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data.users) || data.users.length === 0) throw new Error('Format JSON invalide');
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
    if (!name) { errorMsg.textContent = 'Veuillez entrer votre nom'; nameInput.focus(); return; }
    if (authorizedUsers.length === 0) { errorMsg.textContent = 'Erreur de configuration'; return; }
    if (authorizedUsers.includes(name.toLowerCase())) {
        authenticated = true;
        authModal.classList.add('hidden');
        document.getElementById('audioControls').style.display = 'block';
        document.getElementById('loader').classList.remove('hidden');
        const backgroundMusic = document.getElementById('backgroundMusic');
        backgroundMusic.play().catch(err => console.warn(err));
        initializeScene();
    } else {
        errorMsg.textContent = 'Accès refusé - Nom non reconnu';
        nameInput.value = ''; nameInput.focus();
    }
}

submitBtn.addEventListener('click', checkName);
nameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); checkName(); } });

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

    composer = new THREE.EffectComposer(renderer);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(window.innerWidth, window.innerHeight);

    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        isMobile ? 0.8 : 1.2, 0.4, 0.2
    );
    composer.addPass(bloomPass);

    camera.position.z = isMobile ? 100 : 80;

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 30;
    controls.maxDistance = 200;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xff9ec7, 0.8);
    dl.position.set(1, 1, 1);
    scene.add(dl);
}

// === GESTION DES TEXTURES ET MATÉRIAUX ===
const textureLoader = new THREE.TextureLoader();

function createEmojiTexture(emoji) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = `bold 80px "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white'; ctx.fillText(emoji, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

const images = ["Img/Img1.jpg", "Img/Img2.jpg", "Img/Img3.jpg", "Img/Img4.jpg"];
const emojis = ["❤️", "💖", "🌹", "💋", "💍", "🥰", "✨", "💕", "💞"];
const emojiMaterials = {};
emojis.forEach(e => {
    emojiMaterials[e] = new THREE.PointsMaterial({ map: createEmojiTexture(e), transparent: true, size: 6, sizeAttenuation: true, alphaTest: 0.5 });
});

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

const fallbackMaterial = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, color: 0xff4d6d });

// === CRÉATION DES ÉLÉMENTS EN ORBITES ===
function addElements() {
    const createdParticles = [];
    // Restore emoji count and optimize image count
    const counts = isMobile ? { emojis: 100, photos: 4 } : { emojis: 150, photos: 4 };
    const totalCount = counts.emojis + counts.photos;

    for (let i = 0; i < totalCount; i++) {
        let radius, type, mesh;
        const angle = (i / totalCount) * Math.PI * 2 + Math.random();
        const speed = 0.05 + Math.random() * 0.1;
        
        if (i < counts.emojis) {
            type = 'emoji';
            radius = 60 + Math.random() * 40;
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]);
            mesh = new THREE.Points(geometry, emojiMaterials[randomEmoji]);
        } else {
            type = 'photo';
            radius = 25 + Math.random() * 15;
            const imageIndex = (i - counts.emojis) % images.length;
            const imageUrl = images[imageIndex] + "?v=" + Date.now(); // Cache-buster
            const geometry = isMobile ? new THREE.PlaneGeometry(12, 16) : new THREE.PlaneGeometry(16, 21);

            mesh = new THREE.Mesh(geometry, fallbackMaterial.clone());

            // On force le chargement de chaque image unique
            textureLoader.load(imageUrl, (t) => {
                t.encoding = THREE.sRGBEncoding;
                mesh.material = new THREE.MeshBasicMaterial({ 
                    map: t, 
                    side: THREE.DoubleSide, 
                    transparent: true,
                    alphaTest: 0.1 
                });
            }, undefined, (err) => {
                console.error("Erreur chargement image:", imageUrl, err);
            });
        }


        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (Math.random() - 0.5) * 50;
        mesh.position.set(x, y, z);
        mesh.userData = { type, radius, angle, orbitSpeed: speed * (Math.random() > 0.5 ? 1 : -1) * 0.3, verticalSpeed: 0.1 + Math.random() * 0.2, verticalPhase: Math.random() * 2, verticalAmplitude: 5, initialY: y };
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
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
        const v = Math.random() * 0.2;
        cols[i * 3] = color.r; cols[i * 3 + 1] = color.g + v; cols[i * 3 + 2] = color.b + v;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)'); grad.addColorStop(0.2, 'rgba(255, 77, 109, 0.8)'); grad.addColorStop(1, 'rgba(255, 77, 109, 0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
    const mat = new THREE.PointsMaterial({ size: isMobile ? 1.5 : 1.2, map: new THREE.CanvasTexture(canvas), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true, sizeAttenuation: true });
    particleHeart = new THREE.Points(geometry, mat);
    scene.add(particleHeart);
}

function startMessageCycle() {
    let index = 0;
    setInterval(() => {
        romanticMessageElement.style.opacity = 0;
        setTimeout(() => {
            romanticMessageElement.textContent = messages[index];
            romanticMessageElement.style.opacity = 1;
            index = (index + 1) % messages.length;
        }, 1000);
    }, 6000);
}

function updateLoadingProgress(targetTotal) {
    loadedItems++;
    const progress = Math.min(Math.round((loadedItems / targetTotal) * 100), 100);
    const progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = progress + '%';
    if (loadedItems >= targetTotal) hideLoader();
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (!loader || loader.classList.contains('hidden')) return;
    setTimeout(() => {
        loader.style.opacity = '0';
        document.getElementById('loveCanvas').classList.add('loaded');
        setTimeout(() => { loader.classList.add('hidden'); controls.autoRotate = true; startMessageCycle(); }, 1000);
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
        obj.position.x = Math.cos(data.angle) * data.radius;
        obj.position.z = Math.sin(data.angle) * data.radius;
        obj.position.y = data.initialY + Math.sin(time * data.verticalSpeed + data.verticalPhase) * data.verticalAmplitude;
        if (data.type === 'photo') obj.quaternion.copy(camera.quaternion);
    });
    if (particleHeart) {
        const beat = Math.pow(Math.sin(time * 4), 10) * 0.15 + Math.pow(Math.sin(time * 4 + 0.4), 10) * 0.08;
        const s = 1.0 + beat;
        particleHeart.scale.set(s, s, s);
        particleHeart.material.size = (isMobile ? 1.5 : 1.2) + beat * 3;
    }
    controls.update();
    composer.render();
}

window.addEventListener('load', async () => { await loadAuthorizedUsers(); nameInput.focus(); });
function initializeScene() { initThreeJS(); particles = addElements(); addParticleHeart(); animate(); }
window.addEventListener('resize', () => { if (!camera || !renderer || !composer) return; camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight); });
