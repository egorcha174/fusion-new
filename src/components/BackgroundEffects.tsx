
import React, { useMemo, useRef, useEffect } from 'react';
import { useAppStore, BackgroundEffectType } from '../store/appStore';
import { applyOpacity } from '../utils/themeUtils';
import { nanoid } from 'nanoid';

interface BackgroundEffectsProps {
    effect: BackgroundEffectType;
    isDark?: boolean;
}

// Helper for generating colors
const hexToRgba = (hex: string, alpha: number) => applyOpacity(hex, alpha);

const SnowEffect = () => {
    const snowflakes = useMemo(() => {
        return Array.from({ length: 150 }).map((_, i) => {
            const size = Math.random() * 5 + 2;
            const xStart = Math.random() * 100;
            const xEnd = xStart + (Math.random() - 0.5) * 50;
            const duration = Math.random() * 10 + 10;
            const delay = Math.random() * -20;
            const rotate = (Math.random() - 0.5) * 720;
            const finalOpacity = Math.random() * 0.5 + 0.3;

            return {
                id: i,
                style: {
                    '--size': `${size}px`,
                    '--x-start': `${xStart}vw`,
                    '--x-end': `${xEnd}vw`,
                    '--rotate': `${rotate}deg`,
                    '--opacity': finalOpacity,
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                    filter: `blur(${size > 4 ? 1 : 0}px)`,
                },
            };
        });
    }, []);

    return (
        <>
            {snowflakes.map(flake => (
                <div key={flake.id} className="snowflake" style={flake.style as React.CSSProperties} />
            ))}
            <div className="absolute bottom-0 left-0 w-full h-[100px] overflow-hidden pointer-events-none">
                <div className="absolute -bottom-16 -left-[5%] w-[110%] h-32 bg-white/80 dark:bg-gray-100/10 rounded-[50%] opacity-80" style={{ filter: 'blur(5px)' }} />
                <div className="absolute -bottom-20 left-[20%] w-[80%] h-32 bg-white/70 dark:bg-gray-100/5 rounded-[50%] opacity-70" style={{ filter: 'blur(8px)' }} />
                <div className="absolute -bottom-12 right-[30%] w-[60%] h-24 bg-white/90 dark:bg-gray-100/15 rounded-[50%]" style={{ filter: 'blur(3px)' }} />
            </div>
        </>
    );
};

const RainEffect = ({ zIndexOverride }: { zIndexOverride?: number } = {}) => {
    // 1. Падающие капли дождя (фон)
    const raindrops = useMemo(() => {
        return Array.from({ length: 100 }).map((_, i) => {
            const size = Math.random() * 15 + 10; // height of raindrop
            const xStart = Math.random() * 100;
            const duration = Math.random() * 0.5 + 0.5; // 0.5s to 1s
            const delay = Math.random() * -2; 
            const opacity = Math.random() * 0.3 + 0.1;

            return {
                id: i,
                style: {
                    '--size': `${size}px`,
                    '--x-start': `${xStart}vw`,
                    '--opacity': opacity,
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                    zIndex: zIndexOverride || undefined,
                },
            };
        });
    }, [zIndexOverride]);

    // 2. Капли на стекле (передний план)
    const glassDrops = useMemo(() => {
        return Array.from({ length: 20 }).map((_, i) => {
            const width = Math.random() * 4 + 3; // 3-7px
            const height = width * 1.2;
            const x = Math.random() * 100; // vw
            const duration = Math.random() * 4 + 2; // 2-6s time to slide down
            const delay = Math.random() * 15; // Random start delay

            return {
                id: i,
                style: {
                    left: `${x}vw`,
                    '--width': `${width}px`,
                    '--height': `${height}px`,
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                    zIndex: zIndexOverride ? zIndexOverride + 10 : undefined,
                },
            };
        });
    }, [zIndexOverride]);

    return (
        <>
            {raindrops.map(drop => (
                <div key={`rain-${drop.id}`} className="raindrop" style={drop.style as React.CSSProperties} />
            ))}
            {glassDrops.map(drop => (
                <div key={`glass-${drop.id}`} className="glass-drop" style={drop.style as React.CSSProperties} />
            ))}
        </>
    );
};

