// app.js - Inicialización general y tema

const App = {
    init() {
        this.initTheme();
        this.initSmoothScroll();
        this.initAnimations();
        this.initPublicStats();
        this.initHeroHueLab();
        this.initModulesCarousel(); // ← nuevo
    },

    async initPublicStats() {
        const facultyEl = document.getElementById('stat-faculties');
        const indicatorsEl = document.getElementById('stat-indicators');
        const flowsEl = document.getElementById('stat-flows');
        const usersEl = document.getElementById('stat-active-users');

        if (!facultyEl || !indicatorsEl || !flowsEl || !usersEl) {
            return;
        }

        try {
            const result = await API.dashboard.getPublicMetrics();
            
            if (!result.success) {
                throw new Error(result.error || 'Error obteniendo stats');
            }

            const data = result.data || {};

            // ✅ Extraer valores con múltiples fallback keys
            const faculties = data.faculties ?? data.facultyCount ?? data.totalFaculties ?? null;
            const indicators = data.indicators ?? data.indicatorsCount ?? data.totalIndicators ?? null;
            const flows = data.flows ?? data.flowsCount ?? data.totalFlows ?? null;
            const activeUsers = data.activeUsers ?? data.usersActive ?? data.activeUsersCount ?? data.users ?? null;

            // Solo actualizar si el valor es válido
            if (Number.isFinite(Number(faculties))) facultyEl.textContent = String(faculties);
            if (Number.isFinite(Number(indicators))) indicatorsEl.textContent = String(indicators);
            if (Number.isFinite(Number(flows))) flowsEl.textContent = String(flows);
            if (Number.isFinite(Number(activeUsers))) usersEl.textContent = String(activeUsers);
            
        } catch (error) {
            console.warn('Stats no disponibles:', error.message);
            // No sobreescribir - dejar los valores del HTML o mostrar guiones
        }
    },
    

    // Tema oscuro/claro
    initTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        const html = document.documentElement;
        
        // Cargar tema guardado
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            html.classList.add('dark');
            html.classList.remove('light');
        } else {
            html.classList.add('light');
            html.classList.remove('dark');
        }
        
        // Toggle
        themeToggle?.addEventListener('click', () => {
            if (html.classList.contains('dark')) {
                html.classList.remove('dark');
                html.classList.add('light');
                localStorage.setItem('theme', 'light');
            } else {
                html.classList.add('dark');
                html.classList.remove('light');
                localStorage.setItem('theme', 'dark');
            }
        });
    },

    // Scroll suave
    initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const target = document.querySelector(targetId);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    },

    // Animaciones de entrada
    initAnimations() {
        // Animar stats cuando son visibles
        const stats = document.querySelectorAll('.text-4xl.font-extrabold');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in-up');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        stats.forEach(stat => observer.observe(stat));
    },

    // Hero dinámico basado en OKLCH
    initHeroHueLab() {
        const hero = document.getElementById('hero-hue');
        const canvas = document.getElementById('wave-canvas');
        const ringSvg = document.getElementById('ring-svg');
        const ringHandle = document.getElementById('ring-handle');
        const hueSegs = document.getElementById('hue-segs');
        const readout = document.getElementById('r-value');
        const fHead = document.getElementById('f-head');
        const fBody = document.getElementById('f-body');
        const slL = document.getElementById('sl-l');
        const slC = document.getElementById('sl-c');
        const lblL = document.getElementById('lbl-l');
        const lblC = document.getElementById('lbl-c');

        if (!hero || !canvas || !ringSvg || !ringHandle || !hueSegs) {
            return;
        }

        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return;
        }

        const RING_CX = 70;
        const RING_CY = 70;
        const RING_R = 52;
        const RING_W = 14;
        const SEGMENTS = 72;
        const SPEED = 1.3;
        const MAX_TRAIL = 640;

        const state = {
            l: slL ? Number(slL.value) / 100 : 0.60,
            c: slC ? Number(slC.value) / 100 : 0.20,
            t: 0,
            dragging: false,
            prevRingAngle: 0,
            arrowTilt: 0
        };

        let autoLightness = true;

        const trail = [];
        const facts = [
            {
                range: [0, 60],
                head: 'RED ZONE',
                body: 'Los rojos mantienen contraste visual estable sin apagarse al subir saturación.'
            },
            {
                range: [60, 120],
                head: 'GOLDEN APEX',
                body: 'Los amarillos no se queman: el color se mantiene legible y equilibrado.'
            },
            {
                range: [120, 180],
                head: 'GREEN SECTOR',
                body: 'Zona de mayor luminosidad percibida, ideal para destacar estados positivos.'
            },
            {
                range: [180, 240],
                head: 'CYAN STRAIGHT',
                body: 'Los cianes suaves funcionan como neutros limpios para interfaces institucionales.'
            },
            {
                range: [240, 300],
                head: 'BLUE CORNER',
                body: 'Azules y rojos pueden convivir con brillo perceptual más balanceado.'
            },
            {
                range: [300, 360],
                head: 'PURPLE CHICANE',
                body: 'Los púrpuras se mantienen controlados sin perder intensidad visual.'
            }
        ];

        const pointFromAngle = (cx, cy, r, deg) => {
            const radians = ((deg - 90) * Math.PI) / 180;
            return {
                x: cx + r * Math.cos(radians),
                y: cy + r * Math.sin(radians)
            };
        };

        const resizeCanvas = () => {
            const heroBox = hero.getBoundingClientRect();
            canvas.width = Math.max(1, Math.floor(heroBox.width));
            canvas.height = Math.max(1, Math.floor(heroBox.height));
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Build hue wheel once
        hueSegs.innerHTML = '';
        for (let i = 0; i < SEGMENTS; i += 1) {
            const angleStart = i * (360 / SEGMENTS);
            const angleEnd = angleStart + 360 / SEGMENTS + 0.7;
            const start = pointFromAngle(RING_CX, RING_CY, RING_R, angleStart - 90);
            const end = pointFromAngle(RING_CX, RING_CY, RING_R, angleEnd - 90);
            const segment = document.createElementNS('http://www.w3.org/2000/svg', 'path');

            segment.setAttribute('d', `M${start.x} ${start.y} A${RING_R} ${RING_R} 0 0 1 ${end.x} ${end.y}`);
            segment.setAttribute('fill', 'none');
            segment.setAttribute('stroke', `oklch(0.65 0.20 ${angleStart})`);
            segment.setAttribute('stroke-width', String(RING_W));
            segment.setAttribute('stroke-linecap', 'butt');

            hueSegs.appendChild(segment);
        }

        const hueFromT = () => {
            const width = canvas.width || window.innerWidth;
            return (((((state.t * SPEED) / width) * 360) % 360) + 360) % 360;
        };

        const updateFact = (hue) => {
            const norm = ((hue % 360) + 360) % 360;
            const found = facts.find((item) => norm >= item.range[0] && norm < item.range[1]) || facts[0];

            if (fHead) {
                fHead.textContent = found.head;
            }

            if (fBody) {
                fBody.textContent = found.body;
            }
        };

        const applyHue = (hue) => {
            hero.style.setProperty('--hue', String(Math.round(hue)));
            hero.style.setProperty('--chroma', state.c.toFixed(3));
            hero.style.setProperty('--l', state.l.toFixed(3));
            if (readout) {
                readout.textContent = `oklch(${state.l.toFixed(2)} ${state.c.toFixed(2)} ${Math.round(hue)})`;
            }

            const ringPoint = pointFromAngle(RING_CX, RING_CY, RING_R, hue - 90);
            ringHandle.setAttribute('cx', String(ringPoint.x));
            ringHandle.setAttribute('cy', String(ringPoint.y));
            ringHandle.setAttribute('stroke', `oklch(0.62 0.22 ${hue})`);

            // Update CTA button color dynamically
            const ctaButton = document.querySelector('.hero-cta');
            if (ctaButton) {
                const buttonColor = `oklch(0.62 0.24 ${Math.round(hue)})`;
                ctaButton.style.backgroundColor = buttonColor;
            }

            const statsSection = document.querySelector('.stats-blur');
            if (statsSection) {
                statsSection.style.setProperty('--stats-hue', String(Math.round(hue)));
                statsSection.style.setProperty('--stats-c', state.c.toFixed(3));
                statsSection.style.setProperty('--stats-l', state.l.toFixed(3));
            }
        };

        const wavePoint = (time) => {
            const width = canvas.width || window.innerWidth;
            const height = canvas.height || window.innerHeight;
            const centerY = height / 2;
            const amp1 = height * 0.20;
            const amp2 = height * 0.06;
            const freq1 = 2.1;
            const freq2 = 4.2;

            const x = ((time * SPEED) % width + width) % width;
            const nx = (x / width) * Math.PI * 2 * freq1;
            const y = centerY + amp1 * Math.sin(nx) + amp2 * Math.sin(nx * (freq2 / freq1) + 0.8);

            const dyDx =
                amp1 * Math.cos(nx) * ((Math.PI * 2 * freq1) / width) +
                amp2 * Math.cos(nx * (freq2 / freq1) + 0.8) * ((Math.PI * 2 * freq2) / width);
            const heading = Math.atan2(dyDx, 1);

            return { x, y, heading };
        };

        const drawTrail = () => {
            if (trail.length < 2) {
                return;
            }

            ctx.save();
            ctx.lineCap = 'round';

            for (let i = 1; i < trail.length; i += 1) {
                const p = trail[i - 1];
                const q = trail[i];

                if (Math.abs(q.x - p.x) > 35) {
                    continue;
                }

                const age = i / trail.length;
                const alpha = age * age * 0.7;
                const lineWidth = (1 - age) * 10 + 2;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
                ctx.strokeStyle = `oklch(${p.l.toFixed(2)} ${(p.c * 1.05).toFixed(3)} ${Math.round(p.hue)} / ${alpha.toFixed(3)})`;
                ctx.lineWidth = lineWidth;
                ctx.stroke();
            }

            ctx.restore();
        };

        const drawArrow = (x, y, hue, tilt) => {
            const strokeColor = `oklch(${Math.max(state.l - 0.18, 0.24).toFixed(2)} ${(state.c * 0.65).toFixed(3)} ${Math.round(hue)})`;
            
            // Get color from hue for dynamic coloring
            const baseColor = `oklch(0.58 0.22 ${Math.round(hue)})`;
            const lightColor = `oklch(0.68 0.20 ${Math.round(hue)})`;
            const glowColor = `oklch(0.75 0.18 ${Math.round(hue)})`;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(tilt);
            ctx.scale(-1, 1); // Flip arrow to point left

            // Arrow body (now left-facing)
            const grad = ctx.createRadialGradient(-3, 0, 1, 3, 0, 16);
            grad.addColorStop(0, glowColor);
            grad.addColorStop(0.45, lightColor);
            grad.addColorStop(1, baseColor);

            ctx.fillStyle = grad;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2.6;
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(-16, 0);
            ctx.lineTo(10, -13);
            ctx.quadraticCurveTo(15, -10, 14, -4);
            ctx.lineTo(21, -4);
            ctx.quadraticCurveTo(24, 0, 21, 4);
            ctx.lineTo(14, 4);
            ctx.quadraticCurveTo(15, 10, 10, 13);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Inner highlight
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(-9, -1);
            ctx.quadraticCurveTo(0, -7, 10, -7);
            ctx.stroke();

            ctx.restore();
        };

        const ringAngleFromPointer = (event) => {
            const rect = ringSvg.getBoundingClientRect();
            const scale = 140 / rect.width;
            const dx = (event.clientX - rect.left) * scale - RING_CX;
            const dy = (event.clientY - rect.top) * scale - RING_CY;
            return Math.atan2(dy, dx);
        };

        const shortestDelta = (a, b) => {
            let delta = b - a;
            while (delta > Math.PI) delta -= Math.PI * 2;
            while (delta < -Math.PI) delta += Math.PI * 2;
            return delta;
        };

        ringSvg.addEventListener('mousedown', (event) => {
            state.dragging = true;
            state.prevRingAngle = ringAngleFromPointer(event);
        });

        window.addEventListener('mousemove', (event) => {
            if (!state.dragging) {
                return;
            }

            const angle = ringAngleFromPointer(event);
            const delta = shortestDelta(state.prevRingAngle, angle);
            const framesPerTurn = (canvas.width || window.innerWidth) / SPEED;
            state.t += (delta / (Math.PI * 2)) * framesPerTurn;
            state.prevRingAngle = angle;
        });

        window.addEventListener('mouseup', () => {
            state.dragging = false;
        });

        if (slL && lblL) {
            slL.addEventListener('input', () => {
                autoLightness = false;
                state.l = Number(slL.value) / 100;
                lblL.textContent = state.l.toFixed(2);
            });
        }

        if (slC && lblC) {
            slC.addEventListener('input', () => {
                state.c = Number(slC.value) / 100;
                lblC.textContent = state.c.toFixed(2);
            });
        }

        const frame = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (autoLightness) {
                // Brillo automático suave para no depender de controles visibles.
                state.l = 0.58 + Math.sin(state.t * 0.012) * 0.12;
            }

            const hue = hueFromT();
            const point = wavePoint(state.t);

            trail.push({
                x: point.x,
                y: point.y,
                hue,
                l: state.l,
                c: state.c
            });

            if (trail.length > MAX_TRAIL) {
                trail.shift();
            }

            const targetTilt = Math.max(-0.55, Math.min(0.55, point.heading * 2.4));
            state.arrowTilt += (targetTilt - state.arrowTilt) * 0.18;

            drawTrail();
            drawArrow(point.x, point.y, hue, state.arrowTilt);
            updateFact(hue);
            applyHue(hue);

            if (lblL) {
                lblL.textContent = state.l.toFixed(2);
            }

            if (lblC) {
                lblC.textContent = state.c.toFixed(2);
            }

            if (!state.dragging) {
                state.t += 1;
            }

            requestAnimationFrame(frame);
        };

        applyHue(hueFromT());
        requestAnimationFrame(frame);
    },

