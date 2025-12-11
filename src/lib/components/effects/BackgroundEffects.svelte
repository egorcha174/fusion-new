
<script lang="ts">
    import { onMount } from 'svelte';
    import { appState } from '$state/app.svelte';
    import type { BackgroundEffectType } from '$types';
    
    let { effect = 'none', isDark = false } = $props<{ 
        effect: BackgroundEffectType;
        isDark?: boolean;
    }>();

    // Helper functions
    const random = (min: number, max: number) => Math.random() * (max - min) + min;

    // Snow Generation
    let snowflakes = $state<any[]>([]);
    $effect(() => {
        if (effect === 'snow' || effect === 'snow-rain') {
            snowflakes = Array.from({ length: 150 }).map((_, i) => ({
                id: i,
                style: `
                    --size: ${random(2, 7)}px;
                    --x-start: ${random(0, 100)}vw;
                    --x-end: ${random(0, 100)}vw;
                    --rotate: ${random(-360, 360)}deg;
                    --opacity: ${random(0.3, 0.8)};
                    animation-duration: ${random(10, 20)}s;
                    animation-delay: ${random(-20, 0)}s;
                    filter: blur(${random(0, 1) > 0.8 ? 1 : 0}px);
                `
            }));
        } else {
            snowflakes = [];
        }
    });

    // Rain Generation
    let raindrops = $state<any[]>([]);
    let glassDrops = $state<any[]>([]);
    $effect(() => {
        if (['rain', 'thunderstorm', 'rain-clouds', 'snow-rain'].includes(effect)) {
            raindrops = Array.from({ length: 100 }).map((_, i) => ({
                id: i,
                style: `
                    --size: ${random(10, 25)}px;
                    --x-start: ${random(0, 100)}vw;
                    --opacity: ${random(0.1, 0.4)};
                    animation-duration: ${random(0.5, 1)}s;
                    animation-delay: ${random(-2, 0)}s;
                `
            }));
            glassDrops = Array.from({ length: 20 }).map((_, i) => ({
                id: i,
                style: `
                    left: ${random(0, 100)}vw;
                    --width: ${random(3, 7)}px;
                    --height: ${random(4, 8)}px;
                    animation-duration: ${random(2, 6)}s;
                    animation-delay: ${random(0, 15)}s;
                `
            }));
        } else {
            raindrops = [];
            glassDrops = [];
        }
    });

    // Tron Effect Canvas
    let canvas: HTMLCanvasElement;
    $effect(() => {
        if (effect !== 'tron' || !canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        class TronLine {
            x = 0; y = 0; vx = 0; vy = 0; color = ''; alive = true; trail: {x: number, y: number}[] = [];
            
            constructor() { this.reset(); }
            
            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                const speed = 2 + Math.random() * 2;
                this.color = `hsl(${Math.random() * 360}, 100%, 60%)`;
                const dir = Math.random() < 0.5 ? 'h' : 'v';
                this.vx = dir === 'h' ? (Math.random() < 0.5 ? speed : -speed) : 0;
                this.vy = dir === 'v' ? (Math.random() < 0.5 ? speed : -speed) : 0;
                this.trail = [];
                this.alive = true;
            }

            update() {
                if (!this.alive) return;
                this.trail.push({x: this.x, y: this.y});
                if (this.trail.length > 50) this.trail.shift();
                this.x += this.vx;
                this.y += this.vy;
                
                if (Math.random() < 0.02) {
                    if (this.vx !== 0) {
                        this.vy = (Math.random() < 0.5 ? 1 : -1) * Math.abs(this.vx);
                        this.vx = 0;
                    } else {
                        this.vx = (Math.random() < 0.5 ? 1 : -1) * Math.abs(this.vy);
                        this.vy = 0;
                    }
                }
                
                if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) this.reset();
            }

            draw(ctx: CanvasRenderingContext2D) {
                if (!this.alive) return;
                ctx.beginPath();
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.color;
                for (let i = 0; i < this.trail.length - 1; i++) {
                    ctx.moveTo(this.trail[i].x, this.trail[i].y);
                    ctx.lineTo(this.trail[i+1].x, this.trail[i+1].y);
                }
                ctx.stroke();
            }
        }

        const lines = Array.from({length: 20}, () => new TronLine());
        let frame: number;

        const animate = () => {
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(0, 0, width, height);
            lines.forEach(l => { l.update(); l.draw(ctx); });
            frame = requestAnimationFrame(animate);
        };
        animate();

        return () => cancelAnimationFrame(frame);
    });

</script>

<div class="fixed inset-0 pointer-events-none -z-[5] overflow-hidden">
    {#if effect === 'snow' || effect === 'snow-rain'}
        {#each snowflakes as flake (flake.id)}
            <div class="snowflake" style={flake.style}></div>
        {/each}
    {/if}

    {#if ['rain', 'thunderstorm', 'rain-clouds', 'snow-rain'].includes(effect)}
        {#each raindrops as drop (drop.id)}
            <div class="raindrop" style={drop.style}></div>
        {/each}
        {#each glassDrops as drop (drop.id)}
            <div class="glass-drop" style={drop.style}></div>
        {/each}
    {/if}

    {#if effect === 'tron'}
        <canvas bind:this={canvas} class="block bg-black"></canvas>
    {/if}
    
    {#if effect === 'thunderstorm'}
        <div class="lightning-flash absolute inset-0 bg-white mix-blend-overlay z-20"></div>
    {/if}
</div>

<style>
    .snowflake {
        position: absolute;
        top: -2vh;
        left: 0;
        width: var(--size);
        height: var(--size);
        background: white;
        border-radius: 50%;
        animation: snow-fall linear infinite;
    }

    .raindrop {
        position: absolute;
        top: -10vh;
        left: 0;
        width: 2px;
        height: var(--size);
        background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.8));
        animation: rain-fall linear infinite;
        transform: translateX(var(--x-start));
    }

    .glass-drop {
        position: absolute;
        top: -5vh;
        background: rgba(255,255,255,0.2);
        backdrop-filter: blur(2px);
        width: var(--width);
        height: var(--height);
        border-radius: 50% 50% 40% 40%;
        animation: glass-slip ease-in infinite;
    }

    .lightning-flash {
        animation: lightning 7s infinite;
        opacity: 0;
    }

    @keyframes snow-fall {
        0% { transform: translate(var(--x-start), 0) rotate(0deg); opacity: 0; }
        20% { opacity: var(--opacity); }
        100% { transform: translate(var(--x-end), 105vh) rotate(var(--rotate)); opacity: 0; }
    }

    @keyframes rain-fall {
        0% { transform: translateY(0) translateX(var(--x-start)); opacity: 0; }
        20% { opacity: var(--opacity); }
        100% { transform: translateY(110vh) translateX(var(--x-start)); opacity: 0; }
    }

    @keyframes glass-slip {
        0% { top: -5vh; opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 0.5; }
        100% { top: 105vh; opacity: 0; }
    }

    @keyframes lightning {
        0%, 92%, 100% { opacity: 0; }
        93% { opacity: 0.6; }
        94% { opacity: 0.2; }
        96% { opacity: 0.8; }
        98% { opacity: 0; }
    }
</style>
