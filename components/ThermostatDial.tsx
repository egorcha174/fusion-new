
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


// --- Gradient Generation Helpers ---
const DEFAULT_GRADIENT_COLORS = ["#4169E1", "#8B5CF6", "#EC4899", "#F97316", "#EF4444"];

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

// --- Gradient Arc Component ---
const GradientArc: React.FC<{
    center: number;
    radius: number;
    strokeWidth: number;
    startAngle: number;
    endAngle: number;
    colors: string[];
    steps?: number;
}> = React.memo(({ center, radius, strokeWidth, startAngle, endAngle, colors, steps = 300 }) => {
    const angleRange = endAngle - startAngle;
    const angleStep = angleRange / steps;
    
    return (
        <g>
            {Array.from({ length: steps }).map((_, i) => {
                const currentAngleStart = startAngle + i * angleStep;
                const currentAngleEnd = startAngle + (i + 1) * angleStep + 0.5;
                const colorRatio = (i + 0.5) / steps;
                const color = interpolateColor(colorRatio, colors);
                
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
  gradientColors?: string[];
}

const ThermostatDial: React.FC<ThermostatDialProps> = ({ min, max, value, current, onChange, hvacAction, idleLabelColor, heatingLabelColor, coolingLabelColor, colorScheme, gradientColors }) => {
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
        setInputValue(value.toFixed(1).replace('.', ','));
        inputRef.current?.focus();
    }
  }, [isEditing, value]);
  
  const submitNewValue = () => {
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
    const currentTemp = parseFloat(inputValue.replace(',', '.')) || value;
    let newTemp = currentTemp + delta;
    newTemp = Math.max(min, Math.min(max, newTemp));
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

    const isWithinArc = (angleDeg >= START_ANGLE && angleDeg <= END_ANGLE) || (angleDeg + 360 >= START_ANGLE && angleDeg + 360 <= END_ANGLE);
    
    if (!isWithinArc) {
        const startDist = Math.min(Math.abs(angleDeg - START_ANGLE), Math.abs(angleDeg - (START_ANGLE + 360)));
        const endDist = Math.min(Math.abs(angleDeg - END_ANGLE), Math.abs(angleDeg - (END_ANGLE - 360)));
        angleDeg = startDist < endDist ? START_ANGLE : END_ANGLE;
    }
    
    const range = max - min;
    const angleRange = END_ANGLE - START_ANGLE;
    const valueRatio = (angleDeg - START_ANGLE) / angleRange;
    const rawNewValue = valueRatio * range + min;
    const newValue = Math.round(rawNewValue * 10) / 10; 
    
    if (newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  }, [CENTER, START_ANGLE, END_ANGLE, min, max, onChange]);


  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Fix for "Unexpected identifier 'as'" error: remove explicit cast
    const target = e.target;
    
    if (target instanceof Element) {
        target.setPointerCapture(e.pointerId);
    }

    const handlePointerUp = () => {
      if (target instanceof Element) {
          target.releasePointerCapture(e.pointerId);
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    
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
        style: { color: heatingLabelColor || 'var(--thermo-heat)' },
      };
    }

    switch (hvacAction) {
      case 'cooling': return {
          label: 'ОХЛАЖДЕНИЕ',
          style: { color: coolingLabelColor || 'var(--thermo-cool)' },
      };
      case 'heating': return {
          label: 'НАГРЕВ',
          style: { color: heatingLabelColor || 'var(--thermo-heat)' },
      };
      default: return {
          label: 'ЦЕЛЬ',
          style: { color: idleLabelColor || 'var(--thermo-label)' },
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

        <path
          d={describeArc(CENTER, CENTER, RADIUS, START_ANGLE, END_ANGLE)}
          fill="none"
          className="stroke-gray-300 dark:stroke-gray-600"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
        
        <g mask="url(#thermoValueMask)">
            <GradientArc
                center={CENTER}
                radius={RADIUS}
                strokeWidth={STROKE_WIDTH}
                startAngle={START_ANGLE}
                endAngle={END_ANGLE}
                colors={gradientColors || DEFAULT_GRADIENT_COLORS}
            />
        </g>
        
        <path
            d={describeArc(CENTER, CENTER, RADIUS, START_ANGLE, END_ANGLE)}
            fill="none"
            stroke="transparent"
            strokeWidth={STROKE_WIDTH + 8}
            strokeLinecap="round"
            className="cursor-pointer"
            onPointerDown={handlePointerDown}
        />

        <circle
          cx={handlePosition.x}
          cy={handlePosition.y}
          r={STROKE_WIDTH / 2 + 2}
          style={{ fill: 'var(--thermo-handle)' }}
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
        <div className="absolute top-[15%] left-0 right-0 h-[20%]">
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
                    pStyle={{ color: 'var(--thermo-text)' }}
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
