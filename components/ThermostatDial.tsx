

import React, { useRef, useCallback, useState, useEffect, useLayoutEffect } from 'react';
import { ColorScheme } from '../types';

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


// --- Gradient Generation Helpers (NEW) ---
const GRADIENT_COLORS = ["#4169E1", "#8B5CF6", "#EC4899", "#F97316", "#EF4444"];

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const interpolateColor = (ratio: number, colors: string[]) => {
    const numSegments = colors.length - 1;
    const segment = Math.min(Math.floor(ratio * numSegments), numSegments - 1);
    const segmentRatio = (ratio * numSegments) % 1;

    const startColor = hexToRgb(colors[segment]);
    const endColor = hexToRgb(colors[segment + 1]);

    if (!startColor || !endColor) return '#ffffff';

    const r = Math.round(startColor.r + segmentRatio * (endColor.r - startColor.r));
    const g = Math.round(startColor.g + segmentRatio * (endColor.g - startColor.g));
    const b = Math.round(startColor.b + segmentRatio * (endColor.b - startColor.b));

    return rgbToHex(r, g, b);
};

// --- Gradient Arc Component (NEW) ---
const GradientArc: React.FC<{
    center: number;
    radius: number;
    strokeWidth: number;
    startAngle: number;
    endAngle: number;
    steps?: number;
}> = React.memo(({ center, radius, strokeWidth, startAngle, endAngle, steps = 300 }) => {
    const angleRange = endAngle - startAngle;
    const angleStep = angleRange / steps;
    
    return (
        <g>
            {Array.from({ length: steps }).map((_, i) => {
                const currentAngleStart = startAngle + i * angleStep;
                // Add a small overlap to ensure no gaps from anti-aliasing
                const currentAngleEnd = startAngle + (i + 1) * angleStep + 0.5;
                const colorRatio = (i + 0.5) / steps;
                const color = interpolateColor(colorRatio, GRADIENT_COLORS);
                
                return (
                    <path
                        key={i}
                        d={describeArc(center, center, radius, currentAngleStart, currentAngleEnd)}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />
                );
            })}
        </g>
    );
});

const AutoFitText: React.FC<{
  text: string;
  className?: string;
  pClassName?: string;
  maxFontSize?: number;
  pStyle?: React.CSSProperties;
}> = ({ text, className, pClassName, maxFontSize = 48, pStyle }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const p = pRef.current;
    if (!container || !p) return;

    const fitText = () => {
      let currentSize = maxFontSize;
      p.style.fontSize = `${currentSize}px`;
      while (
        currentSize > 8 &&
        (p.scrollWidth > container.clientWidth || p.scrollHeight > container.clientHeight)
      ) {
        currentSize -= 1;
        p.style.fontSize = `${currentSize}px`;
      }
    };
    
    const resizeObserver = new ResizeObserver(fitText);
    resizeObserver.observe(container);
    fitText();

    return () => {
      if (container) {
        resizeObserver.unobserve(container);
      }
    };
  }, [text, maxFontSize, pStyle]);

  return (
    <div ref={containerRef} className={`${className} flex items-center justify-center overflow-hidden`}>
      <p ref={pRef} className={pClassName} style={{ lineHeight: 1.1, whiteSpace: 'nowrap', ...pStyle }}>
        {text}
      </p>
    </div>
  );
};


// --- Component Props ---
interface ThermostatDialProps {
  min: number;
  max: number;
  value: number; // Target temperature
  current: number; // Current temperature
  onChange: (value: number) => void;
  hvacAction: string;
  idleLabelColor?: string;
  heatingLabelColor?: string;
  coolingLabelColor?: string;
  colorScheme: ColorScheme['light'];
}