const LeavesEffect = () => {
    const leaves = useMemo(() => {
        const colors = ['#e6a04d', '#d65d45', '#e8c658', '#8B4513'];
        const shapes = [
            // Birch/Simple (Teardrop)
            "M50 5 Q30 40 10 55 Q5 70 25 95 L50 95 L75 95 Q95 70 90 55 Q70 40 50 5 Z", 
            // Oak (Lobed)
            "M50 10 Q35 15 35 30 Q20 35 20 50 Q20 65 35 70 Q35 85 50 95 Q65 85 65 70 Q80 65 80 50 Q80 35 65 30 Q65 15 50 10 Z", 
            // Maple (Spiky)
            "M50 0 L35 30 L10 30 L30 50 L20 80 L50 65 L80 80 L70 50 L90 30 L65 30 Z"
        ];

        return Array.from({ length: 35 }).map((_, i) => {
            const size = Math.random() * 15 + 20; // Increase size slightly for visibility
            const xStart = Math.random() * 100;
            const xEnd = xStart + (Math.random() - 0.5) * 40;
            const duration = Math.random() * 5 + 5; // 5-10s
            const delay = Math.random() * -10;
            const rotate = (Math.random() - 0.5) * 360;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const path = shapes[Math.floor(Math.random() * shapes.length)];

            return {
                id: i,
                path,
                style: {
                    '--size': `${size}px`,
                    '--x-start': `${xStart}vw`,
                    '--x-end': `${xEnd}vw`,
                    '--rotate': `${rotate}deg`,
                    '--color': color,
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                },
            };
        });
    }, []);

    return (
        <>
            {leaves.map(leaf => (
                <div 
                    key={leaf.id} 
                    className="leaf" 
                    style={{
                        ...leaf.style as React.CSSProperties,
                        backgroundColor: 'transparent', // Override generic leaf style
                        borderRadius: 0, // Override generic leaf style
                    }}
                >
                    <svg 
                        viewBox="0 0 100 100" 
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            fill: 'var(--color)',
                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'
                        }}
                    >
                        <path d={leaf.path} />
                    </svg>
                </div>
            ))}
        </>
    );
};

const CloudShape = React.memo(({ width, height, color, seed }: { width: number, height: number, color: string, seed: number }) => {
    const { circles, gradientId, morphDuration, morphDelay, pulseDuration } = useMemo(() => {
        // Pseudo-random generator based on seed
        const random = (offset: number) => {
            const x = Math.sin(seed * 43758.5453 + offset * 12.9898) * 10000;
            return x - Math.floor(x);
        };

        const c = [];
        
        const blobCount = 4 + Math.floor(random(0) * 3); // 4 to 6 main blobs
        
        for (let i = 0; i < blobCount; i++) {
            const cx = width * (0.2 + random(i + 1) * 0.6);
            const cy = height * (0.3 + random(i + 2) * 0.4);
            const r = width * (0.15 + random(i + 3) * 0.25);
            c.push({ cx, cy, r });
        }

        const fluffCount = 15 + Math.floor(random(4) * 15); // 15 to 30 fluff circles
        
        for (let i = 0; i < fluffCount; i++) {
            const parentBlob = c[Math.floor(random(i + 10) * blobCount)];
            const angle = random(i + 20) * Math.PI * 2;
            const dist = parentBlob.r * (0.5 + random(i + 30) * 0.5);
            
            const cx = parentBlob.cx + Math.cos(angle) * dist;
            const cy = parentBlob.cy + Math.sin(angle) * dist;
            const r = width * (0.08 + random(i + 40) * 0.12);

            c.push({ cx, cy, r });
        }

        const gId = `cloudGrad-${Math.floor(seed * 10000)}-${nanoid(4)}`;
        
        const mDuration = 20 + random(10) * 20; // 20-40s for morphing
        const mDelay = random(11) * -20;
        const pDuration = 30 + random(12) * 15; // 30-45s for pulsing

        return { circles: c, gradientId: gId, morphDuration: mDuration, morphDelay: mDelay, pulseDuration: pDuration };
    }, [width, height, seed, color]);

    return (
        <svg 
            viewBox={`0 0 ${width} ${height}`} 
            style={{ 
                width: '100%', 
                height: '100%', 
                overflow: 'visible',
                animation: `cloud-pulse ${pulseDuration}s ease-in-out infinite`
            }}
        >
            <defs>
                <radialGradient id={gradientId} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                    <stop offset="40%" stopColor={color} stopOpacity="0.8" />
                    <stop offset="70%" stopColor={color} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </radialGradient>
            </defs>
            <g 
                style={{ 
                    animation: `cloud-morph ${morphDuration}s infinite ease-in-out alternate`, 
                    animationDelay: `${morphDelay}s`,
                    transformOrigin: 'center'
                }}
            >
                {circles.map((item, i) => (
                    <circle key={i} cx={item.cx} cy={item.cy} r={item.r} fill={`url(#${gradientId})`} />
                ))}
            </g>
        </svg>
    );
});

