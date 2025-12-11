
<script lang="ts">
    import { appState } from '$state/app.svelte';
    import type { ColorScheme } from '$types';

    let { 
        min, max, value, current, hvacAction, 
        idleLabelColor, heatingLabelColor, coolingLabelColor, 
        onChange 
    } = $props<{
        min: number; max: number; value: number; current: number; 
        hvacAction: string; 
        idleLabelColor?: string; heatingLabelColor?: string; coolingLabelColor?: string;
        onChange: (val: number) => void;
    }>();

    const SIZE = 200;
    const CENTER = SIZE / 2;
    const STROKE = 20;
    const RADIUS = (SIZE - STROKE) / 2;
    const START_ANGLE = 135;
    const END_ANGLE = 405;

    // Helper: Polar to Cartesian
    function p2c(angle: number) {
        const rad = ((angle - 90) * Math.PI) / 180.0;
        return {
            x: CENTER + RADIUS * Math.cos(rad),
            y: CENTER + RADIUS * Math.sin(rad)
        };
    }

    // Helper: Describe Arc
    function describeArc(start: number, end: number) {
        const s = p2c(end);
        const e = p2c(start);
        const large = end - start <= 180 ? '0' : '1';
        return `M ${s.x} ${s.y} A ${RADIUS} ${RADIUS} 0 ${large} 0 ${e.x} ${e.y}`;
    }

    // Handle position
    let valueAngle = $derived.by(() => {
        const range = max - min;
        const ratio = (value - min) / range;
        return ratio * (END_ANGLE - START_ANGLE) + START_ANGLE;
    });

    let handlePos = $derived(p2c(valueAngle));

    // Interaction
    function handlePointer(e: PointerEvent) {
        const rect = (e.currentTarget as Element).closest('svg')!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        let deg = (Math.atan2(y - CENTER, x - CENTER) * 180) / Math.PI + 90;
        if (deg < 0) deg += 360;

        // Clamping logic
        if (deg > 45 && deg < 135) {
            // closer to start or end?
            deg = Math.abs(deg - 135) < Math.abs(deg - 45) ? START_ANGLE : END_ANGLE;
        } else if (deg >= 0 && deg <= 45) {
            deg += 360; // normalize for end range
        }

        const range = max - min;
        const arc = END_ANGLE - START_ANGLE;
        const ratio = (Math.min(Math.max(deg, START_ANGLE), END_ANGLE) - START_ANGLE) / arc;
        
        const newValue = Math.round((ratio * range + min) * 10) / 10;
        if (newValue !== value) onChange(newValue);
    }

    let isDragging = false;
</script>

<div class="relative w-full h-full flex items-center justify-center select-none">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <svg 
        viewBox="0 0 {SIZE} {SIZE}" 
        class="w-full h-full touch-none"
        onpointerdown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); isDragging = true; handlePointer(e); }}
        onpointermove={(e) => { if(isDragging) handlePointer(e); }}
        onpointerup={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); isDragging = false; }}
    >
        <!-- Track -->
        <path d={describeArc(START_ANGLE, END_ANGLE)} fill="none" stroke="var(--border-color-card)" stroke-width={STROKE} stroke-linecap="round" />
        
        <!-- Value Arc (Gradient) -->
        <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#3b82f6" />
                <stop offset="50%" stop-color="#8b5cf6" />
                <stop offset="100%" stop-color="#ef4444" />
            </linearGradient>
        </defs>
        <path d={describeArc(START_ANGLE, valueAngle)} fill="none" stroke="url(#grad)" stroke-width={STROKE} stroke-linecap="round" />

        <!-- Handle -->
        <circle cx={handlePos.x} cy={handlePos.y} r={STROKE/2 + 2} fill="white" stroke="rgba(0,0,0,0.1)" stroke-width="1" class="shadow-md" />
    </svg>

    <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span class="text-xs font-bold tracking-wider" style="color: {hvacAction === 'heating' ? 'var(--thermo-heat)' : 'var(--thermo-label)'}">
            {hvacAction.toUpperCase()}
        </span>
        <span class="text-4xl font-light tabular-nums" style="color: var(--text-value)">
            {value.toFixed(1)}
        </span>
    </div>
</div>