// Carrusel de Módulos de Encuestas
    initModulesCarousel() {
        const viewport = document.getElementById('modules-carousel-viewport');
        const track = document.getElementById('modules-carousel-track');
        const dotsContainer = document.getElementById('modules-carousel-dots');
        const prevBtn = document.getElementById('carousel-prev');
        const nextBtn = document.getElementById('carousel-next');

        if (!viewport || !track || !dotsContainer) {
            return;
        }

        const slides = Array.from(track.children);
        const intervalMs = 4000;
        let currentIndex = 0;
        let slidesPerView = getSlidesPerView();
        let autoplayTimer = null;

        function getSlidesPerView() {
            const width = window.innerWidth;
            if (width >= 1024) return 3; // lg
            if (width >= 640) return 2;  // sm
            return 1;
        }

        function maxIndex() {
            return Math.max(0, slides.length - slidesPerView);
        }

        function buildDots() {
            dotsContainer.innerHTML = '';
            const totalDots = maxIndex() + 1;
            for (let i = 0; i < totalDots; i += 1) {
                const dot = document.createElement('button');
                dot.setAttribute('aria-label', `Ir a la diapositiva ${i + 1}`);
                dot.className = 'w-3 h-3 rounded-full transition-colors ' +
                    (i === currentIndex ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600 hover:bg-primary/50');
                dot.addEventListener('click', () => {
                    goToSlide(i);
                    restartAutoplay();
                });
                dotsContainer.appendChild(dot);
            }
        }

        function updateDots() {
            Array.from(dotsContainer.children).forEach((dot, i) => {
                dot.classList.toggle('bg-primary', i === currentIndex);
                dot.classList.toggle('bg-slate-300', i !== currentIndex);
                dot.classList.toggle('dark:bg-slate-600', i !== currentIndex);
            });
        }

        function goToSlide(index) {
            currentIndex = Math.max(0, Math.min(index, maxIndex()));
            const slideWidth = slides[0].getBoundingClientRect().width; // ya incluye el padding
            const offset = currentIndex * slideWidth;
            track.style.transform = `translateX(-${offset}px)`;
            updateDots();
        }

        function nextSlide() {
            const next = currentIndex >= maxIndex() ? 0 : currentIndex + 1;
            goToSlide(next);
        }

        function prevSlide() {
            const prev = currentIndex <= 0 ? maxIndex() : currentIndex - 1;
            goToSlide(prev);
        }

        function startAutoplay() {
            stopAutoplay();
            autoplayTimer = setInterval(nextSlide, intervalMs);
        }

        function stopAutoplay() {
            if (autoplayTimer) clearInterval(autoplayTimer);
        }

        function restartAutoplay() {
            startAutoplay();
        }

        prevBtn?.addEventListener('click', () => {
            prevSlide();
            restartAutoplay();
        });

        nextBtn?.addEventListener('click', () => {
            nextSlide();
            restartAutoplay();
        });

        viewport.addEventListener('mouseenter', stopAutoplay);
        viewport.addEventListener('mouseleave', startAutoplay);

        window.addEventListener('resize', () => {
            slidesPerView = getSlidesPerView();
            buildDots();
            goToSlide(Math.min(currentIndex, maxIndex()));
        });

        buildDots();
        goToSlide(0);
        startAutoplay();
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => App.init());