const StrongCloudyEffect = ({ dark = false }: { dark?: boolean } = {}) => {
    const clouds = useMemo(() => {
        // Palette selection
        const defaultColors = ['#94a3b8', '#cbd5e1', '#64748b', '#e2e8f0', '#bfdbfe', '#dbeafe'];
        const darkColors = ['#475569', '#64748b', '#334155', '#94a3b8', '#52525b', '#71717a'];
        const colors = dark ? darkColors : defaultColors;

        return Array.from({ length: 20 }).map((_, i) => {
            const scale = 0.6 + Math.random() * 1.6;
            const aspectRatio = 1.3 + Math.random() * 0.6; 
            const width = 250 * scale * (0.9 + Math.random() * 0.2);
            const height = width / aspectRatio;
            
            const top = Math.random() * 70 - 15; 
            const duration = 80 + Math.random() * 80; 
            const delay = Math.random() * -200;
            const baseOpacity = 0.5 + Math.random() * 0.4; 
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const zIndex = Math.floor(scale * 2); 

            const parallaxDuration = duration / scale; 
            
            const shapeSeed = Math.random() * 100000;

            return {
                id: i,
                style: {
                    '--width': `${width}px`,
                    '--height': `${height}px`,
                    '--top': `${top}vh`,
                    '--opacity': baseOpacity,
                    zIndex: zIndex, 
                    animationDuration: `${parallaxDuration}s`,
                    animationDelay: `${delay}s`,
                    filter: scale < 1.0 ? 'blur(3px)' : 'blur(1px)',
                },
                width,
                height,
                color,
                shapeSeed
            };
        });
    }, [dark]);

    return (
        <>
            <style>{`
                @keyframes cloud-morph {
                    0% { transform: scale(1) skewX(0deg); }
                    33% { transform: scale(1.05, 0.95) skewX(3deg); }
                    66% { transform: scale(0.95, 1.05) skewX(-2deg); }
                    100% { transform: scale(1.02, 0.98) skewX(1deg); }
                }
                @keyframes cloud-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
            {clouds.map((cloud) => (
                <div 
                    key={cloud.id} 
                    className="cloud" 
                    style={{
                        ...cloud.style as React.CSSProperties,
                        animationName: 'cloud-drift'
                    }}
                >
                    <CloudShape width={cloud.width} height={cloud.height} color={cloud.color} seed={cloud.shapeSeed} />
                </div>
            ))}
        </>
    );
};

const RiverEffect = () => {
    return (
        <div className="absolute bottom-0 left-0 w-full h-[200px] overflow-hidden pointer-events-none">
             <svg className="absolute bottom-0 left-0 w-[200%] h-full" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ animation: 'wave-move-1 20s linear infinite' }}>
                <path fill="#0099ff" fillOpacity="0.2" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
            </svg>
            <svg className="absolute bottom-0 -left-[50%] w-[200%] h-full" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ animation: 'wave-move-2 15s linear infinite', opacity: 0.6 }}>
                <path fill="#0099ff" fillOpacity="0.4" d="M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,213.3C672,192,768,128,864,128C960,128,1056,192,1152,208C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
            </svg>
        </div>
    );
};

const AuroraEffect = () => {
    const auroraSettings = useAppStore(state => state.auroraSettings);
    const { color1, color2, color3, speed, intensity, blur, saturate, starsEnabled, starsSpeed } = auroraSettings;

    const containerStyle = {
        '--c1-mid': hexToRgba(color1, 0.12),
        '--c2-mid': hexToRgba(color2, 0.18),
        '--c3-mid': hexToRgba(color3, 0.10),
        '--c1-transparent': hexToRgba(color1, 0.0),
        '--c3-transparent': hexToRgba(color3, 0.0),
        '--global-blur': `${blur}px`,
        '--global-saturate': `${saturate}%`,
        '--speed-1': `${speed}s`,
        '--speed-2': `${Math.round(speed * 1.2)}s`,
        '--speed-3': `${Math.round(speed * 1.4)}s`,
        '--speed-4': `${Math.round(speed * 1.1)}s`,
        '--band-opacity': Math.max(0.3, Math.min(1.2, intensity / 100)),
        '--stars-speed': `${starsSpeed}s`,
        '--stars-opacity': starsEnabled ? 0.9 : 0,
    };

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-[5] aurora-scene" style={containerStyle as React.CSSProperties}>
            <div className="absolute inset-0 aurora-stars" />
            
            <div className="absolute left-[-20%] right-[-20%] h-[60%] top-[10%] aurora-layer pointer-events-none">
                <div className="absolute left-0 right-0 h-full aurora-band b1" />
                <div className="absolute left-0 right-0 h-full aurora-band b2" />
                <div className="absolute left-0 right-0 h-full aurora-band b3" />
                <div className="absolute left-0 right-0 h-full aurora-band b4" />
                <div className="absolute inset-0 aurora-noise" />
            </div>
            
            {/* Horizon gradient for blending */}
            <div className="absolute left-0 right-0 bottom-0 h-[22%] bg-gradient-to-b from-transparent via-black/60 to-black pointer-events-none" />
        </div>
    );
};

const TronEffect = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        class TronLine {
            x: number;
            y: number;
            speed: number;
            color: string;
            dir: "h" | "v";
            vx: number;
            vy: number;
            trail: { x: number; y: number }[];
            turnCooldown: number;
            alive: boolean;

            constructor() {
                this.x = 0;
                this.y = 0;
                this.speed = 0;
                this.color = '';
                this.dir = 'h';
                this.vx = 0;
                this.vy = 0;
                this.trail = [];
                this.turnCooldown = 0;
                this.alive = false;
                this.initialize();
            }

            initialize() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.speed = 2 + Math.random() * 2;
                this.color = `hsl(${Math.random() * 360}, 100%, 60%)`;
                this.dir = Math.random() < 0.5 ? "h" : "v";
                this.vx = this.dir === "h" ? (Math.random() < 0.5 ? this.speed : -this.speed) : 0;
                this.vy = this.dir === "v" ? (Math.random() < 0.5 ? this.speed : -this.speed) : 0;
                this.trail = [];
                this.turnCooldown = 50 + Math.random() * 150;
                this.alive = true;
            }

            update() {
                if (!this.alive) return;
                this.trail.push({ x: this.x, y: this.y });
                if (this.trail.length > 100) this.trail.shift();

                this.x += this.vx;
                this.y += this.vy;

                if (Math.random() < 0.01 && this.turnCooldown <= 0) {
                    this.turnCooldown = 50 + Math.random() * 150;
                    if (this.vx !== 0) {
                        this.vy = (Math.random() < 0.5 ? 1 : -1) * Math.abs(this.vx);
                        this.vx = 0;
                    } else {
                        this.vx = (Math.random() < 0.5 ? 1 : -1) * Math.abs(this.vy);
                        this.vy = 0;
                    }
                } else {
                    this.turnCooldown--;
                }

                if (this.x < 0) this.x = canvas.width;
                if (this.x > canvas.width) this.x = 0;
                if (this.y < 0) this.y = canvas.height;
                if (this.y > canvas.height) this.y = 0;
            }

            draw(ctx: CanvasRenderingContext2D) {
                if (!this.alive) return;
                ctx.beginPath();
                for (let i = 0; i < this.trail.length - 1; i++) {
                    const p1 = this.trail[i];
                    const p2 = this.trail[i + 1];
                    const alpha = i / this.trail.length;
                    ctx.strokeStyle = this.color;
                    ctx.globalAlpha = alpha;
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                }
                ctx.lineWidth = 2;
                ctx.shadowBlur = 15;
                ctx.shadowColor = this.color;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            
            intersects(other: TronLine) {
                if (!this.alive || !other.alive) return false;
                return Math.abs(this.x - other.x) < 3 && Math.abs(this.y - other.y) < 3;
            }
        }
        
        const lines: TronLine[] = [];
        for (let i = 0; i < 25; i++) lines.push(new TronLine());
        
        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            for (let line of lines) line.update();
            
            const deadPairs = new Set<number>();
            for (let i = 0; i < lines.length; i++) {
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[i].intersects(lines[j])) {
                        deadPairs.add(i);
                        deadPairs.add(j);
                    }
                }
            }
            
            for (let i of deadPairs) {
                const line = lines[i];
                if (line && line.alive) {
                    line.alive = false;
                    setTimeout(() => line.initialize(), 800);
                }
            }
            
            for (let line of lines) line.draw(ctx);
            
            animationFrameId.current = requestAnimationFrame(animate);
        };
        
        animate();

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            if (animationFrameId.current !== null) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, []);

    return <canvas ref={canvasRef} style={{ display: 'block', background: 'black' }} />;
};

const LightningFlash = () => (
    <>
        <style>{`
            @keyframes lightning {
                0%, 92%, 100% { opacity: 0; }
                93% { opacity: 0.6; }
                94% { opacity: 0.2; }
                96% { opacity: 0.8; }
                98% { opacity: 0; }
            }
        `}</style>
        <div 
            className="absolute inset-0 bg-white pointer-events-none z-20 mix-blend-overlay"
            style={{ animation: 'lightning 7s infinite' }}
        />
    </>
);

const SunGlareEffect = () => (
    <>
        <style>{`
            @keyframes sun-spin { 
                from { transform: rotate(0deg); } 
                to { transform: rotate(360deg); } 
            }
            @keyframes flare-float {
                0% { transform: translate(0, 0); opacity: 0.3; }
                50% { transform: translate(10px, -15px); opacity: 0.5; }
                100% { transform: translate(0, 0); opacity: 0.3; }
            }
        `}</style>
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-[5]">
            <div className="absolute -top-[10vw] -right-[10vw] w-[60vw] h-[60vw] bg-yellow-100/20 rounded-full blur-[80px]" />
            <div className="absolute -top-[5vw] -right-[5vw] w-[30vw] h-[30vw] bg-orange-200/30 rounded-full blur-[50px]" />
            <div 
                className="absolute -top-[50vw] -right-[50vw] w-[200vw] h-[200vw] opacity-20 mix-blend-overlay"
                style={{ 
                    animation: 'sun-spin 120s linear infinite',
                    background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255, 223, 150, 0.3) 10deg, transparent 20deg, transparent 40deg, rgba(255, 255, 255, 0.2) 50deg, transparent 60deg, transparent 90deg, rgba(255, 200, 100, 0.1) 100deg, transparent 120deg)' 
                }} 
            />
            <div 
                className="absolute top-[30%] right-[30%] w-12 h-12 bg-white/10 rounded-full blur-md mix-blend-screen"
                style={{ animation: 'flare-float 8s ease-in-out infinite' }} 
            />
            <div 
                className="absolute top-[45%] right-[45%] w-24 h-24 bg-yellow-200/5 rounded-full blur-xl mix-blend-screen"
                style={{ animation: 'flare-float 12s ease-in-out infinite reverse' }} 
            />
            <div 
                className="absolute top-[60%] right-[60%] w-6 h-6 bg-orange-100/20 rounded-full blur-sm mix-blend-screen"
                style={{ animation: 'flare-float 15s ease-in-out infinite' }} 
            />
        </div>
    </>
);

const BackgroundEffects: React.FC<BackgroundEffectsProps> = ({ effect, isDark = false }) => {
    if (effect === 'none') return null;

    return (
        <div className="fixed inset-0 pointer-events-none -z-[5] overflow-hidden">
            {effect === 'snow' && <SnowEffect />}
            {effect === 'rain' && <RainEffect />}
            {effect === 'leaves' && <LeavesEffect />}
            {effect === 'strong-cloudy' && <StrongCloudyEffect dark={isDark} />}
            {effect === 'river' && <RiverEffect />}
            {effect === 'aurora' && <AuroraEffect />}
            {effect === 'tron' && <TronEffect />}
            {effect === 'sun-glare' && <SunGlareEffect />}
            {effect === 'sun-clouds' && (
                <>
                    <SunGlareEffect />
                    <StrongCloudyEffect dark={isDark} />
                </>
            )}
            {effect === 'rain-clouds' && (
                <>
                    <StrongCloudyEffect dark={true} />
                    <RainEffect zIndexOverride={15} />
                </>
            )}
            {effect === 'snow-rain' && (
                <>
                    <StrongCloudyEffect dark={true} />
                    <RainEffect zIndexOverride={15} />
                    <SnowEffect />
                </>
            )}
            {effect === 'thunderstorm' && (
                <>
                    <StrongCloudyEffect dark={true} />
                    <RainEffect zIndexOverride={15} />
                    <LightningFlash />
                </>
            )}
        </div>
    );
};

export default React.memo(BackgroundEffects);
