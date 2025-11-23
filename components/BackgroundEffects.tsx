
import React, { useMemo } from 'react';
import { useAppStore, BackgroundEffectType } from '../store/appStore';
import { applyOpacity } from '../utils/themeUtils';

interface BackgroundEffectsProps {
    effect: BackgroundEffectType;
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
                } as React.CSSProperties,
            };
        });
    }, []);

    return (
        <>
            {snowflakes.map(flake => (
                <div key={flake.id} className="snowflake" style={flake.style} />
            ))}
            <div className="absolute bottom-0 left-0 w-full h-[100px] overflow-hidden pointer-events-none">
                <div className="absolute -bottom-16 -left-[5%] w-[110%] h-32 bg-white/80 dark:bg-gray-100/10 rounded-[50%] opacity-80" style={{ filter: 'blur(5px)' }} />
                <div className="absolute -bottom-20 left-[20%] w-[80%] h-32 bg-white/70 dark:bg-gray-100/5 rounded-[50%] opacity-70" style={{ filter: 'blur(8px)' }} />
                <div className="absolute -bottom-12 right-[30%] w-[60%] h-24 bg-white/90 dark:bg-gray-100/15 rounded-[50%]" style={{ filter: 'blur(3px)' }} />
            </div>
        </>
    );
};

const RainEffect = () => {
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
                } as React.CSSProperties,
            };
        });
    }, []);

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
                } as React.CSSProperties,
            };
        });
    }, []);

    return (
        <>
            {raindrops.map(drop => (
                <div key={`rain-${drop.id}`} className="raindrop" style={drop.style} />
            ))}
            {glassDrops.map(drop => (
                <div key={`glass-${drop.id}`} className="glass-drop" style={drop.style} />
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
                } as React.CSSProperties,
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
                        ...leaf.style,
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

const StrongCloudyEffect = () => {
    const clouds = useMemo(() => {
        // Standard Cloud Shape
        const cloudPath = "M17.5,8.6c0-2.3,1.9-4.2,4.2-4.2c0.4,0,0.8,0.1,1.1,0.2c0.6-1.8,2.3-3.1,4.3-3.1c2.5,0,4.5,2,4.5,4.5c0,0.2,0,0.4,0,0.5c0.2,0,0.4,0,0.5,0c2.3,0,4.2,1.9,4.2,4.2s-1.9,4.2-4.2,4.2H21.7C19.4,14.9,17.5,13,17.5,10.7L17.5,8.6z";
        
        const colors = ['#9ca3af', '#6b7280', '#4b5563']; // Shades of grey

        return Array.from({ length: 12 }).map((_, i) => {
            const width = Math.random() * 300 + 200; // 200px to 500px
            const height = width * 0.6;
            const top = Math.random() * 60; // Top 60% of screen
            const duration = Math.random() * 40 + 30; // 30s to 70s
            const delay = Math.random() * -60; // Start mid-animation
            const opacity = Math.random() * 0.4 + 0.4; // 0.4 to 0.8
            const color = colors[Math.floor(Math.random() * colors.length)];
            const zIndex = Math.floor(Math.random() * 3); 

            return {
                id: i,
                path: cloudPath,
                style: {
                    '--width': `${width}px`,
                    '--height': `${height}px`,
                    '--top': `${top}vh`,
                    '--opacity': opacity,
                    zIndex: zIndex,
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                    filter: `blur(${width > 300 ? 8 : 4}px)`,
                } as React.CSSProperties,
                color,
            };
        });
    }, []);

    return (
        <>
            {clouds.map(cloud => (
                <div 
                    key={cloud.id} 
                    className="cloud" 
                    style={cloud.style}
                >
                    <svg 
                        viewBox="0 0 50 20" 
                        preserveAspectRatio="none"
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            fill: cloud.color,
                        }}
                    >
                        <path d={cloud.path} transform="scale(1.1, 1)" />
                    </svg>
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
    const { auroraSettings } = useAppStore();
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
    } as React.CSSProperties;

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-[5] aurora-scene" style={containerStyle}>
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

const BackgroundEffects: React.FC<BackgroundEffectsProps> = ({ effect }) => {
    if (effect === 'none') return null;

    return (
        <div className="fixed inset-0 pointer-events-none -z-[5] overflow-hidden">
            {effect === 'snow' && <SnowEffect />}
            {effect === 'rain' && <RainEffect />}
            {effect === 'leaves' && <LeavesEffect />}
            {effect === 'strong-cloudy' && <StrongCloudyEffect />}
            {effect === 'river' && <RiverEffect />}
            {effect === 'aurora' && <AuroraEffect />}
        </div>
    );
};

export default React.memo(BackgroundEffects);
