const pictures = [
    { file: 'palette.svg', name: 'Палитра' },
    { file: 'brush.svg', name: 'Кисть' },
    { file: 'painting.svg', name: 'Картина' },
    { file: 'pencil.svg', name: 'Карандаш' },
    { file: 'sunflower.svg', name: 'Подсолнух' },
    { file: 'vase.svg', name: 'Ваза' }
];

const imageFolder = '../Images/game/';
const cardBack = 'back.svg';

const field = document.querySelector('#game-field');
const startButton = document.querySelector('#game-start');
const pauseButton = document.querySelector('#game-pause');
const timeText = document.querySelector('#game-time');
const pairsText = document.querySelector('#game-pairs');
const movesText = document.querySelector('#game-moves');
const message = document.querySelector('#game-message');

let firstCard = null;
let secondCard = null;
let pairs = 0;
let moves = 0;
let playing = false;
let paused = false;

let timer;
let closeTimer;
let endTime;
let timeLeft = 60000;

function showCard(card, open) {
    const picture = pictures[Number(card.dataset.picture)];
    const image = card.querySelector('img');
    const file = open ? picture.file : cardBack;
    const label = open ? picture.name : 'закрыта';

    image.src = imageFolder + file;
    card.classList.toggle('is-open', open);
    card.setAttribute('aria-label', `Карточка ${card.dataset.number}, ${label}`);
}

function createField() {
    field.replaceChildren();

    const deck = [];
    for (let i = 0; i < pictures.length; i++) {
        deck.push(i, i);
    }

    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    deck.forEach((pictureIndex, index) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'game-card';
        card.dataset.picture = pictureIndex;
        card.dataset.number = index + 1;
        card.disabled = !playing;

        const image = document.createElement('img');
        image.alt = '';
        image.draggable = false;

        card.append(image);
        showCard(card, false);
        card.addEventListener('click', () => openCard(card));
        field.append(card);
    });
}

function closeCards() {
    showCard(firstCard, false);
    showCard(secondCard, false);
    firstCard = null;
    secondCard = null;
}

function openCard(card) {
    if (!playing || paused || secondCard || card === firstCard) return;

    updateTime();
    if (!playing) return;

    showCard(card, true);

    if (!firstCard) {
        firstCard = card;
        return;
    }

    secondCard = card;
    moves++;
    movesText.textContent = moves;

    if (firstCard.dataset.picture !== secondCard.dataset.picture) {
        closeTimer = setTimeout(closeCards, 800);
        return;
    }

    firstCard.classList.add('is-found');
    secondCard.classList.add('is-found');
    firstCard.disabled = true;
    secondCard.disabled = true;
    firstCard = null;
    secondCard = null;

    pairs++;
    pairsText.textContent = pairs;

    if (pairs === pictures.length) {
        finishGame(`Все пары найдены! Количество ходов — ${moves}.`);
    }
}

function updateTime() {
    timeLeft = Math.max(0, endTime - performance.now());
    timeText.textContent = Math.ceil(timeLeft / 1000);

    if (timeLeft === 0) {
        finishGame(`Время вышло. Найдено пар — ${pairs} из ${pictures.length}.`);
    }
}

function finishGame(result) {
    playing = false;
    clearInterval(timer);
    clearTimeout(closeTimer);

    for (const card of field.children) {
        card.disabled = true;
    }

    pauseButton.disabled = true;
    startButton.textContent = 'Играть ещё раз';
    message.textContent = result;
}

function startGame() {
    clearInterval(timer);
    clearTimeout(closeTimer);

    firstCard = null;
    secondCard = null;
    pairs = 0;
    moves = 0;
    timeLeft = 60000;
    playing = true;
    paused = false;

    pairsText.textContent = pairs;
    movesText.textContent = moves;
    timeText.textContent = 60;
    message.textContent = '';
    startButton.textContent = 'Начать заново';
    pauseButton.textContent = 'Пауза';
    pauseButton.disabled = false;

    createField();
    endTime = performance.now() + timeLeft;
    timer = setInterval(updateTime, 100);
    field.firstElementChild.focus();
}

