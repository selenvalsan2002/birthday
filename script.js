/* ═══════════════════════════════════════════════════════
   ROMANTIC BIRTHDAY SURPRISE — script.js
   Handles: PIN auth, screen transitions, audio, cake
   countdown, video reveal, and floating particles.
═══════════════════════════════════════════════════════ */

'use strict';

/* ─── CONFIG ──────────────────────────────────────── */
const CORRECT_PIN = '1763'; // ← Change the PIN here

/* ─── DOM REFERENCES ──────────────────────────────── */
const screens = {
  lock:    document.getElementById('screen-lock'),
  loading: document.getElementById('screen-loading'),
  cake:    document.getElementById('screen-cake'),
  reveal:  document.getElementById('screen-reveal'),
};

const bgMusic       = document.getElementById('bg-music');
const pinDots       = document.querySelectorAll('.dot');
const pinError      = document.getElementById('pin-error');
const keypad        = document.getElementById('keypad');

const btnBlow       = document.getElementById('btn-blow');
const countdownWrap = document.getElementById('countdown-display');
const countdownNum  = document.getElementById('countdown-number');
const flamesEl      = document.getElementById('flames');
const videoContainer = document.getElementById('video-container');
const birthdayVideo  = document.getElementById('birthday-video');
const btnProceed    = document.getElementById('btn-proceed');

/* ─── STATE ───────────────────────────────────────── */
let currentPin = []; // Stores entered digits

/* ═══════════════════════════════════════════════════
   SECTION 1: PARTICLE CANVAS (Ambient floating hearts)
═══════════════════════════════════════════════════ */
(function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  const ctx    = canvas.getContext('2d');
  let particles = [];

  // Resize canvas to fill screen
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Particle class
  class Particle {
    constructor() { this.reset(true); }

    reset(initial = false) {
      this.x    = Math.random() * canvas.width;
      this.y    = initial ? Math.random() * canvas.height : canvas.height + 20;
      this.size = Math.random() * 10 + 6;
      this.speedY = -(Math.random() * 0.5 + 0.2);
      this.speedX = (Math.random() - 0.5) * 0.4;
      this.opacity = Math.random() * 0.35 + 0.1;
      this.symbol = Math.random() > 0.4 ? '♥' : '✦';
      this.color  = Math.random() > 0.5
        ? `rgba(201,168,76,${this.opacity})`
        : `rgba(244,167,185,${this.opacity})`;
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX;
      if (this.y < -20) this.reset();
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle   = this.color;
      ctx.font        = `${this.size}px serif`;
      ctx.textAlign   = 'center';
      ctx.fillText(this.symbol, this.x, this.y);
      ctx.restore();
    }
  }

  // Create initial particles
  for (let i = 0; i < 40; i++) {
    particles.push(new Particle());
  }

  // Animation loop
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }
  animate();
})();


/* ═══════════════════════════════════════════════════
   SECTION 2: SCREEN TRANSITION HELPERS
═══════════════════════════════════════════════════ */

/**
 * showScreen(name)
 * Fades out the current screen and fades in the target one.
 * @param {string} name - One of 'lock' | 'loading' | 'cake' | 'reveal'
 */
function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    if (key === name) {
      el.classList.remove('hidden', 'fade-out');
      el.classList.add('active');
      // Enable body scroll for the reveal screen
      if (key === 'reveal') document.body.classList.add('scrollable');
    } else {
      el.classList.add('fade-out');
      setTimeout(() => {
        el.classList.add('hidden');
        el.classList.remove('active', 'fade-out');
      }, 400);
    }
  });
}


/* ═══════════════════════════════════════════════════
   SECTION 3: LOCK SCREEN — PIN LOGIC
═══════════════════════════════════════════════════ */

/**
 * updateDots()
 * Fills PIN indicator dots based on current entry length.
 */
function updateDots() {
  pinDots.forEach((dot, i) => {
    dot.classList.remove('error');
    if (i < currentPin.length) {
      dot.classList.add('filled');
    } else {
      dot.classList.remove('filled');
    }
  });
}

/**
 * showPinError()
 * Briefly shows the error message and shakes the dots.
 */
function showPinError() {
  pinDots.forEach(dot => {
    dot.classList.remove('filled');
    dot.classList.add('error');
  });
  pinError.classList.remove('hidden');

  // Clear after a short delay
  setTimeout(() => {
    currentPin = [];
    pinError.classList.add('hidden');
    pinDots.forEach(dot => dot.classList.remove('error', 'filled'));
  }, 1400);
}

