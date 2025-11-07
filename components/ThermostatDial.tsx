
import React, { useRef, useCallback, useState, useLayoutEffect } from 'react';

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
  // Clamp value to be within min/max
  const clampedValue = Math.max(min, Math.min(value, max));
  const valueRatio = (clampedValue - min) / range;
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
  const gradientPathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);

  const SIZE = 200;
  const STROKE_WIDTH = 20;
  const RADIUS = SIZE / 2 - STROKE_WIDTH / 2;
  const CENTER = SIZE / 2;
  const START_ANGLE = 135;
  const END_ANGLE = 405;

  useLayoutEffect(() => {
    if (gradientPathRef.current) {
      setPathLength(gradientPathRef.current.getTotalLength());
    }
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const angleRad = Math.atan2(y - CENTER, x - CENTER);
    let angleDeg = (angleRad * 180) / Math.PI + 90;
    if (angleDeg < 0) angleDeg += 360;

    if (angleDeg < START_ANGLE && angleDeg > END_ANGLE - 360) {
      const midPoint = (START_ANGLE + (END_ANGLE - 360)) / 2;
      if (angleDeg > midPoint) {
        angleDeg = START_ANGLE;
      } else {
        angleDeg = END_ANGLE;
      }
    }
    
    // Clamp to the visual range
    angleDeg = Math.max(START_ANGLE, Math.min(angleDeg, END_ANGLE));

    const range = max - min;
    const angleRange = END_ANGLE - START_ANGLE;
    const valueRatio = (angleDeg - START_ANGLE) / angleRange;
    let newValue = valueRatio * range + min;
    
    // Round to nearest 0.5
    newValue = Math.round(newValue * 2) / 2; 
    
    if (newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  }, [CENTER, START_ANGLE, END_ANGLE, min, max, onChange]);


  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const handlePointerUp = () => {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    
    handlePointerMove(e.nativeEvent);
  }, [handlePointerMove]);

  const valueAngle = valueToAngle(value, min, max, START_ANGLE, END_ANGLE);
  const handlePosition = polarToCartesian(CENTER, CENTER, RADIUS, valueAngle);
  
  const angleRange = END_ANGLE - START_ANGLE;
  const valueRatio = (valueAngle - START_ANGLE) / angleRange;
  const visibleLength = pathLength * valueRatio;
  const strokeDashoffset = pathLength > 0 ? pathLength - visibleLength : undefined;
  
  const fullArcPath = describeArc(CENTER, CENTER, RADIUS, START_ANGLE, END_ANGLE);

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
          <linearGradient id="thermoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>

        {/* Background Arc */}
        <path
          d={fullArcPath}
          fill="none"
          stroke="#4b5563" // gray-600
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
        
        {/* Value Arc (drawn with dash offset) */}
        <path
          ref={gradientPathRef}
          d={fullArcPath}
          fill="none"
          stroke="url(#thermoGradient)"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={pathLength}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
        
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
          <p className="text-xs font-bold text-gray-400">ЦЕЛЬ</p>
          <p className="text-6xl font-light text-white -my-1">{Math.round(value)}</p>
      </div>
    </div>
  );
};

export default ThermostatDial;