function togglePause() {
    if (!playing) return;

    if (paused) {
        paused = false;
        endTime = performance.now() + timeLeft;
        timer = setInterval(updateTime, 100);
        pauseButton.textContent = 'Пауза';
        message.textContent = '';
    } else {
        updateTime();
        if (!playing) return;

        paused = true;
        clearInterval(timer);

        if (secondCard) {
            clearTimeout(closeTimer);
            closeCards();
        }

        pauseButton.textContent = 'Продолжить';
        message.textContent = 'Игра на паузе.';
    }

    for (const card of field.children) {
        const found = card.classList.contains('is-found');
        card.disabled = paused || found;
        showCard(card, !paused && (found || card === firstCard));
    }
}

if (field) {
    createField();
    startButton.addEventListener('click', startGame);
    pauseButton.addEventListener('click', togglePause);
}

function initBrush() {
    const button = document.querySelector('.brush-toggle');
    if (!button) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'brush-trail';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mouse = window.matchMedia('(any-pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');


    const trailLength = 90;
    const trailDuration = 550;

    let enabled = true;
    let points = [];
    let frame = 0;

    try {
        enabled = localStorage.getItem('brush-enabled') !== 'off';
    } catch {}

    function resizeCanvas() {
        const scale = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(window.innerWidth * scale);
        canvas.height = Math.round(window.innerHeight * scale);
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        points = [];
    }

    function updateBrush() {
        const active = enabled && mouse.matches;

        document.body.classList.toggle('brush-on', active);
        button.textContent = active ? 'Кисть: вкл' : 'Кисть: выкл';
        button.setAttribute('aria-pressed', String(active));
        button.disabled = !mouse.matches;

        if (!active || reducedMotion.matches) {
            points = [];
            cancelAnimationFrame(frame);
            frame = 0;
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
    }

    function drawTrail(now) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        points = points.filter(point => now - point.time < trailDuration);

        ctx.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent')
        .trim();
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        let lengthLeft = trailLength;

        for (let i = points.length - 1; i > 0 && lengthLeft > 0; i--) {
            const end = points[i];
            const start = points[i - 1];
            const dx = start.x - end.x;
            const dy = start.y - end.y;
            const distance = Math.hypot(dx, dy);

            if (distance === 0) continue;

            const length = Math.min(distance, lengthLeft);
            const fraction = length / distance;
            const age = Math.max(0, now - end.time);

            ctx.globalAlpha = 0.45 * (1 - age / trailDuration) ** 2;
            ctx.beginPath();
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(end.x + dx * fraction, end.y + dy * fraction);
            ctx.stroke();

            lengthLeft -= length;
        }

        ctx.globalAlpha = 1;
        frame = points.length > 0 ? requestAnimationFrame(drawTrail) : 0;
    }

    window.addEventListener('pointermove', event => {
        if (!enabled || event.pointerType !== 'mouse' || reducedMotion.matches) return;

        const now = performance.now();
        const last = points[points.length - 1];

        if (last && now - last.time > 100) {
            points = [];
        }

        points.push({
            x: event.clientX,
            y: event.clientY,
            time: now
        });

        if (!frame) frame = requestAnimationFrame(drawTrail);
    });

    document.documentElement.addEventListener('pointerleave', () => {
        points = [];
    });

    button.addEventListener('click', () => {
        enabled = !enabled;
        updateBrush();

        try {
            localStorage.setItem('brush-enabled', enabled ? 'on' : 'off');
        } catch {}
    });

    window.addEventListener('resize', resizeCanvas);
    mouse.addEventListener('change', updateBrush);
    reducedMotion.addEventListener('change', updateBrush);

    resizeCanvas();
    updateBrush();
}

initBrush();

function initPalette() {
    const button = document.querySelector('.palette-toggle');
    const page = document.documentElement;

    function setPalette(isOlive) {
        page.classList.toggle('olive-palette', isOlive);

        if (button) {
            button.setAttribute('aria-pressed', String(isOlive));
        }
    }

    try {
        setPalette(localStorage.getItem('site-palette') === 'olive');
    } catch {
        setPalette(false);
    }

    if (!button) return;

    button.addEventListener('click', () => {
        const isOlive = !page.classList.contains('olive-palette');
        setPalette(isOlive);

        try {
            localStorage.setItem('site-palette', isOlive ? 'olive' : 'beige');
        } catch {}
    });
}

initPalette();