/**
 * handleKeyPress(value)
 * Core PIN input handler.
 * @param {string} value - '0'-'9', 'back', or 'go'
 */
function handleKeyPress(value) {
  if (value === 'back') {
    // Remove last digit
    currentPin.pop();
    updateDots();
    return;
  }

  if (value === 'go') {
    // Manual submit
    checkPin();
    return;
  }

  // Regular digit (0–9)
  if (currentPin.length < 4) {
    currentPin.push(value);
    updateDots();

    // Auto-submit once 4 digits are entered
    if (currentPin.length === 4) {
      setTimeout(checkPin, 200); // tiny delay feels natural
    }
  }
}

/**
 * checkPin()
 * Validates the entered PIN and transitions if correct.
 */
function checkPin() {
  const entered = currentPin.join('');
  if (entered === CORRECT_PIN) {
    bgMusic.volume = 0.55;
    bgMusic.play().then(() => {
      console.log('Music playing!');
    }).catch(err => {
      console.warn('Music blocked:', err);
    });
    transitionToLoading();
  } else {
    showPinError();
  }
}
// Attach keypad click listener (event delegation)
keypad.addEventListener('click', (e) => {
  const key = e.target.closest('.key');
  if (!key) return;
  handleKeyPress(key.dataset.value);
});


/* ═══════════════════════════════════════════════════
   SECTION 4: AUDIO
═══════════════════════════════════════════════════ */

/**
 * startMusic()
 * Plays the background music. Browsers require user interaction
 * before audio can start — this is called right after PIN entry.
 */
function startMusic() {
  if (!bgMusic.src || bgMusic.src.endsWith('undefined')) return;
  bgMusic.volume = 0.55;
  
  // Resume audio context if suspended
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  bgMusic.play().then(() => {
    console.log('Music started successfully!');
  }).catch(err => {
    console.warn('Audio autoplay blocked:', err);
    // Try again after small delay
    setTimeout(() => {
      bgMusic.play().catch(e => console.warn('Second attempt failed:', e));
    }, 500);
  });
}


/* ═══════════════════════════════════════════════════
   SECTION 5: LOADING SCREEN TIMER
═══════════════════════════════════════════════════ */

/**
 * transitionToLoading()
 * Shows the loading screen for 3 seconds, then moves to cake.
 */
function transitionToLoading() {
  showScreen('loading');

  setTimeout(() => {
    transitionToCake();
  }, 3000); // 3-second loading screen
}

/**
 * transitionToCake()
 * Moves to the interactive cake screen.
 */
function transitionToCake() {
  showScreen('cake');
}


/* ═══════════════════════════════════════════════════
   SECTION 6: CAKE SCREEN — BLOW CANDLES + COUNTDOWN
═══════════════════════════════════════════════════ */

/**
 * startCountdown()
 * Hides the Blow button, shows 3→2→1 countdown,
 * then triggers the candle blow-out and video reveal.
 */
function startCountdown() {
  btnBlow.classList.add('hidden');
  countdownWrap.classList.remove('hidden');

  let count = 3;
  countdownNum.textContent = count;

  const timer = setInterval(() => {
    count--;

    if (count > 0) {
      // Update number with pop animation
      countdownNum.textContent = count;
      countdownNum.style.animation = 'none';
      void countdownNum.offsetWidth; // reflow trick to restart CSS animation
      countdownNum.style.animation = 'count-pop 0.3s ease';
    } else {
      // Count reached 0 — blow out candles!
      clearInterval(timer);
      countdownWrap.classList.add('hidden');
      blowOutCandles();
    }
  }, 1000);
}

/**
 * blowOutCandles()
 * Visually extinguishes flames and fades in the video.
 */
function blowOutCandles() {
  // Animate flames out
  flamesEl.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  flamesEl.style.opacity    = '0';
  flamesEl.style.transform  = 'scale(0) translateY(-20px)';

  // After flames vanish, reveal the video
  setTimeout(() => {
    flamesEl.classList.add('hidden');
    revealVideo();
  }, 550);
}

/**
 * revealVideo()
 * Fades in the video container smoothly.
 */