const ThermostatDial: React.FC<ThermostatDialProps> = ({ min, max, value, current, onChange, hvacAction, idleLabelColor, heatingLabelColor, coolingLabelColor, colorScheme }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toFixed(1).replace('.', ','));
  
  const SIZE = 200;
  const STROKE_WIDTH = 20;
  const RADIUS = SIZE / 2 - STROKE_WIDTH / 2;
  const CENTER = SIZE / 2;
  const START_ANGLE = 135;
  const END_ANGLE = 405;

  useEffect(() => {
    if (isEditing) {
        // Ensure input value is up-to-date with the prop when editing starts
        setInputValue(value.toFixed(1).replace('.', ','));
        inputRef.current?.focus();
    }
  }, [isEditing, value]);
  
  const submitNewValue = () => {
    // Replace comma with a dot for robust parsing, handle empty input
    const newTemp = parseFloat(inputValue.replace(',', '.'));
    if (!isNaN(newTemp) && newTemp >= min && newTemp <= max) {
        onChange(newTemp);
    }
    setIsEditing(false);
  };

  const handleManualTempSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      submitNewValue();
  };
  
  const adjustTemp = (delta: number) => {
    // Replace comma with dot for robust parsing
    const currentTemp = parseFloat(inputValue.replace(',', '.')) || value;
    let newTemp = currentTemp + delta;
    newTemp = Math.max(min, Math.min(max, newTemp)); // clamp value
    // Format back with a comma for display
    setInputValue(newTemp.toFixed(1).replace('.', ','));
  };


  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const angleRad = Math.atan2(y - CENTER, x - CENTER);
    let angleDeg = (angleRad * 180) / Math.PI + 90;
    if (angleDeg < 0) angleDeg += 360;

    // Check if the pointer is within the arc's angular range before clamping.
    const isWithinArc = (angleDeg >= START_ANGLE && angleDeg <= END_ANGLE) || (angleDeg + 360 >= START_ANGLE && angleDeg + 360 <= END_ANGLE);
    
    // Clamp angle to the allowed range only if mouse is dragged outside
    if (!isWithinArc) {
        const startDist = Math.min(Math.abs(angleDeg - START_ANGLE), Math.abs(angleDeg - (START_ANGLE + 360)));
        const endDist = Math.min(Math.abs(angleDeg - END_ANGLE), Math.abs(angleDeg - (END_ANGLE - 360)));
        angleDeg = startDist < endDist ? START_ANGLE : END_ANGLE;
    }
    
    const range = max - min;
    const angleRange = END_ANGLE - START_ANGLE;
    const valueRatio = (angleDeg - START_ANGLE) / angleRange;
    const rawNewValue = valueRatio * range + min;
    const newValue = Math.round(rawNewValue * 10) / 10; // Round to nearest 0.1
    
    if (newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  }, [CENTER, START_ANGLE, END_ANGLE, min, max, onChange]);


  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const getLabelAndStyle = () => {
    const customActionLabel = {
      'humidifying': 'УВЛАЖНЕНИЕ',
      'drying': 'ОСУШЕНИЕ',
    }[hvacAction];
    
    if (customActionLabel) {
      return {
        label: customActionLabel,
        style: { color: heatingLabelColor || colorScheme.thermostatHeatingColor },
      };
    }

    switch (hvacAction) {
      case 'cooling': return {
          label: 'ОХЛАЖДЕНИЕ',
          style: { color: coolingLabelColor || colorScheme.thermostatCoolingColor },
      };
      case 'heating': return {
          label: 'НАГРЕВ',
          style: { color: heatingLabelColor || colorScheme.thermostatHeatingColor },
      };
      default: return {
          label: 'ЦЕЛЬ',
          style: { color: idleLabelColor || colorScheme.thermostatDialLabelColor },
      };
    }
  };
  const { label: centerLabel, style: activeStyle } = getLabelAndStyle();

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      >
        <defs>
          <mask id="thermoValueMask">
             <path
                d={describeArc(CENTER, CENTER, RADIUS, START_ANGLE, END_ANGLE)}
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
          className="stroke-gray-300 dark:stroke-gray-600"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
        
        {/* Full Gradient Track (to be masked) */}
        <g mask="url(#thermoValueMask)">
            <GradientArc
                center={CENTER}
                radius={RADIUS}
                strokeWidth={STROKE_WIDTH}
                startAngle={START_ANGLE}
                endAngle={END_ANGLE}
            />
        </g>
        
         {/* Invisible wider track for easier interaction */}
        <path
            d={describeArc(CENTER, CENTER, RADIUS, START_ANGLE, END_ANGLE)}
            fill="none"
            stroke="transparent"
            strokeWidth={STROKE_WIDTH + 8}
            strokeLinecap="round"
            className="cursor-pointer"
            onPointerDown={handlePointerDown}
        />

        {/* Handle */}
        <circle
          cx={handlePosition.x}
          cy={handlePosition.y}
          r={STROKE_WIDTH / 2 + 2}
          style={{ fill: colorScheme.thermostatHandleColor }}
          className="cursor-pointer"
          onPointerDown={handlePointerDown}
        />
      </svg>
      <div
        className="absolute top-1/2 left-1/2 w-[78%] h-[78%] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full"
        onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
        }}
      >
        <div className="absolute top-[22%] left-0 right-0 h-[20%]">
          <AutoFitText
            text={centerLabel}
            className="w-full h-full"
            pClassName="font-bold"
            pStyle={activeStyle}
            maxFontSize={14}
          />
        </div>
        <div className="w-full h-full flex items-center justify-center">
            <div className="w-full h-[60%]">
                <AutoFitText
                    text={value.toFixed(1).replace('.', ',')}
                    className="w-full h-full"
                    pClassName="font-light"
                    pStyle={{ color: colorScheme.thermostatDialTextColor }}
                    maxFontSize={80}
                />
            </div>
        </div>
      </div>
      
       {isEditing && (
        <div 
            className="absolute inset-0 bg-gray-200/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-full flex items-center justify-center z-20 fade-in"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-center">
                <form onSubmit={handleManualTempSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        inputMode="decimal"
                        min={min}
                        max={max}
                        value={inputValue}
                        onChange={(e) => {
                            const sanitizedValue = e.target.value.replace('.', ',');
                            if (sanitizedValue === '' || /^\d{1,2}(,\d{0,1})?$/.test(sanitizedValue)) {
                                setInputValue(sanitizedValue);
                            }
                        }}
                        onBlur={submitNewValue}
                        className="bg-transparent text-gray-900 dark:text-white text-6xl font-light w-44 text-center outline-none p-0 m-0"
                    />
                    <button type="submit" className="hidden">Установить</button>
                </form>
                 <div className="flex flex-col -ml-2">
                    <button 
                        type="button" 
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => adjustTemp(0.1)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                    <button 
                        type="button" 
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => adjustTemp(-0.1)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ThermostatDial;