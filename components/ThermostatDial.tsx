
import React, { useRef, useCallback } from 'react';

// --- Helper Functions ---
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

const valueToAngle = (value: number, min: number, max: number, startAngle: number, endAngle: number) => {
  const range = max - min;
  if (range === 0) return startAngle;
  const valueRatio = (value - min) / range;
  return valueRatio * (endAngle - startAngle) + startAngle;
};

// --- Component Props ---
interface ThermostatDialProps {
  min: number;
  max: number;
  value: number; // Target temperature
  current: number; // Current temperature
  onChange: (value: number) => void;
  hvacAction: string;
}

const ThermostatDial: React.FC<ThermostatDialProps> = ({ min, max, value, current, onChange, hvacAction }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const SIZE = 200;
  const STROKE_WIDTH = 20;
  const RADIUS = SIZE / 2 - STROKE_WIDTH / 2;
  const CENTER = SIZE / 2;
  const START_ANGLE = 135;
  const END_ANGLE = 405;
  const MID_ANGLE = 270; // Top of the arc

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const angleRad = Math.atan2(y - CENTER, x - CENTER);
    let angleDeg = (angleRad * 180) / Math.PI + 90;
    if (angleDeg < 0) angleDeg += 360;

    // Clamp angle to the allowed range
    if (angleDeg < START_ANGLE && angleDeg > END_ANGLE - 360) {
      const distToStart = Math.abs(angleDeg - START_ANGLE);
      const distToEnd = Math.abs(angleDeg - (END_ANGLE - 360));
      angleDeg = distToStart < distToEnd ? START_ANGLE : END_ANGLE;
    }
    
    const range = max - min;
    const angleRange = END_ANGLE - START_ANGLE;
    const valueRatio = (angleDeg - START_ANGLE) / angleRange;
    const newValue = Math.round((valueRatio * range + min) * 2) / 2; // Round to nearest 0.5
    
    if (newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  }, [CENTER, START_ANGLE, END_ANGLE, min, max, onChange]);


  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const handlePointerUp = () => {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    
    // Trigger first move immediately
     handlePointerMove(e.nativeEvent);
  }, [handlePointerMove]);


  const valueAngle = valueToAngle(value, min, max, START_ANGLE, END_ANGLE);
  const handlePosition = polarToCartesian(CENTER, CENTER, RADIUS, valueAngle);

  const getLabelAndColor = () => {
    switch (hvacAction) {
      case 'cooling': return { label: 'ОХЛАЖДЕНИЕ', color: '#2563eb' };
      case 'heating': return { label: 'НАГРЕВ', color: '#f97316' };
      default: return { label: 'ЦЕЛЬ', color: '#9ca3af' };
    }
  };
  const { label: centerLabel, color: activeColor } = getLabelAndColor();

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full h-full"
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
      >
        <defs>
          <linearGradient id="thermoGradientCold" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#4169E1" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>

          <linearGradient id="thermoGradientHot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>

          <mask id="thermoValueMask">
             <path
                d={describeArc(CENTER, CENTER, RADIUS, START_ANGLE, valueAngle)}
                fill="none"
                stroke="white"
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
             />
          </mask>
        </defs>

        {/* Background Arc */}
        <path
          d={describeArc(CENTER, CENTER, RADIUS, START_ANGLE, END_ANGLE)}
          fill="none"
          stroke="#4b5563" // gray-600
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
        
        {/* Full Gradient Track (to be masked) */}
        <g mask="url(#thermoValueMask)">
            <path
              d={describeArc(CENTER, CENTER, RADIUS, START_ANGLE, MID_ANGLE)}
              fill="none"
              stroke="url(#thermoGradientCold)"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="butt"
            />
            <path
              d={describeArc(CENTER, CENTER, RADIUS, MID_ANGLE, END_ANGLE)}
              fill="none"
              stroke="url(#thermoGradientHot)"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="butt"
            />
        </g>
        
        {/* Handle */}
        <circle
          cx={handlePosition.x}
          cy={handlePosition.y}
          r={STROKE_WIDTH / 2 + 2}
          fill="#ffffff"
          className="cursor-pointer"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs font-bold" style={{ color: activeColor }}>{centerLabel}</p>
          <p className="text-6xl font-light text-white -my-1">{Math.round(value)}</p>
      </div>
    </div>
  );
};

export default ThermostatDial;