function revealVideo() {
  const vc = document.getElementById('video-container');
  const vid = document.getElementById('birthday-video');
  
  vc.classList.remove('hidden');
  vc.style.display = 'flex';
  vc.style.opacity = '0';
  
  setTimeout(() => {
    vc.style.opacity = '1';
    vid.load();
  }, 200);

  vid.addEventListener('play', () => {
    bgMusic.pause();
  });

  vid.addEventListener('pause', () => {
    bgMusic.play().catch(err => {
      console.warn('Music resume blocked:', err);
    });
  });

  vid.addEventListener('ended', () => {
    bgMusic.play().catch(err => {
      console.warn('Music resume blocked:', err);
    });
    showProceedButton();
  });

  setTimeout(showProceedButton, 180000);
}

/**
 * showProceedButton()
 * Reveals the button to move to Screen 4.
 */
function showProceedButton() {
  btnProceed.classList.remove('hidden');
}

// Blow Candles button handler
btnBlow.addEventListener('click', startCountdown);

// "See My Message" button handler
btnProceed.addEventListener('click', () => {
  birthdayVideo.pause();
  transitionToReveal();
});


/* ═══════════════════════════════════════════════════
   SECTION 7: FINAL REVEAL SCREEN
═══════════════════════════════════════════════════ */

/**
 * transitionToReveal()
 * Transitions to the final birthday message screen.
 */
function transitionToReveal() {
  showScreen('reveal');

  // Stagger-animate the photo grid cells
  setTimeout(() => {
    const cells = document.querySelectorAll('.photo-cell');
    cells.forEach((cell, i) => {
      cell.style.opacity   = '0';
      cell.style.transform = 'scale(0.85)';
      cell.style.transition = `opacity 0.4s ${i * 0.06}s ease, transform 0.4s ${i * 0.06}s ease`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cell.style.opacity   = '1';
          cell.style.transform = 'scale(1)';
        });
      });
    });
  }, 300);
}


/* ═══════════════════════════════════════════════════
   SECTION 8: TOUCH / SWIPE PREVENTION
   Prevents accidental browser pull-to-refresh on mobile.
═══════════════════════════════════════════════════ */
document.addEventListener('touchmove', (e) => {
  // Only prevent on non-scrollable screens
  const activeScreen = document.querySelector('.screen.active');
  if (activeScreen && activeScreen.id !== 'screen-reveal' && activeScreen.id !== 'screen-cake') {
    e.preventDefault();
  }
}, { passive: false });


/* ═══════════════════════════════════════════════════
   SECTION 9: INIT
═══════════════════════════════════════════════════ */
// Lock screen is active by default (set in HTML).
// Nothing else to initialise — the app is ready.
console.log('🎂 Birthday surprise app loaded. Awaiting PIN entry...');
/* ── BACKGROUND SLIDESHOW WITH SHUFFLE ─────────── */
function startBgSlideshow() {
  const slides = Array.from(document.querySelectorAll('.bg-slide'));
  let current = 0;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const images = shuffle([
    'bg1.jpg',
    'bg2.jpg',
    'bg3.jpg',
    'bg4.jpg',
    'bg5.jpg',
    'bg6.jpg',
    'bg7.jpg',
    'bg8.jpg',
    'bg9.jpg',
    'bg10.jpg',
    'bg11.jpg'
  ]);

  slides.forEach((slide, i) => {
    slide.style.backgroundImage = `url('${images[i]}')`;
  });

  slides[0].classList.add('active');

  setInterval(() => {
    slides[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
  }, 5000);
}

startBgSlideshow();
/* ── LOVE TIMER ─────────────────────────────────── */
function startLoveTimer() {
  const startDate = new Date('2024-12-05T00:00:00');

  function update() {
    const now = new Date();
    const diff = now - startDate;

    const years   = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    const months  = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
    const days    = Math.floor((diff % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('t-years').textContent   = years;
    document.getElementById('t-months').textContent  = months;
    document.getElementById('t-days').textContent    = days;
    document.getElementById('t-hours').textContent   = hours;
    document.getElementById('t-minutes').textContent = minutes;
    document.getElementById('t-seconds').textContent = seconds;
  }

  update();
  setInterval(update, 1000);
}

const timerObserver = new MutationObserver(() => {
  if (!screens.reveal.classList.contains('hidden')) {
    startLoveTimer();
    timerObserver.disconnect();
  }
});
timerObserver.observe(screens.reveal, { attributes: true });
