

import React, { useRef, useCallback, useMemo } from 'react';

// --- Helper Functions ---
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const valueToAngle = (value: number, min: number, max: number, startAngle: number, endAngle: number) => {
  const range = max - min;
  if (range === 0) return startAngle;
  // Clamp value to min/max
  const clampedValue = Math.max(min, Math.min(max, value));
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
  
  const SIZE = 200;
  const CENTER = SIZE / 2;
  const RADIUS = 80;
  const START_ANGLE = 135;
  const END_ANGLE = 405;

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const angleRad = Math.atan2(y - CENTER, x - CENTER);
    let angleDeg = (angleRad * 180) / Math.PI + 90;
    if (angleDeg < 0) angleDeg += 360;
    
    // Handle wrap around for angles > 360
    if(angleDeg < START_ANGLE && x < CENTER) {
        angleDeg += 360;
    }

    // Clamp angle to the allowed range
    angleDeg = Math.max(START_ANGLE, Math.min(END_ANGLE, angleDeg));
    
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

  // Generate Ticks
  const ticks = useMemo(() => {
    const tickArray: React.ReactNode[] = [];
    const tempRange = max - min;
    if (tempRange <= 0) return [];
    const angleRange = END_ANGLE - START_ANGLE;

    const lerpColor = (a: number[], b: number[], amount: number) => {
        const boundedAmount = Math.max(0, Math.min(1, amount));
        const c = a.map((component, i) => component + boundedAmount * (b[i] - component));
        return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    };

    const blue = [0, 191, 255]; 
    const purple = [138, 43, 226]; 
    const pink = [255, 20, 147]; 

    for (let i = min; i <= max; i++) {
        const isMajor = i % 5 === 0;
        const angle = START_ANGLE + ((i - min) / tempRange) * angleRange;
        const start = polarToCartesian(CENTER, CENTER, RADIUS, angle);
        const end = polarToCartesian(CENTER, CENTER, RADIUS - (isMajor ? 8 : 4), angle);
        
        const tempRatio = (i - min) / tempRange;
        let color = '';
        if (tempRatio < 0.5) {
            color = lerpColor(blue, purple, tempRatio * 2);
        } else {
            color = lerpColor(purple, pink, (tempRatio - 0.5) * 2);
        }

        tickArray.push(
            <line key={`tick-${i}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={isMajor ? 1.5 : 1} />
        );

        if(isMajor) {
            const textPos = polarToCartesian(CENTER, CENTER, RADIUS - 18, angle);
            tickArray.push(
                <text key={`text-${i}`} x={textPos.x} y={textPos.y} fill="#9ca3af" fontSize="10" textAnchor="middle" dominantBaseline="middle">
                    {i}
                </text>
            );
        }
    }
    return tickArray;
  }, [min, max, RADIUS, CENTER, START_ANGLE, END_ANGLE]);


  const valueAngle = valueToAngle(value, min, max, START_ANGLE, END_ANGLE);
  const currentAngle = valueToAngle(current, min, max, START_ANGLE, END_ANGLE);
  
  const handlePosition = polarToCartesian(CENTER, CENTER, RADIUS, valueAngle);
  const currentPosition = polarToCartesian(CENTER, CENTER, RADIUS, currentAngle);

  // Active arc path
  const describeActiveArc = (start: number, end: number) => {
    const startA = valueToAngle(start, min, max, START_ANGLE, END_ANGLE);
    const endA = valueToAngle(end, min, max, START_ANGLE, END_ANGLE);
    
    const [s, e] = startA < endA ? [startA, endA] : [endA, startA];

    const startPoint = polarToCartesian(CENTER, CENTER, RADIUS, e);
    const endPoint = polarToCartesian(CENTER, CENTER, RADIUS, s);
    const largeArcFlag = e - s <= 180 ? '0' : '1';
    
    return `M ${startPoint.x} ${startPoint.y} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 0 ${endPoint.x} ${endPoint.y}`;
  };
  
  const activeArcPath = describeActiveArc(current, value);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full h-full"
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
      >
        {/* Ticks */}
        <g>{ticks}</g>
        
        {/* Active Arc */}
        <path
          d={activeArcPath}
          fill="none"
          stroke="#f97316" // Orange
          strokeWidth={18}
          strokeLinecap="round"
        />

        {/* Current Temp Handle */}
        <circle
          cx={currentPosition.x}
          cy={currentPosition.y}
          r={6}
          fill="#ffffff"
          stroke="#333"
          strokeWidth="1"
        />

        {/* Target Temp Handle */}
        <g transform={`translate(${handlePosition.x}, ${handlePosition.y})`}>
            <circle r={12} fill="#f97316" className="cursor-pointer" />
            <circle r={8} fill="#fbbf24" className="cursor-pointer" />
        </g>
      </svg>
    </div>
  );
};

export default ThermostatDial;
