



import React, { useRef, useCallback, useMemo } from 'react';

// --- Helper Functions ---
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const valueToAngle = (value: number, min: number, max: number, startAngle: number, endAngle: number) => {
  const range = max - min;
  if (range === 0) return startAngle;
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
  hvacMode: string;
}

const ThermostatDial: React.FC<ThermostatDialProps> = ({ min, max, value, onChange, hvacAction, hvacMode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const SIZE = 250;
  const CENTER = SIZE / 2;
  const RADIUS = 110;
  const START_ANGLE = 30;
  const END_ANGLE = 330;
  const STROKE_WIDTH = 30;

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const angleRad = Math.atan2(y - CENTER, x - CENTER);
    let angleDeg = (angleRad * 180) / Math.PI + 180;
    
    if (angleDeg < START_ANGLE - 10 && angleDeg > 180) return;
    if (angleDeg > END_ANGLE + 10 && angleDeg < 180) return;

    angleDeg = Math.max(START_ANGLE, Math.min(END_ANGLE, angleDeg));
    
    const range = max - min;
    const angleRange = END_ANGLE - START_ANGLE;
    const valueRatio = (angleDeg - START_ANGLE) / angleRange;
    const newValue = Math.round((valueRatio * range + min) * 2) / 2;
    
    if (newValue >= min && newValue <= max && newValue !== value) {
      onChange(newValue);
    }
  }, [CENTER, START_ANGLE, END_ANGLE, min, max, onChange, value]);


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
    handlePointerMove(e.nativeEvent);
  }, [handlePointerMove]);
  
  const { path, handlePosition, gradientColors } = useMemo(() => {
    const valueAngle = valueToAngle(value, min, max, START_ANGLE, END_ANGLE);
    const startPoint = polarToCartesian(CENTER, CENTER, RADIUS, END_ANGLE);
    const endPoint = polarToCartesian(CENTER, CENTER, RADIUS, START_ANGLE);
    const largeArcFlag = END_ANGLE - START_ANGLE <= 180 ? '0' : '1';

    const pathD = `M ${startPoint.x} ${startPoint.y} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 0 ${endPoint.x} ${endPoint.y}`;
    
    const handlePos = polarToCartesian(CENTER, CENTER, RADIUS, valueAngle);

    let gradColors;
    if (hvacAction === 'cooling' || hvacMode === 'cool') {
        gradColors = { start: '#25CBFF', end: '#589CFE' };
    } else if (hvacAction === 'heating' || hvacMode === 'heat') {
        gradColors = { start: '#FF9533', end: '#FFC93F' };
    } else {
        gradColors = { start: '#787A84', end: '#BFC1C8' };
    }

    return { path: pathD, handlePosition: handlePos, gradientColors: gradColors };
  }, [value, min, max, hvacAction, hvacMode]);

  const valueAngle = valueToAngle(value, min, max, START_ANGLE, END_ANGLE);

  const getHvacLabel = () => {
    const modeMap: {[key: string]: string} = {
        cool: 'Охлаждение до',
        heat: 'Нагрев до',
        fan_only: 'Вентилятор',
        off: 'Выключено'
    }
    return modeMap[hvacMode] || hvacMode.toUpperCase();
  }


  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full h-full"
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
      >
        <defs>
          <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientColors.start} />
            <stop offset="100%" stopColor={gradientColors.end} />
          </linearGradient>
          <mask id="arcMask">
            <path
              d={path}
              fill="none"
              stroke="white"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
            />
          </mask>
        </defs>

        {/* Background Track */}
        <path
          d={path}
          fill="none"
          stroke="#39393E"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />

        {/* Active Track */}
        <path
          d={path}
          fill="none"
          stroke="url(#activeGradient)"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * RADIUS * ((END_ANGLE - START_ANGLE) / 360)}
          strokeDashoffset={2 * Math.PI * RADIUS * ((END_ANGLE - START_ANGLE) / 360) * (1 - (valueAngle - START_ANGLE) / (END_ANGLE - START_ANGLE))}
        />
        
        {/* Handle */}
        <g transform={`translate(${handlePosition.x}, ${handlePosition.y})`}>
          <circle r={STROKE_WIDTH / 2} fill="white" className="cursor-pointer" />
          <circle r={STROKE_WIDTH / 2 - 3} fill="white" stroke="#E5E5E5" strokeWidth="1" className="cursor-pointer" />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-white">
          <p className="text-gray-400 font-medium text-lg tracking-wide">{getHvacLabel()}</p>
          <p className="font-bold text-7xl">{Math.round(value)}</p>
      </div>
    </div>
  );
};

export default ThermostatDial;