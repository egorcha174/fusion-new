<change>
<file>src/components/DashboardGrid.tsx</file>
<description>Remove type assertion from MotionDiv</description>
<content><![CDATA[
import React, { useState, useMemo } from 'react';
import {
  DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent,
  useDraggable, useDroppable, DragOverlay, pointerWithin,
} from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { DeviceCard } from './DeviceCard';
import { Tab, Device, GridLayoutItem, CardTemplates, DeviceCustomizations, ThemeColors } from '../types';
import { useAppStore } from '../store/appStore';
import ErrorBoundary from './ErrorBoundary';

// Workaround for TypeScript errors with motion.div props in some environments
const MotionDiv = motion.div;

interface DashboardGridProps {
  tab: Tab;
  isEditMode: boolean;
  allKnownDevices: Map<string, Device>;
  searchTerm: string;
  onDeviceLayoutChange: (tabId: string, newLayout: GridLayoutItem[]) => void;
  onDeviceToggle: (deviceId: string) => void;
  onTemperatureChange: (deviceId: string, temperature: number, isDelta?: boolean) => void;
  onBrightnessChange: (deviceId: string, brightness: number) => void;
  onHvacModeChange: (deviceId: string, mode: string) => void;
  onPresetChange: (deviceId: string, preset: string) => void;
  onFanSpeedChange: (deviceId: string, value: number | string) => void;
  onShowHistory: (entityId: string) => void;
  onEditDevice: (device: Device) => void;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  templates: CardTemplates;
  customizations: DeviceCustomizations;
  colorScheme: ThemeColors;
  isDark: boolean;
}

const DraggableDevice: React.FC<{
  device: Device;
  isEditMode: boolean;
  children: React.ReactNode;
  [key: string]: any;
}> = ({ device, isEditMode, children, ...props }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: device.id,
    disabled: !isEditMode,
    data: { device },
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.3 : 1,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    height: '100%',
    width: '100%',
    cursor: isEditMode ? 'grab' : 'default',
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} {...props}>
      {children}
    </div>
  );
};

const DroppableCell: React.FC<{
  col: number;
  row: number;
  children?: React.ReactNode;
  isEditMode: boolean;
}> = ({ col, row, children, isEditMode }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${col}-${row}`,
    data: { col, row },
    disabled: !isEditMode,
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-full h-full rounded-xl transition-colors duration-200 ${
        isOver && isEditMode ? 'bg-blue-500/30 ring-2 ring-blue-500' : ''
      }`}
    >
      {children}
    </div>
  );
};

const DashboardGrid: React.FC<DashboardGridProps> = ({
  tab,
  isEditMode,
  allKnownDevices,
  searchTerm,
  onDeviceLayoutChange,
  onDeviceToggle,
  onTemperatureChange,
  onBrightnessChange,
  onHvacModeChange,
  onPresetChange,
  onFanSpeedChange,
  onEditDevice,
  haUrl,
  signPath,
  customizations,
  colorScheme,
  isDark,
}) => {
  const { getTemplateForDevice, checkCollision } = useAppStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const cols = tab.gridSettings.cols || 8;
  const rows = tab.gridSettings.rows || 5;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const overId = over.id as string;
    // Expecting overId to be "cell-col-row"
    if (!overId.startsWith('cell-')) return;

    const parts = overId.split('-');
    const destCol = parseInt(parts[1]);
    const destRow = parseInt(parts[2]);

    const deviceId = active.id as string;
    const currentItem = tab.layout.find((item) => item.deviceId === deviceId);

    if (!currentItem) return;
    
    const newLayoutItem = { ...currentItem, col: destCol, row: destRow };
    
    // FIX: checkCollision expects width and height to be numbers, ensure they are provided.
    const itemToCheck = {
        ...newLayoutItem,
        width: newLayoutItem.width || 1,
        height: newLayoutItem.height || 1
    };
    
    const hasCollision = checkCollision(tab.layout, itemToCheck, tab.gridSettings, deviceId);
    
    if (!hasCollision) {
        const newLayout = tab.layout.map((item) =>
            item.deviceId === deviceId ? newLayoutItem : item
        );
        onDeviceLayoutChange(tab.id, newLayout);
    }
  };

  const activeDevice = activeId ? allKnownDevices.get(activeId) : null;
  
  const filteredLayout = useMemo(() => {
      if (!searchTerm) return tab.layout;
      return tab.layout.filter(item => {
          const dev = allKnownDevices.get(item.deviceId);
          return dev && dev.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [tab.layout, searchTerm, allKnownDevices]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div 
        className="w-full h-full overflow-hidden no-scrollbar"
      >
        <div
          className="grid gap-3 h-full"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {isEditMode && Array.from({ length: cols * rows }).map((_, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            return (
              <div
                key={`cell-${col}-${row}`}
                style={{ gridColumnStart: col + 1, gridRowStart: row + 1 }}
                className="z-0 pointer-events-auto"
              >
                <DroppableCell col={col} row={row} isEditMode={isEditMode}>
                    <div className="w-full h-full border border-dashed border-gray-300 dark:border-gray-700 rounded-xl opacity-50" />
                </DroppableCell>
              </div>
            );
          })}

          {filteredLayout.map((item) => {
            const device = allKnownDevices.get(item.deviceId);
            if (!device) return null;

            const template = getTemplateForDevice(device);
            const width = item.width || template?.width || 1;
            const height = item.height || template?.height || 1;

            return (
              <MotionDiv
                key={item.deviceId}
                layout={!isEditMode}
                initial={false}
                className="z-10"
                style={{
                  gridColumn: `${item.col + 1} / span ${width}`,
                  gridRow: `${item.row + 1} / span ${height}`,
                }}
              >
                <DraggableDevice 
                    device={device} 
                    isEditMode={isEditMode}
                    data-device-id={device.id}
                    data-tab-id={tab.id}
                >
                  <ErrorBoundary isCard>
                    <DeviceCard
                      device={device}
                      cardWidth={width}
                      cardHeight={height}
                      template={template || undefined}
                      allKnownDevices={allKnownDevices}
                      customizations={customizations}
                      isEditMode={isEditMode}
                      onDeviceToggle={onDeviceToggle}
                      onTemperatureChange={onTemperatureChange}
                      onBrightnessChange={onBrightnessChange}
                      onHvacModeChange={onHvacModeChange}
                      onPresetChange={onPresetChange}
                      onFanSpeedChange={onFanSpeedChange}
                      onEditDevice={onEditDevice}
                      haUrl={haUrl}
                      signPath={signPath}
                      colorScheme={colorScheme}
                      isDark={isDark}
                    />
                  </ErrorBoundary>
                </DraggableDevice>
              </MotionDiv>
            );
          })}
        </div>
      </div>

      <DragOverlay adjustScale style={{ transformOrigin: '0 0' }} zIndex={100}>
        {activeDevice ? (
            <div className="w-full h-full opacity-90 shadow-2xl scale-105">
                 <DeviceCard
                      device={activeDevice}
                      template={getTemplateForDevice(activeDevice) || undefined}
                      cardWidth={tab.layout.find(item => item.deviceId === activeDevice.id)?.width || 1}
                      cardHeight={tab.layout.find(item => item.deviceId === activeDevice.id)?.height || 1}
                      allKnownDevices={allKnownDevices}
                      customizations={customizations}
                      isEditMode={false}
                      onDeviceToggle={() => {}}
                      onTemperatureChange={() => {}}
                      onBrightnessChange={() => {}}
                      onHvacModeChange={() => {}}
                      onPresetChange={() => {}}
                      onFanSpeedChange={() => {}}
                      onEditDevice={() => {}}
                      haUrl={haUrl}
                      signPath={signPath}
                      colorScheme={colorScheme}
                      isDark={isDark}
                      autoPlay={false}
                    />
            </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default React.memo(DashboardGrid);
]]></content>
</change>

<change>
<file>src/components/BackgroundEffects.tsx</file>
<description>Remove 'as React.CSSProperties' casting</description>
<content><![CDATA[
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
                        ...cloud.style,
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
]]></content>
</change>

<change>
<file>src/components/ChristmasTheme.tsx</file>
<description>Remove 'as React.CSSProperties' casting</description>
<content><![CDATA[
import React, { useMemo } from 'react';

const ChristmasTheme = () => {
    const snowflakes = useMemo(() => {
        return Array.from({ length: 150 }).map((_, i) => {
            const size = Math.random() * 5 + 2; // size from 2px to 7px
            const xStart = Math.random() * 100; // start position in vw
            const xEnd = xStart + (Math.random() - 0.5) * 50; // end position variation
            const duration = Math.random() * 10 + 10; // 10s to 20s
            const delay = Math.random() * -20; // -20s to 0s
            const rotate = (Math.random() - 0.5) * 720; // random rotation
            const finalOpacity = Math.random() * 0.5 + 0.3; // opacity from 0.3 to 0.8

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
        <div className="fixed inset-0 pointer-events-none -z-[5] overflow-hidden">
            {/* Snowflakes */}
            {snowflakes.map(flake => (
                <div key={flake.id} className="snowflake" style={flake.style} />
            ))}
            {/* Snowdrifts */}
            <div className="absolute bottom-0 left-0 w-full h-[100px] overflow-hidden">
                <div 
                    className="absolute -bottom-16 -left-[5%] w-[110%] h-32 bg-white/80 dark:bg-gray-100/10 rounded-[50%] opacity-80"
                    style={{ filter: 'blur(5px)' }}
                />
                <div 
                    className="absolute -bottom-20 left-[20%] w-[80%] h-32 bg-white/70 dark:bg-gray-100/5 rounded-[50%] opacity-70"
                    style={{ filter: 'blur(8px)' }}
                />
                 <div 
                    className="absolute -bottom-12 right-[30%] w-[60%] h-24 bg-white/90 dark:bg-gray-100/15 rounded-[50%]"
                    style={{ filter: 'blur(3px)' }}
                />
            </div>
        </div>
    );
};

export default ChristmasTheme;
]]></content>
</change>

<change>
<file>src/components/EventTimerWidgetCard.tsx</file>
<description>Remove 'as React.CSSProperties' casting</description>
<content><![CDATA[
import React, { useMemo } from 'react';
import { Device, ThemeColors } from '../types';

interface EventTimerWidgetCardProps {
    device: Device;
    colorScheme: ThemeColors;
}

// Вспомогательные функции для работы с цветом
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    } : null;
};

const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

const interpolateColor = (color1: string, color2: string, factor: number): string => {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    if (!c1 || !c2) return color1; // Fallback

    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));
    return rgbToHex(r, g, b);
};

const Bubbles = React.memo(() => {
    // Генерируем случайные свойства для пузырьков для создания естественного эффекта
    const bubbles = useMemo(() => Array.from({ length: 20 }).map((_, i) => {
        const willRise = Math.random() > 0.4; // 60% пузырьков будут всплывать доверху
        return {
            id: i,
            left: `${Math.random() * 100}%`,
            size: `${Math.random() * 12 + 4}px`, // Размер от 4px до 16px
            duration: willRise ? `${Math.random() * 8 + 6}s` : `${Math.random() * 3 + 2}s`, // Всплывающие медленнее, лопающиеся быстрее
            delay: `${Math.random() * 10}s`, // Задержка до 10s
            wobble: `${(Math.random() - 0.5) * 20}px`,
            animationName: willRise ? 'bubble-rise' : 'bubble-pop',
            positionClass: 'bottom-0' // Все пузырьки появляются снизу
        };
    }), []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {bubbles.map(bubble => (
                <div
                    key={bubble.id}
                    className={`absolute rounded-full bg-white/20 ${bubble.positionClass}`}
                    style={{
                        left: bubble.left,
                        width: bubble.size,
                        height: bubble.size,
                        animation: `${bubble.animationName} ${bubble.duration} ${bubble.delay} infinite ease-in-out`,
                        '--bubble-wobble': bubble.wobble,
                    }}
                />
            ))}
        </div>
    );
});


const EventTimerWidgetCard: React.FC<EventTimerWidgetCardProps> = ({ device, colorScheme }) => {
    const { 
        fillPercentage = 0, daysRemaining = 0,
        fillColors, animation, fillDirection, showName, name,
        nameFontSize, namePosition, daysRemainingFontSize, daysRemainingPosition 
    } = device;

    const effectiveAnimation = animation || 'smooth';
    const effectiveFillDirection = fillDirection || 'bottom-to-top';

    const finalNamePosition = namePosition || { x: 50, y: 15 };
    const finalDaysPosition = daysRemainingPosition || { x: 50, y: 50 };

    // Функция для определения цвета заливки в зависимости от процента и настроек
    const getFillColor = (percentage: number): string => {
        const [start = '#22c55e', mid = '#f59e0b', end = '#ef4444'] = fillColors || [];
        
        if (percentage < 50) {
            // Интерполяция между начальным и средним цветом
            return interpolateColor(start, mid, percentage / 50);
        } else {
            // Интерполяция между средним и конечным цветом
            return interpolateColor(mid, end, (percentage - 50) / 50);
        }
    };

    const fillColor = getFillColor(fillPercentage);
    
    const isTopDown = effectiveFillDirection === 'top-to-bottom';
    // Если "сверху вниз", то визуальный процент заполнения - это инверсия прошедшего времени (эффект опустошения)
    const visualFillPercentage = isTopDown ? 100 - fillPercentage : fillPercentage;

    const fillStyle: React.CSSProperties = {
        height: `${visualFillPercentage}%`,
        backgroundColor: fillColor,
        transition: effectiveAnimation === 'smooth' 
            ? 'height 0.7s ease-in-out, background-color 0.5s linear' 
            : 'background-color 0.5s linear',
    };

    return (
        <div 
            className="w-full h-full relative overflow-hidden text-white select-none"
            style={{
                borderRadius: `var(--radius-card)`,
                borderWidth: 'var(--border-width-card)',
                borderStyle: 'solid',
                borderColor: 'var(--border-color-card)',
                backgroundColor: 'var(--bg-card-raw)',
            }}
        >
            {/* Слой с "жидкой" заливкой, всегда спозиционированный снизу */}
            <div
                className={`absolute bottom-0 left-0 right-0`}
                style={fillStyle}
            >
                {/* Пузырьки всегда поднимаются снизу */}
                {effectiveAnimation === 'bubbles' && <Bubbles />}

                {/* Волна всегда располагается наверху жидкой части */}
                {effectiveAnimation === 'wave' && (
                    <svg
                        className="absolute left-0 w-[200%] animate-wave"
                        viewBox="0 0 2000 50"
                        preserveAspectRatio="none"
                        style={{ 
                            height: '50px', 
                            top: '-49px'
                        }}
                    >
                        <path
                            d="M0,25 C300,50 700,0 1000,25 C1300,50 1700,0 2000,25 L2000,51 L0,51 Z"
                            style={{ stroke: 'none', fill: fillColor, transition: 'fill 0.5s linear' }}
                        />
                    </svg>
                )}
            </div>

            {/* Слой с контентом */}
            <div className="relative w-full h-full p-4">
                {showName && (
                    <div 
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
                        style={{
                            top: `${finalNamePosition.y}%`,
                            left: `${finalNamePosition.x}%`,
                            color: 'var(--text-name-on)',
                            textShadow: '0 1px 5px rgba(0,0,0,0.4)',
                        }}
                    >
                        <p className="font-semibold" style={{ fontSize: nameFontSize ? `${nameFontSize}px` : '1.125rem' }}>
                            {name}
                        </p>
                    </div>
                )}

                <div 
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{
                        top: `${finalDaysPosition.y}%`,
                        left: `${finalDaysPosition.x}%`,
                        color: 'var(--text-name-on)',
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                    }}
                >
                    <p 
                        className="font-bold tracking-tighter"
                        style={{ fontSize: daysRemainingFontSize ? `${daysRemainingFontSize}px` : '5.5rem' }}
                    >
                        {daysRemaining}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EventTimerWidgetCard;
]]></content>
</change>

<change>
<file>src/components/DeviceSettingsModal.tsx</file>
<description>Remove 'as' casting causing syntax error</description>
<content><![CDATA[
import React, { useState, useMemo } from 'react';
import { Device, DeviceCustomization, DeviceType, CardTemplates, DeviceBinding, CardTemplate, ThresholdRule } from '../types';
import DeviceIcon, { icons, getIconNameForDeviceType } from './DeviceIcon';
import { Icon } from '@iconify/react';
import { useAppStore } from '../store/appStore';
import { useHAStore } from '../store/haStore';

interface DeviceSettingsModalProps {
  device: Device;
  onClose: () => void;
}

const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({
  device,
  onClose,
}) => {
  const { customizations, templates, handleSaveCustomization } = useAppStore();
  const { allKnownDevices } = useHAStore();
  
  const customization = customizations[device.id] || {};

  const getDefaultIcon = () => {
    if (customization.icon) return customization.icon;
    // Use the 'off' state icon as the default representation.
    return getIconNameForDeviceType(customization.type ?? device.type, false);
  };
  
  const [name, setName] = useState(customization.name ?? device.name);
  const [type, setType] = useState(customization.type ?? device.type);
  const [icon, setIcon] = useState<string>(getDefaultIcon());
  const [isHidden, setIsHidden] = useState(customization.isHidden ?? false);
  const [templateId, setTemplateId] = useState(customization.templateId ?? '');
  const [iconAnimation, setIconAnimation] = useState(customization.iconAnimation ?? 'none');
  const [bindings, setBindings] = useState<DeviceBinding[]>(customization.deviceBindings ?? []);
  const [thresholds, setThresholds] = useState<ThresholdRule[]>(customization.thresholds ?? []);


  const handleTypeChange = (newType: DeviceType) => {
    setType(newType);
    // When the type changes, also update the icon to match, using the Iconify name.
    setIcon(getIconNameForDeviceType(newType, false));
  };

  const handleSave = () => {
    handleSaveCustomization(device, {
      name: name.trim(),
      type,
      icon,
      isHidden,
      templateId,
      iconAnimation,
      deviceBindings: bindings,
      thresholds: thresholds,
    });
    onClose();
  };
  
  const handleBindingChange = (slotId: string, updates: Partial<DeviceBinding>) => {
    setBindings(prev => {
        const existingBindingIndex = prev.findIndex(b => b.slotId === slotId);
        if (existingBindingIndex > -1) {
            // Update existing binding
            const newBindings = [...prev];
            newBindings[existingBindingIndex] = { ...newBindings[existingBindingIndex], ...updates };
            return newBindings;
        } else {
            // Create new binding
            const newBinding: DeviceBinding = {
                slotId,
                entityId: '',
                enabled: true,
                ...updates
            };
            return [...prev, newBinding];
        }
    });
  };

  const handleAddThreshold = () => {
    const newRule: ThresholdRule = {
      value: 0,
      comparison: 'above',
      style: {},
    };
    setThresholds(prev => [...prev, newRule]);
  };

  const handleUpdateThreshold = (index: number, field: keyof ThresholdRule | 'style', value: any) => {
    setThresholds(prev => {
      const newThresholds = [...prev];
      if (field === 'style') {
        newThresholds[index] = { ...newThresholds[index], style: value };
      } else {
        newThresholds[index] = { ...newThresholds[index], [field]: value };
      }
      return newThresholds;
    });
  };
  
  const handleClearThresholdColor = (index: number, colorType: 'backgroundColor' | 'valueColor') => {
     setThresholds(prev => {
      const newThresholds = [...prev];
      const newStyle = { ...newThresholds[index].style };
      delete newStyle[colorType];
      newThresholds[index] = { ...newThresholds[index], style: newStyle };
      return newThresholds;
    });
  }

  const handleDeleteThreshold = (index: number) => {
    setThresholds(prev => prev.filter((_, i) => i !== index));
  };

  const availableTypes = Object.keys(DeviceType)
    .filter(key => !isNaN(Number(key)))
    .map(key => ({
        value: Number(key),
        name: DeviceType[Number(key)]
    }));
    
  const availableIcons = Object.keys(icons).map(Number);
  
  const isTemplateable = [
    DeviceType.Sensor, DeviceType.Light, DeviceType.DimmableLight,
    DeviceType.Switch, DeviceType.Thermostat, DeviceType.Humidifier,
    DeviceType.Custom
  ].includes(type);

  const isSensor = type === DeviceType.Sensor;
  
  const getTemplateTypeString = (deviceType: DeviceType): 'sensor' | 'light' | 'switch' | 'climate' | 'humidifier' | 'custom' => {
    switch (deviceType) {
        case DeviceType.Light:
        case DeviceType.DimmableLight:
            return 'light';
        case DeviceType.Switch:
            return 'switch';
        case DeviceType.Thermostat:
            return 'climate';
        case DeviceType.Humidifier:
            return 'humidifier';
        case DeviceType.Custom:
            return 'custom';
        case DeviceType.Sensor:
        default:
            return 'sensor';
    }
  };

  const templateType = getTemplateTypeString(type);

  const animationOptions = [
    { value: 'none', name: 'Нет' },
    { value: 'spin', name: 'Вращение' },
    { value: 'pulse', name: 'Пульсация' },
    { value: 'glow', name: 'Сияние' },
  ];
  
  const effectiveTemplateId = templateId || (templateType === 'climate' ? 'default-climate' : '');
  const effectiveTemplate: CardTemplate | undefined = templates[effectiveTemplateId];
  const deviceSlots = effectiveTemplate?.deviceSlots;

  const sortedEntities = useMemo(() => Array.from(allKnownDevices.values()).sort((a: Device, b: Device) => a.name.localeCompare(b.name)), [allKnownDevices]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-md ring-1 ring-black/5 dark:ring-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Настроить устройство</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{device.name}</p>
        </div>
        
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          
          <div>
            <label htmlFor="deviceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Название</label>
            <input
              id="deviceName"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="deviceType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Тип устройства</label>
            <select
                id="deviceType"
                value={type}
                onChange={(e) => handleTypeChange(Number(e.target.value))}
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
                {availableTypes.map(typeOption => (
                    <option key={typeOption.value} value={typeOption.value}>
                        {typeOption.name}
                    </option>
                ))}
            </select>
          </div>

          {isTemplateable && (
            <div>
              <label htmlFor="deviceTemplate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Шаблон</label>
              <select
                  id="deviceTemplate"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                  <option value="">По умолчанию</option>
                  {Object.values(templates)
                    .filter((template: CardTemplate) => template.deviceType === templateType)
                    .map((template: CardTemplate) => (
                      <option key={template.id} value={template.id}>
                          {template.name}
                      </option>
                  ))}
              </select>
            </div>
          )}
           {isSensor && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Пороги значений</h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">Изменяйте цвет фона или значения в зависимости от состояния сенсора.</p>
                <div className="space-y-2">
                {(thresholds).map((rule, index) => (
                    <div key={index} className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">Правило #{index + 1}</span>
                            <button onClick={() => handleDeleteThreshold(index)} className="p-1 text-gray-500 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded-md transition-colors">
                                <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select value={rule.comparison} onChange={(e) => handleUpdateThreshold(index, 'comparison', e.target.value)} className="w-full bg-white dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none">
                                <option value="above">Больше чем</option>
                                <option value="below">Меньше чем</option>
                            </select>
                            <input type="number" value={rule.value} onChange={e => handleUpdateThreshold(index, 'value', parseFloat(e.target.value) ?? 0)} className="w-full bg-white dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <div className="grid grid-cols-2 items-center gap-4">
                            <label className="text-xs text-gray-500 dark:text-gray-400 truncate">Цвет фона</label>
                             <div className="flex items-center gap-2">
                                <input type="color" value={rule.style.backgroundColor || '#ffffff'} onChange={e => handleUpdateThreshold(index, 'style', { ...rule.style, backgroundColor: e.target.value })} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"/>
                                <button onClick={() => handleClearThresholdColor(index, 'backgroundColor')} title="Сбросить" className="p-1 text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors">
                                    <Icon icon="mdi:close" className="w-4 h-4" />
                                </button>
                             </div>
                        </div>
                        <div className="grid grid-cols-2 items-center gap-4">
                            <label className="text-xs text-gray-500 dark:text-gray-400 truncate">Цвет значения</label>
                              <div className="flex items-center gap-2">
                                <input type="color" value={rule.style.valueColor || '#ffffff'} onChange={e => handleUpdateThreshold(index, 'style', { ...rule.style, valueColor: e.target.value })} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"/>
                                 <button onClick={() => handleClearThresholdColor(index, 'valueColor')} title="Сбросить" className="p-1 text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors">
                                    <Icon icon="mdi:close" className="w-4 h-4" />
                                </button>
                              </div>
                        </div>
                    </div>
                ))}
                </div>
                <button onClick={handleAddThreshold} className="mt-2 w-full flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600/80 rounded-md py-2 transition-colors">
                    <Icon icon="mdi:plus" className="w-5 h-5"/>
                    Добавить правило
                </button>
            </div>
          )}

          {deviceSlots && deviceSlots.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Привязка индикаторов</h3>
                {deviceSlots.map((slot, index) => {
                    const binding = bindings.find(b => b.slotId === slot.id) || { enabled: false, entityId: '', icon: ''};
                    return (
                        <div key={slot.id} className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg space-y-3">
                           <div className="flex justify-between items-center">
                               <label className="font-medium text-gray-800 dark:text-gray-200">Слот #{index + 1}</label>
                                <button
                                    onClick={() => handleBindingChange(slot.id, { enabled: !binding.enabled })}
                                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${binding.enabled ? 'bg-blue-600' : 'bg-gray-500 dark:bg-gray-600'}`}
                                >
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${binding.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                           </div>
                           <div className={!binding.enabled ? 'opacity-50 pointer-events-none' : ''}>
                               <div>
                                   <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Устройство</label>
                                   <select
                                       value={binding.entityId}
                                       onChange={(e) => handleBindingChange(slot.id, { entityId: e.target.value })}
                                       className="w-full bg-white dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                                   >
                                       <option value="">-- Выберите устройство --</option>
                                       {sortedEntities.map((entity: Device) => (
                                           <option key={entity.id} value={entity.id}>{entity.name}</option>
                                       ))}
                                   </select>
                               </div>
                               <div>
                                   <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 mt-2">Иконка (переопределение)</label>
                                   <input
                                       type="text"
                                       value={binding.icon || ''}
                                       placeholder="Авто (из устройства)"
                                       onChange={(e) => handleBindingChange(slot.id, { icon: e.target.value })}
                                       className="w-full bg-white dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                   />
                               </div>
                           </div>
                        </div>
                    )
                })}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Иконка</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Вставьте название с <a href="https://iconify.design/" target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">Iconify.design</a> или выберите из стандартных.</p>
            <input
              id="deviceIcon"
              type="text"
              value={icon}
              onChange={e => setIcon(e.target.value)}
              placeholder="например, mdi:lightbulb"
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
            <div className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg grid grid-cols-5 sm:grid-cols-7 gap-3">
                 {availableIcons.map(iconType => {
                    const iconName = getIconNameForDeviceType(iconType, false);
                    const isSelected = icon === iconName;
                    return (
                        <div key={iconType} onClick={() => setIcon(iconName)} className={`p-2 rounded-lg cursor-pointer transition-colors aspect-square flex items-center justify-center ${isSelected ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                           <div className="w-8 h-8 text-gray-500 dark:text-gray-400">
                            <DeviceIcon icon={iconType} isOn={false} className="!w-full !h-full !m-0" />
                           </div>
                        </div>
                    )
                 })}
            </div>
         </div>
          
          <div>
            <label htmlFor="iconAnimation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Анимация иконки (для вкл. состояния)</label>
            <select
              id="iconAnimation"
              value={iconAnimation}
              onChange={(e) => setIconAnimation(e.target.value as 'none' | 'spin' | 'pulse' | 'glow')}
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              {animationOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg">
            <div>
              <label htmlFor="isHidden" className="text-sm font-medium text-gray-800 dark:text-gray-200">Скрыть устройство</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Устройство не будет отображаться на дашборде.</p>
            </div>
            <button
              onClick={() => setIsHidden(!isHidden)}
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isHidden ? 'bg-red-600' : 'bg-gray-500 dark:bg-gray-600'}`}
            >
              <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isHidden ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

        </div>

        <div className="p-6 flex justify-end gap-4 bg-gray-100/50 dark:bg-gray-800/50 rounded-b-2xl border-t border-gray-200 dark:border-gray-700">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors">Отмена</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Сохранить</button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DeviceSettingsModal);
]]></content>
</change>

<change>
<file>src/components/Settings.tsx</file>
<description>Remove 'as' casting causing syntax error</description>
<content><![CDATA[
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CardTemplates, CardTemplate, ColorScheme, DeviceType, ColorThemeSet, EventTimerWidget, WeatherSettings, ServerConfig, ThemeDefinition, Device, AuroraSettings } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { useAppStore, BackgroundEffectType } from '../store/appStore';
import { useHAStore } from '../store/haStore';
import JSZip from 'jszip';
import { Icon } from '@iconify/react';
import { LOCAL_STORAGE_KEYS } from '../constants';
import { format } from 'date-fns';
import { nanoid } from 'nanoid';
import { set as setAtPath } from '../utils/obj-path';
import { generatePackage, validatePackage } from '../utils/packageManager';
import { Section, LabeledInput, ColorInput, RangeInput, ThemeEditor } from './SettingsControls';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'failed';
type SettingsTab = 'appearance' | 'interface' | 'templates' | 'connection' | 'backup';

// --- Основной компонент настроек ---
interface SettingsProps {
    onConnect?: (url: string, token: string) => void;
    connectionStatus?: ConnectionStatus;
    error?: string | null;
    variant?: 'page' | 'drawer';
    isOpen?: boolean;
    onClose?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onConnect, connectionStatus, error, variant = 'page', isOpen = false, onClose }) => {
    // Состояния для вкладки "Подключение"
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [editingServer, setEditingServer] = useState<Partial<ServerConfig> | null>(null);
    const [serverToDelete, setServerToDelete] = useState<ServerConfig | null>(null);
    
    const {
        templates, setTemplates, handleDeleteTemplate, setEditingTemplate,
        clockSettings, setClockSettings,
        sidebarWidth, setSidebarWidth,
        isSidebarVisible, setIsSidebarVisible,
        themeMode, setThemeMode,
        scheduleStartTime, setScheduleStartTime,
        scheduleEndTime, setScheduleEndTime,
        themes, activeThemeId, selectTheme, saveTheme, deleteTheme, importThemePackage,
        onResetColorScheme,
        weatherProvider, setWeatherProvider,
        weatherEntityId, setWeatherEntityId,
        openWeatherMapKey, setOpenWeatherMapKey,
        yandexWeatherKey, setYandexWeatherKey,
        forecaApiKey, setForecaApiKey,
        weatherSettings, setWeatherSettings,
        lowBatteryThreshold, setLowBatteryThreshold,
        backgroundEffect, setBackgroundEffect,
        servers, activeServerId, addServer, updateServer, deleteServer, setActiveServerId,
        auroraSettings, setAuroraSettings,
        handleResetTemplates
    } = useAppStore();

    const { allKnownDevices, disconnect } = useHAStore();

    const [editingTheme, setEditingTheme] = useState<ThemeDefinition | null>(null);
    const [confirmingDeleteTheme, setConfirmingDeleteTheme] = useState<ThemeDefinition | null>(null);
    const [activeEditorTab, setActiveEditorTab] = useState<'light' | 'dark'>('light');
    const [confirmingResetTemplates, setConfirmingResetTemplates] = useState(false);

    useEffect(() => {
        // При первой загрузке выбрать активный сервер
        if (!selectedServerId && activeServerId) {
            setSelectedServerId(activeServerId);
        }
    }, [activeServerId, selectedServerId]);
    
    useEffect(() => {
        // Если выбранный сервер удалили, сбрасываем форму редактирования.
        if (editingServer && editingServer.id && !servers.some(s => s.id === editingServer.id)) {
            setEditingServer(null);
        }
    }, [servers, editingServer]);

    const weatherEntities = useMemo(() => {
        return (Array.from(allKnownDevices.values()))
            .filter(device => device.type === DeviceType.Weather || device.haDomain === 'weather')
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allKnownDevices]);


    const handleConnect = () => {
        const server = servers.find(s => s.id === selectedServerId);
        if (server && onConnect) {
            onConnect(server.url, server.token);
            setActiveServerId(server.id);
        }
    };
    
     const handleExport = async () => {
        try {
            const zip = new JSZip();

            // Собираем все настройки из localStorage
            const settingsToExport: { [key: string]: any } = {};
            for (const key of Object.values(LOCAL_STORAGE_KEYS)) {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    try {
                        settingsToExport[key] = JSON.parse(value);
                    } catch {
                        settingsToExport[key] = value;
                    }
                }
            }

            zip.file("ha-dashboard-settings.json", JSON.stringify(settingsToExport, null, 2));
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `ha-dashboard-backup-${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Failed to export settings:", e);
            alert("Ошибка при экспорте настроек.");
        }
    };
    
    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // 1. Try importing as ZIP (Full Backup)
                try {
                    const zip = await JSZip.loadAsync(e.target?.result as ArrayBuffer);
                    const settingsFile = zip.file("ha-dashboard-settings.json");

                    if (settingsFile) {
                        const content = await settingsFile.async("string");
                        const importedSettings = JSON.parse(content);

                        const validStorageKeys = Object.values(LOCAL_STORAGE_KEYS);
                        Object.keys(importedSettings).forEach(key => {
                            if (validStorageKeys.includes(key as any)) {
                               localStorage.setItem(key, JSON.stringify(importedSettings[key]));
                            }
                        });

                        alert("Настройки успешно импортированы! Страница будет перезагружена.");
                        window.location.reload();
                        return;
                    }
                } catch (zipErr) {
                    // Not a valid zip, try JSON (Theme Package)
                }

                // 2. Try importing as JSON (Theme Package)
                const decoder = new TextDecoder('utf-8');
                const jsonContent = decoder.decode(e.target?.result as ArrayBuffer);
                const json = JSON.parse(jsonContent);

                if (validatePackage(json)) {
                    importThemePackage(json);
                    alert(`Пакет темы "${json.manifest.name}" успешно импортирован!`);
                } else {
                    throw new Error("Неизвестный формат файла.");
                }

            } catch (err) {
                console.error("Failed to import settings:", err);
                alert(`Ошибка при импорте: ${(err as Error).message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExportTheme = async (theme: ThemeDefinition) => {
        try {
            const pkg = await generatePackage(theme, 'User', 'Exported from dashboard');
            const json = JSON.stringify(pkg, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${theme.name.toLowerCase().replace(/\s+/g, '-')}.theme.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Failed to export theme:", e);
            alert("Ошибка при экспорте темы.");
        }
    };

    const handleResetAllSettings = () => {
        if(window.confirm("Вы уверены, что хотите сбросить ВСЕ настройки? Это действие нельзя отменить.")) {
            Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            alert("Все настройки сброшены. Страница будет перезагружена.");
            window.location.reload();
        }
    };

    const handleResetAppearance = () => {
        onResetColorScheme();
        setThemeMode('auto');
        alert("Настройки внешнего вида сброшены к значениям по умолчанию.");
    };
    
    const handleSaveServer = () => {
        if (!editingServer || !editingServer.name || !editingServer.url || !editingServer.token) {
            alert("Пожалуйста, заполните все поля.");
            return;
        }

        if (editingServer.id) { // Редактирование существующего
            updateServer(editingServer as ServerConfig);
        } else { // Добавление нового
            const newServer = addServer({ name: editingServer.name, url: editingServer.url, token: editingServer.token });
            setSelectedServerId(newServer.id);
        }
        setEditingServer(null);
    };

    // --- Theme Management Handlers ---
    const handleCreateNewTheme = () => {
        const baseTheme = themes.find(t => t.id === 'apple-default') || themes[0];
        const newTheme: ThemeDefinition = {
            id: nanoid(),
            name: `Новая тема ${themes.filter(t => t.isCustom).length + 1}`,
            isCustom: true,
            scheme: JSON.parse(JSON.stringify(baseTheme.scheme)),
        };
        setEditingTheme(newTheme);
    };
    
    const handleEditTheme = (theme: ThemeDefinition) => {
        if (theme.isCustom) {
            setEditingTheme(JSON.parse(JSON.stringify(theme)));
        }
    };

    const handleDuplicateTheme = (theme: ThemeDefinition) => {
        const newTheme: ThemeDefinition = {
            id: nanoid(),
            name: `${theme.name} (копия)`,
            isCustom: true,
            scheme: JSON.parse(JSON.stringify(theme.scheme)),
        };
        setEditingTheme(newTheme);
    };
    
    const handleSaveTheme = () => {
        if (editingTheme) {
            saveTheme(editingTheme);
            setEditingTheme(null);
        }
    };
    
    const handleUpdateEditingThemeValue = (path: string, value: any) => {
        setEditingTheme(currentTheme => {
            if (!currentTheme) return null;
            const newTheme = JSON.parse(JSON.stringify(currentTheme));
            if (path.endsWith('cardBorderRadius')) {
                newTheme.scheme.light.cardBorderRadius = value;
                newTheme.scheme.dark.cardBorderRadius = value;
            } else if (path.endsWith('cardBorderWidth')) {
                newTheme.scheme.light.cardBorderWidth = value;
                newTheme.scheme.dark.cardBorderWidth = value;
            } else if (path.endsWith('iconBackgroundShape')) {
                newTheme.scheme.light.iconBackgroundShape = value;
                newTheme.scheme.dark.iconBackgroundShape = value;
            } else {
                setAtPath(newTheme.scheme, path, value);
            }
            return newTheme;
        });
    };

    const handleAuroraChange = (key: keyof AuroraSettings, value: any) => {
        setAuroraSettings({ ...auroraSettings, [key]: value });
    };

    const AURORA_PRESETS: Record<string, AuroraSettings> = {
        classic: { color1: '#00ffc8', color2: '#78c8ff', color3: '#00b4ff', speed: 22, intensity: 90, blur: 18, saturate: 140, starsEnabled: true, starsSpeed: 6 },
        green: { color1: '#00ff9f', color2: '#00d68a', color3: '#00b36b', speed: 18, intensity: 100, blur: 14, saturate: 160, starsEnabled: true, starsSpeed: 5 },
        violet: { color1: '#b28cff', color2: '#8f6bff', color3: '#5f3bff', speed: 26, intensity: 80, blur: 22, saturate: 180, starsEnabled: true, starsSpeed: 8 },
    };

    const isLoginMode = connectionStatus !== 'connected';

    const content = (
        <>
            {/* Connection Section (Login Mode) */}
            {isLoginMode && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
                <div className="flex h-96">
                    {/* Левая колонка со списком серверов */}
                    <div className="w-2/5 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                        <div className="p-4 flex-grow overflow-y-auto">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Сохраненные серверы</h3>
                            {servers.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">Нет сохраненных серверов.</p>
                            ) : (
                                <div className="space-y-2">
                                    {servers.map(server => (
                                        <button
                                            key={server.id}
                                            onClick={() => setSelectedServerId(server.id)}
                                            className={`w-full text-left p-3 rounded-lg transition-colors ${selectedServerId === server.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700/50'}`}
                                        >
                                            <p className="font-semibold truncate">{server.name}</p>
                                            <p className={`text-xs truncate ${selectedServerId === server.id ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>{server.url}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-between gap-2">
                            <button onClick={() => { setEditingServer({}); setSelectedServerId(null); }} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md" title="Добавить сервер"><Icon icon="mdi:plus" className="w-5 h-5" /></button>
                            <button onClick={() => servers.find(s => s.id === selectedServerId) && setEditingServer(servers.find(s => s.id === selectedServerId)!)} disabled={!selectedServerId} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed" title="Редактировать"><Icon icon="mdi:pencil" className="w-5 h-5" /></button>
                            <button onClick={() => servers.find(s => s.id === selectedServerId) && setServerToDelete(servers.find(s => s.id === selectedServerId)!)} disabled={!selectedServerId} className="p-2 text-red-500 hover:bg-red-500/10 rounded-md disabled:opacity-50 disabled:cursor-not-allowed" title="Удалить"><Icon icon="mdi:trash-can-outline" className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {/* Правая колонка с формой и кнопкой подключения */}
                    <div className="w-3/5 flex flex-col">
                        <div className="p-6 flex-grow space-y-6 overflow-y-auto">
                            {(editingServer) ? (
                                <>
                                    <h3 className="text-lg font-bold">{editingServer.id ? 'Редактировать сервер' : 'Добавить новый сервер'}</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Название</label>
                                        <input type="text" value={editingServer.name || ''} onChange={e => setEditingServer(s => ({ ...s, name: e.target.value }))} placeholder="Мой дом" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URL-адрес Home Assistant</label>
                                        <input type="text" value={editingServer.url || ''} onChange={e => setEditingServer(s => ({ ...s, url: e.target.value }))} placeholder="http://homeassistant.local:8123" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Долгосрочный токен доступа</label>
                                        <input type="password" value={editingServer.token || ''} onChange={e => setEditingServer(s => ({ ...s, token: e.target.value }))} placeholder="Вставьте ваш токен сюда" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <Icon icon="mdi:server-network" className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
                                    <h3 className="text-lg font-semibold">Управление серверами</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Выберите сервер из списка слева, чтобы подключиться, или добавьте новый.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                             {error && <div className="bg-red-500/10 text-red-500 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}
                             {editingServer ? (
                                <div className="flex justify-end gap-4">
                                    <button onClick={() => setEditingServer(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors">Отмена</button>
                                    <button onClick={handleSaveServer} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Сохранить</button>
                                </div>
                             ) : (
                                <button onClick={handleConnect} disabled={!selectedServerId || connectionStatus === 'connecting'} className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 transition-colors">
                                    {connectionStatus === 'connecting' ? 'Подключение...' : 'Подключиться'}
                                </button>
                             )}
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Other Settings - Only show when connected */}
            {!isLoginMode && (
                <>
                    <Section title="Подключение" description="Управление соединением с Home Assistant.">
                        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg">
                            <div className="overflow-hidden mr-4">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {servers.find(s => s.id === activeServerId)?.name || 'Сервер'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {servers.find(s => s.id === activeServerId)?.url}
                                </p>
                            </div>
                            <button 
                                onClick={() => {
                                    disconnect();
                                    setActiveServerId(null);
                                }}
                                className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                Отключиться
                            </button>
                        </div>
                    </Section>

                    <Section title="Внешний вид" description="Настройка режима темы (светлая/темная) и фоновой анимации.">
                        <LabeledInput label="Режим темы">
                            <select value={themeMode} onChange={e => setThemeMode(e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                                <option value="auto">Системная</option>
                                <option value="day">Светлая</option>
                                <option value="night">Темная</option>
                                <option value="schedule">По расписанию</option>
                            </select>
                        </LabeledInput>

                        {themeMode === 'schedule' && (
                            <div className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg space-y-3 mt-2 mb-2 animate-in fade-in slide-in-from-top-1">
                                <LabeledInput label="Начало ночи">
                                    <input type="time" value={scheduleStartTime} onChange={e => setScheduleStartTime(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm" />
                                </LabeledInput>
                                <LabeledInput label="Конец ночи">
                                    <input type="time" value={scheduleEndTime} onChange={e => setScheduleEndTime(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm" />
                                </LabeledInput>
                            </div>
                        )}

                        <div className="h-px bg-gray-200 dark:bg-gray-700 my-4"></div>

                        <LabeledInput label="Анимация фона">
                            <select value={backgroundEffect} onChange={e => setBackgroundEffect(e.target.value as BackgroundEffectType)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm">
                                <option value="none">Нет</option>
                                <option value="weather">По погоде</option>
                                <option value="tron">Трон</option>
                                <option value="snow">Снег</option>
                                <option value="rain">Дождь</option>
                                <option value="strong-cloudy">Сильная облачность</option>
                                <option value="rain-clouds">Облака и дождь</option>
                                <option value="snow-rain">Снег с дождем</option>
                                <option value="thunderstorm">Гроза</option>
                                <option value="leaves">Листопад</option>
                                <option value="river">Речные волны</option>
                                <option value="aurora">Полярное сияние</option>
                                <option value="sun-glare">Солнечные блики</option>
                                <option value="sun-clouds">Солнечные блики с облаками</option>
                            </select>
                        </LabeledInput>
                        
                        {backgroundEffect === 'aurora' && (
                            <div className="mt-4 space-y-4 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Настройки сияния</h4>
                                    <div className="flex gap-2">
                                        {Object.entries(AURORA_PRESETS).map(([name, preset]) => (
                                            <button 
                                                key={name}
                                                onClick={() => setAuroraSettings(preset)}
                                                className="px-2 py-1 text-xs rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 shadow-sm"
                                            >
                                                {name === 'classic' ? 'Классика' : name === 'green' ? 'Зеленый' : 'Фиолет'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col items-center">
                                        <label className="text-xs mb-1 text-gray-500">Цвет 1</label>
                                        <input type="color" value={auroraSettings.color1} onChange={e => handleAuroraChange('color1', e.target.value)} className="w-full h-8 p-0 border-none rounded cursor-pointer bg-transparent"/>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <label className="text-xs mb-1 text-gray-500">Цвет 2</label>
                                        <input type="color" value={auroraSettings.color2} onChange={e => handleAuroraChange('color2', e.target.value)} className="w-full h-8 p-0 border-none rounded cursor-pointer bg-transparent"/>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <label className="text-xs mb-1 text-gray-500">Цвет 3</label>
                                        <input type="color" value={auroraSettings.color3} onChange={e => handleAuroraChange('color3', e.target.value)} className="w-full h-8 p-0 border-none rounded cursor-pointer bg-transparent"/>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <LabeledInput label="Скорость">
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="6" max="40" value={auroraSettings.speed} onChange={e => handleAuroraChange('speed', Number(e.target.value))} className="w-full accent-blue-500"/>
                                            <span className="text-xs w-8 text-right font-mono">{auroraSettings.speed}s</span>
                                        </div>
                                    </LabeledInput>
                                    <LabeledInput label="Интенсивность">
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="30" max="120" value={auroraSettings.intensity} onChange={e => handleAuroraChange('intensity', Number(e.target.value))} className="w-full accent-blue-500"/>
                                            <span className="text-xs w-8 text-right font-mono">{auroraSettings.intensity}%</span>
                                        </div>
                                    </LabeledInput>
                                    <LabeledInput label="Размытие">
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="4" max="40" value={auroraSettings.blur} onChange={e => handleAuroraChange('blur', Number(e.target.value))} className="w-full accent-blue-500"/>
                                            <span className="text-xs w-8 text-right font-mono">{auroraSettings.blur}px</span>
                                        </div>
                                    </LabeledInput>
                                    <LabeledInput label="Насыщенность">
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="80" max="220" value={auroraSettings.saturate} onChange={e => handleAuroraChange('saturate', Number(e.target.value))} className="w-full accent-blue-500"/>
                                            <span className="text-xs w-8 text-right font-mono">{auroraSettings.saturate}%</span>
                                        </div>
                                    </LabeledInput>
                                </div>
                                
                                <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                                    <LabeledInput label="Звезды">
                                        <div className="flex justify-end">
                                            <input type="checkbox" checked={auroraSettings.starsEnabled} onChange={e => handleAuroraChange('starsEnabled', e.target.checked)} className="w-5 h-5 accent-blue-600"/>
                                        </div>
                                    </LabeledInput>
                                    {auroraSettings.starsEnabled && (
                                        <div className="mt-2">
                                            <LabeledInput label="Скорость мерцания">
                                                <div className="flex items-center gap-2">
                                                    <input type="range" min="2" max="12" value={auroraSettings.starsSpeed} onChange={e => handleAuroraChange('starsSpeed', Number(e.target.value))} className="w-full accent-blue-500"/>
                                                    <span className="text-xs w-8 text-right font-mono">{auroraSettings.starsSpeed}s</span>
                                                </div>
                                            </LabeledInput>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Section>

                    <Section title="Погода" description="Настройте источник данных о погоде для виджета и фоновых эффектов.">
                        <LabeledInput label="Провайдер погоды">
                            <select value={weatherProvider} onChange={e => setWeatherProvider(e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                                <option value="homeassistant">Home Assistant</option>
                                <option value="openweathermap">OpenWeatherMap</option>
                                <option value="yandex">Яндекс.Погода</option>
                                <option value="foreca">Foreca</option>
                            </select>
                        </LabeledInput>

                        {weatherProvider === 'homeassistant' && (
                            <LabeledInput label="Сущность погоды" description="Выберите вашу сущность weather из Home Assistant.">
                                <select value={weatherEntityId} onChange={e => setWeatherEntityId(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                                    <option value="">-- Выберите сущность --</option>
                                    {weatherEntities.map(entity => (
                                        <option key={entity.id} value={entity.id}>{entity.name}</option>
                                    ))}
                                </select>
                            </LabeledInput>
                        )}

                        {weatherProvider === 'openweathermap' && (
                            <LabeledInput label="Ключ API OpenWeatherMap" description="Требуется для получения прогноза.">
                                <input type="password" value={openWeatherMapKey} onChange={e => setOpenWeatherMapKey(e.target.value)} placeholder="Вставьте ваш ключ API" className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
                            </LabeledInput>
                        )}
                        
                        {weatherProvider === 'yandex' && (
                            <LabeledInput label="Ключ API Яндекс.Погоды" description="Тариф 'Прогноз по координатам'.">
                                <input type="password" value={yandexWeatherKey} onChange={e => setYandexWeatherKey(e.target.value)} placeholder="Вставьте ваш ключ API" className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
                            </LabeledInput>
                        )}
                        
                        {weatherProvider === 'foreca' && (
                            <LabeledInput label="Ключ API Foreca" description="Требуется Basic/Pro подписка.">
                                <input type="password" value={forecaApiKey} onChange={e => setForecaApiKey(e.target.value)} placeholder="Вставьте ваш ключ API" className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
                            </LabeledInput>
                        )}

                        <div className="h-px bg-gray-200 dark:bg-gray-700 my-4"></div>

                        <LabeledInput label="Дней в прогнозе">
                            <input type="number" min="1" max="7" value={weatherSettings.forecastDays} onChange={e => setWeatherSettings({ ...weatherSettings, forecastDays: parseInt(e.target.value, 10) })} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
                        </LabeledInput>

                        <LabeledInput label="Набор иконок">
                            <select value={weatherSettings.iconPack} onChange={e => setWeatherSettings({ ...weatherSettings, iconPack: e.target.value as any })} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                                <option value="default">Стандартные (анимированные)</option>
                                <option value="meteocons">Meteocons</option>
                                <option value="weather-icons">Weather Icons</option>
                                <option value="material-symbols-light">Material Symbols</option>
                            </select>
                        </LabeledInput>
                    </Section>

                    <Section title="Тема оформления" description="Выберите тему из списка. Используйте кнопку копирования для создания своей версии.">
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                            {themes.map(theme => (
                                <div key={theme.id} className="text-center group relative">
                                    <button
                                        onClick={() => selectTheme(theme.id)}
                                        className="w-full aspect-video rounded-lg border-2 dark:border-gray-600 transition-all flex items-center justify-center text-xs font-semibold shadow-sm hover:shadow-md"
                                        style={{
                                            backgroundImage: `linear-gradient(135deg, ${theme.scheme.light.dashboardBackgroundColor1} 50%, ${theme.scheme.dark.dashboardBackgroundColor1} 50%)`,
                                            borderColor: activeThemeId === theme.id ? '#3b82f6' : 'transparent',
                                            transform: activeThemeId === theme.id ? 'scale(1.02)' : 'scale(1)'
                                        }}
                                    >
                                        <span className="bg-white/50 dark:bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm">{theme.name}</span>
                                    </button>
                                    <div className="absolute top-1 right-1 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {theme.isCustom && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEditTheme(theme); }}
                                                className="p-1.5 bg-gray-800/80 rounded-full text-white hover:bg-blue-600 transition-colors backdrop-blur-sm"
                                                title="Редактировать тему"
                                            >
                                                <Icon icon="mdi:pencil" className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDuplicateTheme(theme); }}
                                            className="p-1.5 bg-gray-800/80 rounded-full text-white hover:bg-green-600 transition-colors backdrop-blur-sm"
                                            title="Создать копию"
                                        >
                                            <Icon icon="mdi:content-copy" className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleExportTheme(theme); }}
                                            className="p-1.5 bg-gray-800/80 rounded-full text-white hover:bg-purple-600 transition-colors backdrop-blur-sm"
                                            title="Экспортировать тему"
                                        >
                                            <Icon icon="mdi:export-variant" className="w-3.5 h-3.5" />
                                        </button>
                                        {theme.isCustom && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setConfirmingDeleteTheme(theme); }}
                                                className="p-1.5 bg-gray-800/80 rounded-full text-white hover:bg-red-600 transition-colors backdrop-blur-sm"
                                                title="Удалить тему"
                                            >
                                                <Icon icon="mdi:trash-can-outline" className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div className="text-center">
                                <button
                                    onClick={handleCreateNewTheme}
                                    className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-400 dark:border-gray-600 transition-all flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:border-gray-500"
                                >
                                    <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                                        <Icon icon="mdi:plus" className="w-8 h-8 mb-1" />
                                        <span className="text-xs font-medium">Создать тему</span>
                                    </div>
                                </button>
                            </div>
                             <div className="text-center">
                                <label
                                    className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-400 dark:border-gray-600 transition-all flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:border-gray-500 cursor-pointer"
                                >
                                    <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                                        <Icon icon="mdi:file-upload-outline" className="w-8 h-8 mb-1" />
                                        <span className="text-xs font-medium">Импорт темы</span>
                                    </div>
                                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                                </label>
                            </div>
                        </div>
                    </Section>

                    {editingTheme && (
                        <Section key={editingTheme.id} title={themes.some(t => t.id === editingTheme.id) ? `Редактирование "${editingTheme.name}"` : `Создание копии "${editingTheme.name}"`} description="Настройте цвета и сохраните тему." defaultOpen={true}>
                            {editingTheme.isCustom && (
                                <LabeledInput label="Название темы">
                                    <input
                                        type="text"
                                        value={editingTheme.name}
                                        onChange={e => setEditingTheme(t => t ? { ...t, name: e.target.value } : null)}
                                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </LabeledInput>
                            )}
                            <div className="flex border-b border-gray-200 dark:border-gray-700 mt-4">
                                <button onClick={() => setActiveEditorTab('light')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeEditorTab === 'light' ? 'border-b-2 border-blue-500 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Светлая</button>
                                <button onClick={() => setActiveEditorTab('dark')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeEditorTab === 'dark' ? 'border-b-2 border-blue-500 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Темная</button>
                            </div>
                            <div className="pt-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-lg p-4">
                                {activeEditorTab === 'light' && <ThemeEditor themeType="light" colorScheme={editingTheme.scheme} onUpdate={handleUpdateEditingThemeValue} />}
                                {activeEditorTab === 'dark' && <ThemeEditor themeType="dark" colorScheme={editingTheme.scheme} onUpdate={handleUpdateEditingThemeValue} />}
                            </div>
                            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button onClick={() => setEditingTheme(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors">Отмена</button>
                                <button onClick={handleSaveTheme} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                                    {!themes.some(t => t.id === editingTheme.id) ? 'Сохранить копию' : 'Сохранить'}
                                </button>
                            </div>
                        </Section>
                    )}

                    <Section title="Шаблоны карточек" description="Управление шаблонами для устройств." defaultOpen={false}>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                            {Object.values(templates).map((template: CardTemplate) => (
                                <div key={template.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 p-3 rounded-md border border-gray-100 dark:border-gray-700">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{template.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{template.deviceType}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => setEditingTemplate(template)} 
                                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                                            title="Редактировать шаблон"
                                        >
                                            <Icon icon="mdi:pencil" className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteTemplate(template.id)} 
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                            title="Удалить шаблон"
                                        >
                                            <Icon icon="mdi:trash-can-outline" className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="pt-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                <Icon icon="mdi:information-outline" className="w-4 h-4 inline mr-1" />
                                Чтобы создать новый шаблон, используйте контекстное меню на карточке устройства в режиме редактирования.
                            </p>
                            <button
                                onClick={() => setConfirmingResetTemplates(true)}
                                className="w-full text-sm text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 py-2.5 rounded-lg transition-colors border border-red-200 dark:border-red-900/30 mt-2"
                            >
                                Сбросить все шаблоны к стандартным
                            </button>
                        </div>
                    </Section>

                    <Section title="Резервное копирование" description="Сохраните все настройки в файл или восстановите их." defaultOpen={false}>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                                <Icon icon="mdi:download" className="w-5 h-5" />
                                Экспорт настроек
                            </button>
                            <label className="flex-1 flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer shadow-sm">
                                <Icon icon="mdi:upload" className="w-5 h-5" />
                                Импорт настроек
                                <input type="file" accept=".zip,.json" onChange={handleImport} className="hidden" />
                            </label>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Опасная зона</h4>
                            <button onClick={handleResetAllSettings} className="w-full text-sm text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 py-2.5 rounded-lg transition-colors border border-red-200 dark:border-red-900/30">
                                Сбросить все настройки и данные
                            </button>
                        </div>
                    </Section>

                    <div className="pt-8 mt-4 text-center border-t border-gray-100 dark:border-gray-800">
                        <button
                            onClick={handleResetAppearance}
                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:underline transition-colors"
                        >
                            Сбросить настройки внешнего вида
                        </button>
                    </div>
                </>
            )}
            
            {/* Confirm Delete Theme Dialog */}
            <ConfirmDialog
                isOpen={!!confirmingDeleteTheme}
                title="Удалить тему?"
                message={
                    <>
                        Вы уверены, что хотите удалить тему <strong className="text-gray-900 dark:text-white">"{confirmingDeleteTheme?.name}"</strong>?
                        <br />
                        Это действие нельзя отменить.
                    </>
                }
                onConfirm={() => {
                    if (confirmingDeleteTheme) deleteTheme(confirmingDeleteTheme.id);
                    setConfirmingDeleteTheme(null);
                }}
                onCancel={() => setConfirmingDeleteTheme(null)}
                confirmText="Удалить"
            />

            <ConfirmDialog
                isOpen={confirmingResetTemplates}
                title="Сбросить шаблоны?"
                message={
                    <>
                        Вы уверены, что хотите сбросить все шаблоны карточек к стандартным?
                        <br />
                        Все ваши пользовательские шаблоны и изменения будут утеряны.
                    </>
                }
                onConfirm={() => {
                    handleResetTemplates();
                    setConfirmingResetTemplates(false);
                }}
                onCancel={() => setConfirmingResetTemplates(false)}
                confirmText="Сбросить"
            />
            
            {/* Confirm Delete Server Dialog */}
            <ConfirmDialog
                isOpen={!!serverToDelete}
                title="Удалить сервер?"
                message={
                    <>
                        Вы уверены, что хотите удалить сервер <strong className="text-gray-900 dark:text-white">"{serverToDelete?.name}"</strong>?
                        <br />
                        Вам придется ввести URL и токен заново.
                    </>
                }
                onConfirm={() => {
                    if (serverToDelete) deleteServer(serverToDelete.id);
                    setServerToDelete(null);
                    if (selectedServerId === serverToDelete?.id) setSelectedServerId(null);
                }}
                onCancel={() => setServerToDelete(null)}
                confirmText="Удалить"
            />
        </>
    );

    if (variant === 'drawer') {
        return createPortal(
            <div className={`fixed inset-0 z-[60] flex justify-end transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                 {/* Backdrop - removed blur and color to allow previewing changes */}
                <div className="absolute inset-0" onClick={onClose} />
                
                {/* Drawer Panel */}
                <div className={`relative w-full max-w-lg h-full bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto transition-transform duration-300 border-l border-gray-200 dark:border-gray-700 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                     <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Настройки</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
                            <Icon icon="mdi:close" className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-4 space-y-8 pb-20">
                        {content}
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // Default Page Layout (Login Screen)
    return (
        <div className="w-full max-w-4xl mx-auto p-4 space-y-8 pb-20">
            {content}
        </div>
    );
};

export default Settings;
]]></content>
</change>

<change>
<file>src/components/TemplateEditorModal.tsx</file>
<description>Remove 'as any' casting causing syntax error</description>
<content><![CDATA[
import React, { useState, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, useDraggable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DeviceCard } from './DeviceCard';
import { CardTemplate, CardElement, DeviceType, CardElementId, ElementStyles, Device } from '../types';
import { nanoid } from 'nanoid';
import { Icon } from '@iconify/react';
import { useAppStore } from '../store/appStore';

interface TemplateEditorModalProps {
  templateToEdit: CardTemplate;
  onClose: () => void;
}

const ELEMENT_LABELS: Record<CardElementId, string> = {
  name: 'Название',
  icon: 'Иконка',
  value: 'Значение',
  unit: 'Единица изм.',
  chart: 'График',
  status: 'Статус',
  slider: 'Слайдер',
  temperature: 'Текущая темп.',
  'target-temperature': 'Термостат (кольцо)',
  'hvac-modes': 'Режимы климата',
  'linked-entity': 'Связанное устройство',
  battery: 'Уровень заряда',
  'fan-speed-control': 'Скорость вентилятора',
  'target-temperature-text': 'Целевая темп. (Текст)',
  'current-temperature-prefixed': 'Текущая темп. (с префиксом)',
  'temperature-slider': 'Слайдер температуры'
};

interface SortableLayerItemProps {
  element: CardElement;
  isSelected: boolean;
  onSelect: (elementId: string) => void;
  onToggle: (elementId: string) => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}

const SortableLayerItem: React.FC<SortableLayerItemProps> = ({ element, isSelected, onSelect, onToggle, onToggleVisibility, onToggleLock, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: element.uniqueId });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const className = `flex items-center justify-between p-2 mb-2 rounded-md border cursor-pointer ${
    isSelected 
      ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-50 ring-2 ring-blue-500' 
      : 'bg-white dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
  }`;

  return (
    <div ref={setNodeRef} style={style} {...attributes} className={className} onClick={() => onSelect(element.uniqueId)}>
        <div className="flex items-center gap-2 overflow-hidden">
            <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(element.uniqueId)}
                onClick={e => e.stopPropagation()}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-blue-600 focus:ring-blue-500 bg-gray-100 dark:bg-gray-800 cursor-pointer"
            />
            <div {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 p-1">
                <Icon icon="mdi:drag" className="w-5 h-5" />
            </div>
            {element.locked && <Icon icon="mdi:pin" className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{ELEMENT_LABELS[element.id]}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }} className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 ${element.visible ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}`} title={element.visible ? "Скрыть" : "Показать"}>
                <Icon icon={element.visible ? "mdi:eye" : "mdi:eye-off"} className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onToggleLock(); }} className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 ${element.locked ? 'text-blue-500' : 'text-gray-400'}`} title={element.locked ? "Открепить" : "Закрепить"}>
                <Icon icon={element.locked ? "mdi:pin" : "mdi:pin-outline"} className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500" title="Удалить">
                <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
            </button>
        </div>
    </div>
  );
};

interface ElementPropertiesEditorProps {
    element: CardElement;
    template: CardTemplate;
    onChange: (updates: Partial<CardElement> | { styles: Partial<ElementStyles> }) => void;
    snapToGrid: boolean;
}

const ElementPropertiesEditor: React.FC<ElementPropertiesEditorProps> = ({ element, template, onChange, snapToGrid }) => {
    const GRID_STEP = 5;

    const updateStyle = (key: keyof ElementStyles, value: any) => {
        onChange({ styles: { [key]: value } });
    };

    const handleClearStyle = (key: keyof ElementStyles) => {
      const newStyles = { ...element.styles };
      delete newStyles[key];
      onChange({ styles: newStyles });
    };
    
    const handleNumericChange = (updateFunc: (val: number | undefined) => void, value: string, shouldSnap: boolean, allowUndefined: boolean = false, min: number | null = null) => {
        if (value.trim() === '' && allowUndefined) {
            updateFunc(undefined);
            return;
        }
        let numValue = parseFloat(value);
        if (isNaN(numValue)) {
            if (value.trim() === '' && !allowUndefined) {
                numValue = 0;
            } else {
                return;
            }
        }
        
        if(min !== null) numValue = Math.max(min, numValue);
        
        const finalValue = (shouldSnap && snapToGrid) ? Math.round(numValue / GRID_STEP) * GRID_STEP : numValue;
        updateFunc(finalValue);
    };

    const currentSizeMode = element.sizeMode || 'card';

    return (
        <div className="space-y-4 p-1">
            <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Координаты</label>
                    <div className="flex items-center gap-1 p-0.5 bg-gray-200 dark:bg-gray-900/50 rounded-md">
                        <button onClick={() => onChange({ sizeMode: 'card' })} className={`px-2 py-0.5 text-[10px] rounded transition-all ${currentSizeMode === 'card' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>Карточки</button>
                        <button onClick={() => onChange({ sizeMode: 'cell' })} className={`px-2 py-0.5 text-[10px] rounded transition-all ${currentSizeMode === 'cell' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>Ячейки</button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-[10px] text-gray-400">Центр X (%)</span><input type="number" value={element.position.x} onChange={e => handleNumericChange((val) => onChange({ position: { ...element.position, x: val as number } }), e.target.value, true)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                    <div><span className="text-[10px] text-gray-400">Центр Y (%)</span><input type="number" value={element.position.y} onChange={e => handleNumericChange((val) => onChange({ position: { ...element.position, y: val as number } }), e.target.value, true)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                    <div><span className="text-[10px] text-gray-400">Ширина (%)</span><input type="number" min="0" value={element.size.width} onChange={e => handleNumericChange((val) => onChange({ size: { ...element.size, width: val as number } }), e.target.value, true, false, 0)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                    <div><span className="text-[10px] text-gray-400">Высота (%)</span><input type="number" min="0" value={element.size.height} onChange={e => handleNumericChange((val) => onChange({ size: { ...element.size, height: val as number } }), e.target.value, true, false, 0)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" /></div>
                </div>
            </div>
            
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Z-Index (Слой)</label>
                <input type="number" value={element.zIndex} onChange={e => handleNumericChange((val) => onChange({ zIndex: val as number }), e.target.value, false)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" />
            </div>

            {(element.id === 'name' || element.id === 'value' || element.id === 'status' || element.id === 'unit' || element.id === 'temperature' || element.id === 'target-temperature-text' || element.id === 'current-temperature-prefixed') && (
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md space-y-2">
                     <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Типографика</label>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Размер шрифта (px)</label>
                        <input type="number" min="0" value={element.styles.fontSize || 14} onChange={e => handleNumericChange((val) => updateStyle('fontSize', val), e.target.value, false, false, 0)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Выравнивание текста</label>
                        <select value={element.styles.textAlign || 'left'} onChange={e => updateStyle('textAlign', e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm">
                            <option value="left">Слева</option>
                            <option value="center">По центру</option>
                            <option value="right">Справа</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Цвет текста (опционально)</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={element.styles.color || '#000000'} onChange={e => updateStyle('color', e.target.value)} className="w-8 h-8 border-none bg-transparent p-0" />
                            <button onClick={() => handleClearStyle('color')} className="text-xs text-red-500 hover:underline">Сброс</button>
                        </div>
                    </div>
                </div>
            )}

            {(element.id === 'value' || element.id === 'temperature' || element.id === 'target-temperature-text' || element.id === 'current-temperature-prefixed') && (
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Знаков после запятой</label>
                    <input type="number" min="0" max="5" placeholder="Авто" value={element.styles.decimalPlaces ?? ''} onChange={e => handleNumericChange((val) => updateStyle('decimalPlaces', val), e.target.value, false, true, 0)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" />
                </div>
            )}
            
            {element.id === 'icon' && (
                 <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md space-y-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Стили иконки</label>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Цвет (ВКЛ)</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={element.styles.onColor || '#FCD34D'} onChange={e => updateStyle('onColor', e.target.value)} className="w-8 h-8 border-none bg-transparent p-0" />
                            <button onClick={() => handleClearStyle('onColor')} className="text-xs text-red-500 hover:underline">Сброс</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Цвет (ВЫКЛ)</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={element.styles.offColor || '#9CA3AF'} onChange={e => updateStyle('offColor', e.target.value)} className="w-8 h-8 border-none bg-transparent p-0" />
                            <button onClick={() => handleClearStyle('offColor')} className="text-xs text-red-500 hover:underline">Сброс</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Фон (ВКЛ)</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={element.styles.iconBackgroundColorOn || '#FFFFFF'} onChange={e => updateStyle('iconBackgroundColorOn', e.target.value)} className="w-8 h-8 border-none bg-transparent p-0" />
                            <button onClick={() => handleClearStyle('iconBackgroundColorOn')} className="text-xs text-red-500 hover:underline">Сброс</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Фон (ВЫКЛ)</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={element.styles.iconBackgroundColorOff || '#FFFFFF'} onChange={e => updateStyle('iconBackgroundColorOff', e.target.value)} className="w-8 h-8 border-none bg-transparent p-0" />
                            <button onClick={() => handleClearStyle('iconBackgroundColorOff')} className="text-xs text-red-500 hover:underline">Сброс</button>
                        </div>
                    </div>
                 </div>
            )}

            {element.id === 'chart' && (
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md space-y-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Настройки графика</label>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Тип графика</label>
                        <select value={element.styles.chartType || 'gradient'} onChange={e => updateStyle('chartType', e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm">
                            <option value="line">Линия</option>
                            <option value="gradient">Градиент</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Период (часов)</label>
                        <input type="number" min="1" value={element.styles.chartTimeRange || 24} onChange={e => handleNumericChange((val) => updateStyle('chartTimeRange', val), e.target.value, false, false, 1)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm" />
                    </div>
                </div>
            )}
            
            {element.id === 'linked-entity' && (
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Показывать значение</label>
                    <input type="checkbox" checked={element.styles.showValue ?? true} onChange={e => updateStyle('showValue', e.target.checked)} className="accent-blue-600" />
                </div>
            )}
        </div>
    );
};

const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({ templateToEdit, onClose }) => {
  const { handleSaveTemplate, colorScheme } = useAppStore();
  const [template, setTemplate] = useState<CardTemplate>(JSON.parse(JSON.stringify(templateToEdit)));
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set());
  const [lastClickedElementId, setLastClickedElementId] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  const sensors = useSensors(useSensor(PointerSensor));

  const handleLayerDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
  
    const activeId = active.id as string;
    const overId = over.id as string;
  
    setTemplate(prev => {
      const oldIndex = prev.elements.findIndex(e => e.uniqueId === activeId);
      const newIndex = prev.elements.findIndex(e => e.uniqueId === overId);
      
      let newElements;
      
      if (selectedElementIds.has(activeId)) {
        // Group move
        const selectedItems = prev.elements.filter(el => selectedElementIds.has(el.uniqueId));
        const remainingItems = prev.elements.filter(el => !selectedElementIds.has(el.uniqueId));
        
        let overIndexInRemaining = remainingItems.findIndex(el => el.uniqueId === overId);
        
        if (overIndexInRemaining === -1) {
          const overIndexInFull = prev.elements.findIndex(el => el.uniqueId === overId);
          const selectedBeforeOver = prev.elements.slice(0, overIndexInFull).filter(el => selectedElementIds.has(el.uniqueId)).length;
          overIndexInRemaining = overIndexInFull - selectedBeforeOver;
        }

        remainingItems.splice(overIndexInRemaining, 0, ...selectedItems);
        newElements = remainingItems;

      } else {
        // Single item move
        newElements = arrayMove(prev.elements, oldIndex, newIndex);
      }
      
      return { ...prev, elements: newElements.map((el, index) => ({...el, zIndex: index + 1})) };
    });
  };

  const handleAddElement = (elementId: CardElementId) => {
    const newElement: CardElement = {
      id: elementId,
      uniqueId: nanoid(),
      visible: true,
      position: { x: 50, y: 50 },
      size: { width: 30, height: 20 },
      zIndex: template.elements.length + 1,
      styles: { fontSize: 14 },
      sizeMode: 'card',
      locked: false,
    };
    if (elementId === 'chart') newElement.size = { width: 100, height: 30 };
    if (elementId === 'icon') newElement.size = { width: 20, height: 20 };
    if (elementId === 'slider') newElement.size = { width: 90, height: 20 };
    
    setTemplate(prev => ({ ...prev, elements: [...prev.elements, newElement] }));
    setSelectedElementIds(new Set([newElement.uniqueId]));
    setLastClickedElementId(newElement.uniqueId);
  };

  const handleRemoveElement = (uniqueId: string) => {
    setTemplate(prev => ({ ...prev, elements: prev.elements.filter(e => e.uniqueId !== uniqueId) }));
    setSelectedElementIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(uniqueId);
        return newSet;
    });
  };
  
  const handleElementUpdate = (uniqueId: string, updates: Partial<CardElement> | { styles: Partial<ElementStyles> }) => {
      setTemplate(prev => ({
          ...prev,
          elements: prev.elements.map(e => {
              if (e.uniqueId !== uniqueId) return e;
              // Remove explicit cast 'as any' here if causing issues, but structure seems safe now
              const { styles, position, size, ...otherUpdates } = updates as any;
              return { ...e, ...otherUpdates, 
                styles: styles ? { ...e.styles, ...styles } : e.styles, 
                position: position ? { ...e.position, ...position } : e.position, 
                size: size ? { ...e.size, ...size } : e.size 
              };
          })
      }));
  };

  const handleToggleVisibility = (uniqueId: string) => {
      setTemplate(prev => ({
          ...prev,
          elements: prev.elements.map(e => e.uniqueId === uniqueId ? { ...e, visible: !e.visible } : e)
      }));
  };

  const handleToggleLock = (uniqueId: string) => {
    setTemplate(prev => ({
        ...prev,
        elements: prev.elements.map(e => e.uniqueId === uniqueId ? { ...e, locked: !e.locked } : e)
    }));
  };
  
    const handleSelectElement = (elementId: string) => {
        const element = template.elements.find(el => el.uniqueId === elementId);
        if (element?.locked) {
            setSelectedElementIds(new Set());
            setLastClickedElementId(null);
            return;
        }
        setSelectedElementIds(new Set([elementId]));
        setLastClickedElementId(elementId);
    };

    const handleToggleSelection = (elementId: string) => {
        const element = template.elements.find(el => el.uniqueId === elementId);
        if (element?.locked) return;

        setSelectedElementIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(elementId)) {
                newSet.delete(elementId);
            } else {
                newSet.add(elementId);
            }
            return newSet;
        });
        setLastClickedElementId(elementId);
    };

    const handleCanvasClick = (e: React.MouseEvent, uniqueId: string) => {
        e.stopPropagation();
        handleSelectElement(uniqueId);
    };


  const handleCanvasDragEnd = (event: DragEndEvent) => {
    const { delta } = event;
    setActiveDragId(null);
    if (delta.x === 0 && delta.y === 0) return;

    const previewWidth = (template.width || 1) * 160;
    const previewHeight = (template.height || 1) * 160;

    const dxPercent = (delta.x / previewWidth) * 100;
    const dyPercent = (delta.y / previewHeight) * 100;

    setTemplate(prev => ({
        ...prev,
        elements: prev.elements.map(el => {
            if (!selectedElementIds.has(el.uniqueId)) return el;

            let newX = el.position.x + dxPercent;
            let newY = el.position.y + dyPercent;

            if (snapToGrid) {
                newX = Math.round(newX / 5) * 5;
                newY = Math.round(newY / 5) * 5;
            }

            return { ...el, position: { x: newX, y: newY } };
        })
    }));
  };

    const selectedElements = useMemo(() => 
        template.elements.filter(el => selectedElementIds.has(el.uniqueId)),
        [template.elements, selectedElementIds]
    );

    const selectionBoundingBox = useMemo(() => {
        if (selectedElements.length === 0) return null;

        let minX = Infinity, minY = Infinity;

        selectedElements.forEach(el => {
            const elTopLeftX = el.position.x - el.size.width / 2;
            const elTopLeftY = el.position.y - el.size.height / 2;
            if (elTopLeftX < minX) minX = elTopLeftX;
            if (elTopLeftY < minY) minY = elTopLeftY;
        });

        return { x: minX, y: minY };
    }, [selectedElements]);

    const handleGroupPositionChange = (axis: 'x' | 'y', valueStr: string) => {
        const value = parseFloat(valueStr);
        if (isNaN(value) || !selectionBoundingBox) return;

        const delta = axis === 'x' 
            ? value - selectionBoundingBox.x
            : value - selectionBoundingBox.y;

        if (delta === 0) return;

        setTemplate(prev => ({
            ...prev,
            elements: prev.elements.map(el => {
                if (selectedElementIds.has(el.uniqueId) && !el.locked) {
                    const newPosition = { ...el.position };
                    if (axis === 'x') {
                        newPosition.x += delta;
                    } else {
                        newPosition.y += delta;
                    }
                    return { ...el, position: newPosition };
                }
                return el;
            })
        }));
    };
  
  const handleAlign = (type: 'left' | 'h-center' | 'right' | 'top' | 'v-center' | 'bottom') => {
      const selected = template.elements.filter(el => selectedElementIds.has(el.uniqueId) && !el.locked);
      if (selected.length < 2) return;

      const getEffectiveWidth = (el: CardElement) => {
          return el.sizeMode === 'cell' && template.width ? el.size.width / template.width : el.size.width;
      };
      const getEffectiveHeight = (el: CardElement) => {
          return el.sizeMode === 'cell' && template.height ? el.size.height / template.height : el.size.height;
      };
  
      const boundingBox = selected.reduce((acc, el) => {
          const width = getEffectiveWidth(el);
          const height = getEffectiveHeight(el);
          return {
              minX: Math.min(acc.minX, el.position.x - width / 2),
              maxX: Math.max(acc.maxX, el.position.x + width / 2),
              minY: Math.min(acc.minY, el.position.y - height / 2),
              maxY: Math.max(acc.maxY, el.position.y + height / 2),
          };
      }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  
      const snapValue = (val: number) => snapToGrid ? Math.round(val / 5) * 5 : val;
  
      let targetLine: number;
      switch (type) {
          case 'left':    targetLine = snapValue(boundingBox.minX); break;
          case 'h-center':targetLine = snapValue((boundingBox.minX + boundingBox.maxX) / 2); break;
          case 'right':   targetLine = snapValue(boundingBox.maxX); break;
          case 'top':     targetLine = snapValue(boundingBox.minY); break;
          case 'v-center':targetLine = snapValue((boundingBox.minY + boundingBox.maxY) / 2); break;
          case 'bottom':  targetLine = snapValue(boundingBox.maxY); break;
      }
  
      const newElements = template.elements.map(el => {
          if (!selectedElementIds.has(el.uniqueId) || el.locked) return el;
          
          const newPosition = { ...el.position };
          const width = getEffectiveWidth(el);
          const height = getEffectiveHeight(el);
  
          switch (type) {
              case 'left':    newPosition.x = targetLine + width / 2; break;
              case 'h-center':newPosition.x = targetLine; break;
              case 'right':   newPosition.x = targetLine - width / 2; break;
              case 'top':     newPosition.y = targetLine + height / 2; break;
              case 'v-center':newPosition.y = targetLine; break;
              case 'bottom':  newPosition.y = targetLine - height / 2; break;
          }
         
          return { ...el, position: newPosition };
      });
      setTemplate(prev => ({ ...prev, elements: newElements }));
  };

  const handleSave = () => { handleSaveTemplate(template); onClose(); };

  const selectedElement = lastClickedElementId ? template.elements.find(e => e.uniqueId === lastClickedElementId) : null;
  
  const previewDevice: Device = useMemo(() => ({
      id: 'preview_device', name: 'Устройство (Пример)', status: 'Активно', state: 'on',
      type: (template.deviceType as unknown as DeviceType) || DeviceType.Sensor,
      haDomain: 'sensor', attributes: {}, brightness: 80, temperature: 22.5,
      targetTemperature: 24, hvacAction: 'heating', batteryLevel: 85, unit: '°C'
  }), [template.deviceType]);
  const mockAllDevices = new Map<string, Device>([[previewDevice.id, previewDevice]]);

  const availableElements = useMemo(() => {
    const base = [
        { id: 'name', label: 'Название' }, { id: 'icon', label: 'Иконка' },
        { id: 'status', label: 'Статус' }, { id: 'value', label: 'Значение (State)' },
        { id: 'unit', label: 'Единица измерения' },
    ];
    if (['sensor', 'climate', 'custom', 'humidifier'].includes(template.deviceType)) base.push({ id: 'chart', label: 'График' });
    if (['light', 'custom'].includes(template.deviceType)) base.push({ id: 'slider', label: 'Слайдер яркости' });
    if (['climate', 'humidifier', 'custom', 'sensor'].includes(template.deviceType)) base.push({ id: 'temperature', label: 'Текущая температура/значение' });
    if (['climate', 'humidifier', 'custom'].includes(template.deviceType)) {
      base.push({ id: 'target-temperature', label: 'Кольцо управления (Target)' });
      if (template.deviceType === 'climate') {
        base.push({ id: 'target-temperature-text', label: 'Целевая темп. (Текст)' });
        base.push({ id: 'current-temperature-prefixed', label: 'Текущая темп. (с префиксом)' });
        base.push({ id: 'temperature-slider', label: 'Слайдер температуры' });
      }
    }
    if (['climate', 'humidifier', 'custom'].includes(template.deviceType)) base.push({ id: 'hvac-modes', label: 'Кнопки режимов' });
    if (['custom'].includes(template.deviceType)) {
        base.push({ id: 'linked-entity', label: 'Связанное устройство' });
        base.push({ id: 'battery', label: 'Уровень заряда' });
    }
    if (['humidifier', 'custom'].includes(template.deviceType)) base.push({ id: 'fan-speed-control', label: 'Управление вентилятором' });
    return base;
  }, [template.deviceType]);

  const previewWidth = (template.width || 1) * 160;
  const previewHeight = (template.height || 1) * 160;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Редактор шаблона</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{template.deviceType}</p>
            </div>
            <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600">Отмена</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Сохранить</button>
            </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
            <div className="w-80 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Имя шаблона</label>
                    <input type="text" value={template.name} onChange={e => setTemplate(prev => ({...prev, name: e.target.value}))} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    <div className="flex gap-2 mt-2">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Ширина (ячейки)</label>
                            <input type="number" min="0.5" max="4" step="0.5" value={template.width || 1} onChange={e => setTemplate(prev => ({...prev, width: parseFloat(e.target.value) || 1}))} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Высота (ячейки)</label>
                            <input type="number" min="0.5" max="4" step="0.5" value={template.height || 1} onChange={e => setTemplate(prev => ({...prev, height: parseFloat(e.target.value) || 1}))} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <label htmlFor="snap-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">Привязка к сетке 5%</label>
                        <button id="snap-toggle" onClick={() => setSnapToGrid(!snapToGrid)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${snapToGrid ? 'bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'}`}>
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${snapToGrid ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Слои {selectedElementIds.size > 0 && `(выбрано: ${selectedElementIds.size})`}
                          </label>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setSelectedElementIds(new Set(template.elements.filter(e => !e.locked).map(e => e.uniqueId)))}
                              className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
                            >
                              Все
                            </button>
                            <button
                              onClick={() => setSelectedElementIds(new Set())}
                              className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLayerDragEnd}>
                            <SortableContext items={template.elements.map(e => e.uniqueId)} strategy={verticalListSortingStrategy}>
                                {template.elements.map(element => (
                                    <SortableLayerItem key={element.uniqueId} element={element} 
                                        isSelected={selectedElementIds.has(element.uniqueId)}
                                        onSelect={handleSelectElement}
                                        onToggle={handleToggleSelection}
                                        onToggleVisibility={() => handleToggleVisibility(element.uniqueId)}
                                        onToggleLock={() => handleToggleLock(element.uniqueId)}
                                        onDelete={() => handleRemoveElement(element.uniqueId)} />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Добавить элемент</label>
                        <select onChange={(e) => { if (e.target.value) { handleAddElement(e.target.value as CardElementId); e.target.value = ''; } }} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm outline-none">
                            <option value="">Выберите элемент...</option>
                            {availableElements.map(el => (<option key={el.id} value={el.id}>{el.label}</option>))}
                        </select>
                    </div>
                </div>
            </div>
            <DndContext sensors={sensors} onDragStart={(e) => setActiveDragId(e.active.id as string)} onDragEnd={handleCanvasDragEnd}>
                <div className="flex-1 bg-gray-100 dark:bg-gray-900 p-8 flex items-center justify-center relative overflow-hidden grid-background" onClick={() => setSelectedElementIds(new Set())}>
                    <div className="relative bg-transparent transition-all duration-300" style={{ width: previewWidth, height: previewHeight, }}>
                        <DeviceCard device={previewDevice} template={template} cardWidth={template.width || 1} cardHeight={template.height || 1} allKnownDevices={mockAllDevices} customizations={{}} isEditMode={false} isPreview={true} onDeviceToggle={() => {}} onTemperatureChange={() => {}} onBrightnessChange={() => {}} onHvacModeChange={() => {}} onPresetChange={() => {}} onFanSpeedChange={() => {}} onEditDevice={() => {}} haUrl="" signPath={async (p) => ({ path: p })} colorScheme={colorScheme['light']} isDark={false} />
                        {template.elements.map(el => el.visible && <DraggableElement key={el.uniqueId} element={el} template={template} selectedIds={Array.from(selectedElementIds)} onSelect={handleCanvasClick} activeDragId={activeDragId || ''} />)}
                    </div>
                    <div className="absolute bottom-4 right-4 text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">Превью (Light Mode)</div>
                </div>
            </DndContext>
            {selectedElementIds.size > 0 && (
              <div className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
                {selectedElementIds.size === 1 && selectedElement ? (
                  <>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <h3 className="font-bold text-gray-900 dark:text-white">Свойства: {ELEMENT_LABELS[selectedElement.id]}</h3>
                    </div>
                    <div className="p-4 overflow-y-auto no-scrollbar">
                      <ElementPropertiesEditor element={selectedElement} template={template} onChange={(updates) => handleElementUpdate(selectedElement.uniqueId, updates)} snapToGrid={snapToGrid}/>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <h3 className="font-bold text-gray-900 dark:text-white">{selectedElementIds.size} элемента выбрано</h3>
                    </div>
                    <div className="p-4 overflow-y-auto no-scrollbar space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Выравнивание</label>
                        <div className="grid grid-cols-3 gap-2">
                           {[ {icon: 'mdi:format-align-left', type: 'left'}, {icon: 'mdi:format-align-center', type: 'h-center'}, {icon: 'mdi:format-align-right', type: 'right'} ].map(item => <button key={item.type} onClick={(e) => { e.stopPropagation(); handleAlign(item.type as any); }} className="p-2 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"><Icon icon={item.icon} className="w-5 h-5 mx-auto" /></button>)}
                           {[ {icon: 'mdi:format-align-top', type: 'top'}, {icon: 'mdi:format-align-middle', type: 'v-center'}, {icon: 'mdi:format-align-bottom', type: 'bottom'} ].map(item => <button key={item.type} onClick={(e) => { e.stopPropagation(); handleAlign(item.type as any); }} className="p-2 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"><Icon icon={item.icon} className="w-5 h-5 mx-auto" /></button>)}
                        </div>
                      </div>
                       <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Позиция группы</label>
                            <div className="flex items-center gap-4">
                                <label htmlFor="group-pos-x" className="text-sm font-medium text-gray-700 dark:text-gray-300">X</label>
                                <input 
                                    id="group-pos-x"
                                    type="number" 
                                    value={selectionBoundingBox ? Math.round(selectionBoundingBox.x) : ''} 
                                    onChange={e => handleGroupPositionChange('x', e.target.value)}
                                    className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                                <label htmlFor="group-pos-y" className="text-sm font-medium text-gray-700 dark:text-gray-300">Y</label>
                                <input
                                    id="group-pos-y"
                                    type="number"
                                    value={selectionBoundingBox ? Math.round(selectionBoundingBox.y) : ''}
                                    onChange={e => handleGroupPositionChange('y', e.target.value)}
                                    className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

interface DraggableElementProps {
    element: CardElement;
    template: CardTemplate;
    selectedIds: string[];
    onSelect: (e: React.MouseEvent, id: string) => void;
    activeDragId: string;
}

const DraggableElement: React.FC<DraggableElementProps> = ({ element, template, selectedIds, onSelect, activeDragId }) => {
    const isSelected = selectedIds.includes(element.uniqueId);
    const isPartOfDragGroup = isSelected && selectedIds.includes(activeDragId || '');
    
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: element.uniqueId,
        disabled: element.locked || (isSelected && selectedIds.length > 1 && !isPartOfDragGroup),
    });

    const finalSize = {
        width: `${element.sizeMode === 'cell' && template.width ? element.size.width / template.width : element.size.width}%`,
        height: `${element.sizeMode === 'cell' && template.height ? element.size.height / template.height : element.size.height}%`,
    };

    return (
        <div ref={setNodeRef} {...attributes} {...listeners}
            onClick={(e) => { onSelect(e, element.uniqueId); }}
            className={`absolute transition-all duration-200 cursor-move ${isDragging ? 'z-50' : ''} ${isSelected ? 'border-2 border-blue-500 bg-blue-500/10' : 'border-2 border-transparent hover:border-blue-300/50'}`}
            style={{ left: `${element.position.x}%`, top: `${element.position.y}%`, width: finalSize.width, height: finalSize.height, transform: 'translate(-50%, -50%)', }}
        >
            {element.locked && <div className="absolute top-0.5 right-0.5 bg-gray-800/80 p-0.5 rounded-full text-white"><Icon icon="mdi:pin" className="w-2.5 h-2.5" /></div>}
        </div>
    );
};


export default TemplateEditorModal;
]]></content>
</change>

<change>
<file>src/config/defaults.ts</file>
<description>Remove explicit type assertion 'as' from appleTheme import usage</description>
<content><![CDATA[
import {
    CardTemplates,
    ColorScheme,
    CardTemplate,
    DeviceType,
    ClockSettings,
    WeatherSettings,
    ThemeDefinition,
    AuroraSettings
} from '../types';
import { nanoid } from 'nanoid';
import appleTheme from '../apple-inspired-light.theme.json';

// --- Default Template IDs ---
export const DEFAULT_SENSOR_TEMPLATE_ID = 'default-sensor';
export const DEFAULT_LIGHT_TEMPLATE_ID = 'default-light';
export const DEFAULT_SWITCH_TEMPLATE_ID = 'default-switch';
export const DEFAULT_CLIMATE_TEMPLATE_ID = 'default-climate';
export const DEFAULT_HUMIDIFIER_TEMPLATE_ID = 'humidifier-card';
export const BEAUTIFUL_THERMOSTAT_TEMPLATE_ID = 'beautiful-thermostat';


// --- Default Font Family ---
export const DEFAULT_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// --- Default Templates ---
const defaultSensorTemplate: CardTemplate = {
  id: DEFAULT_SENSOR_TEMPLATE_ID, name: 'Стандартный сенсор', deviceType: 'sensor',
  styles: { },
  elements: [
    { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 7 }, size: { width: 65, height: 22 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 }, sizeMode: 'card', locked: false },
    { id: 'icon', uniqueId: nanoid(), visible: true, position: { x: 80, y: 7 }, size: { width: 15, height: 15 }, zIndex: 2, styles: {}, sizeMode: 'card', locked: false },
    { id: 'value', uniqueId: nanoid(), visible: true, position: { x: 8, y: 35 }, size: { width: 70, height: 40 }, zIndex: 2, styles: { decimalPlaces: 1, fontFamily: DEFAULT_FONT_FAMILY, fontSize: 52 }, sizeMode: 'card', locked: false },
    { id: 'unit', uniqueId: nanoid(), visible: true, position: { x: 70, y: 40 }, size: { width: 25, height: 25 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 24 }, sizeMode: 'card', locked: false },
    { id: 'chart', uniqueId: nanoid(), visible: true, position: { x: 0, y: 82 }, size: { width: 100, height: 18 }, zIndex: 1, styles: { chartTimeRange: 24, chartTimeRangeUnit: 'hours', chartType: 'gradient' }, sizeMode: 'card', locked: false },
    { id: 'status', uniqueId: nanoid(), visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {}, sizeMode: 'card', locked: false },
  ],
};

const defaultLightTemplate: CardTemplate = {
    id: DEFAULT_LIGHT_TEMPLATE_ID, name: 'Стандартный светильник', deviceType: 'light',
    styles: { },
    elements: [
      { id: 'icon', uniqueId: nanoid(), visible: true, position: { x: 8, y: 8 }, size: { width: 20, height: 20 }, zIndex: 2, styles: { onColor: 'rgb(59 130 246 / 1)' }, sizeMode: 'card', locked: false },
      { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 35 }, size: { width: 84, height: 22 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 }, sizeMode: 'card', locked: false },
      { id: 'status', uniqueId: nanoid(), visible: true, position: { x: 8, y: 58 }, size: { width: 84, height: 12 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 14 }, sizeMode: 'card', locked: false },
      { id: 'slider', uniqueId: nanoid(), visible: true, position: { x: 8, y: 78 }, size: { width: 84, height: 14 }, zIndex: 2, styles: {}, sizeMode: 'card', locked: false },
    ],
};

const defaultSwitchTemplate: CardTemplate = {
    id: DEFAULT_SWITCH_TEMPLATE_ID, name: 'Стандартный переключатель', deviceType: 'switch',
    styles: { },
    elements: [
      { id: 'icon', uniqueId: nanoid(), visible: true, position: { x: 8, y: 8 }, size: { width: 20, height: 20 }, zIndex: 2, styles: { onColor: 'rgb(59 130 246 / 1)' }, sizeMode: 'card', locked: false },
      { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 35 }, size: { width: 84, height: 22 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 }, sizeMode: 'card', locked: false },
      { id: 'status', uniqueId: nanoid(), visible: true, position: { x: 8, y: 58 }, size: { width: 84, height: 12 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 14 }, sizeMode: 'card', locked: false },
    ],
};

const defaultClimateTemplate: CardTemplate = {
  id: DEFAULT_CLIMATE_TEMPLATE_ID, name: 'Стандартный климат', deviceType: 'climate',
  styles: { },
  elements: [
    { id: 'temperature', uniqueId: nanoid(), visible: true, position: { x: 8, y: 15 }, size: { width: 40, height: 15 }, zIndex: 2, styles: { decimalPlaces: 0, fontFamily: DEFAULT_FONT_FAMILY, fontSize: 24 }, sizeMode: 'card', locked: false },
    { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 32 }, size: { width: 40, height: 10 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 }, sizeMode: 'card', locked: false },
    { id: 'status', uniqueId: nanoid(), visible: true, position: { x: 8, y: 44 }, size: { width: 40, height: 8 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 14 }, sizeMode: 'card', locked: false },
    { id: 'target-temperature', uniqueId: nanoid(), visible: true, position: { x: 25, y: 5 }, size: { width: 90, height: 90 }, zIndex: 1, styles: {}, sizeMode: 'card', locked: false },
    { id: 'hvac-modes', uniqueId: nanoid(), visible: true, position: { x: 80, y: 25 }, size: { width: 15, height: 50 }, zIndex: 2, styles: {}, sizeMode: 'card', locked: false },
    { id: 'linked-entity', uniqueId: nanoid(), visible: false, position: { x: 8, y: 8 }, size: { width: 10, height: 10 }, zIndex: 2, styles: { linkedEntityId: '', showValue: false }, sizeMode: 'card', locked: false },
  ],
};

const humidifierTemplate: CardTemplate = {
  id: "humidifier-card",
  name: "Увлажнитель (расширенный)",
  deviceType: "humidifier",
  styles: {},
  width: 2,
  height: 2,
  elements: [
    { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 5, y: 5 }, size: { width: 90, height: 8 }, zIndex: 2, styles: { textAlign: 'center', fontSize: 16 }, sizeMode: 'card', locked: false },
    { id: 'status', uniqueId: nanoid(), visible: true, position: { x: 5, y: 14 }, size: { width: 90, height: 7 }, zIndex: 2, styles: { textAlign: 'center', fontSize: 12 }, sizeMode: 'card', locked: false },
    { id: 'temperature', uniqueId: nanoid(), visible: true, position: { x: 5, y: 22 }, size: { width: 90, height: 7 }, zIndex: 2, styles: { textAlign: 'center', fontSize: 12 }, sizeMode: 'card', locked: false },
    { id: 'target-temperature', uniqueId: nanoid(), visible: true, position: { x: 20, y: 30 }, size: { width: 60, height: 60 }, zIndex: 1, styles: {}, sizeMode: 'card', locked: false },
    { id: 'fan-speed-control', uniqueId: nanoid(), visible: true, position: { x: 5, y: 85 }, size: { width: 90, height: 12 }, zIndex: 3, styles: { linkedFanEntityId: '' }, sizeMode: 'card', locked: false }
  ],
};

const customCardTemplate: CardTemplate = {
    id: 'custom-template', name: 'Стандартная кастомная', deviceType: 'custom',
    styles: { },
    width: 2,
    height: 2,
    elements: [
      { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 8 }, size: { width: 84, height: 15 }, zIndex: 1, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 }, sizeMode: 'card', locked: false },
    ],
};

const beautifulThermostatTemplate: CardTemplate = {
  id: BEAUTIFUL_THERMOSTAT_TEMPLATE_ID,
  name: 'Красивый термостат',
  deviceType: 'climate',
  width: 2,
  height: 2,
  styles: {},
  elements: [
    { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 50, y: 12 }, size: { width: 90, height: 10 }, zIndex: 1, styles: { textAlign: 'center', fontSize: 24 } , sizeMode: 'card', locked: false},
    { id: 'target-temperature-text', uniqueId: nanoid(), visible: true, position: { x: 50, y: 35 }, size: { width: 90, height: 25 }, zIndex: 1, styles: { textAlign: 'center', fontSize: 64 }, sizeMode: 'card', locked: false},
    { id: 'current-temperature-prefixed', uniqueId: nanoid(), visible: true, position: { x: 50, y: 58 }, size: { width: 90, height: 8 }, zIndex: 1, styles: { textAlign: 'center', fontSize: 16 }, sizeMode: 'card', locked: false},
    { id: 'temperature-slider', uniqueId: nanoid(), visible: true, position: { x: 50, y: 72 }, size: { width: 80, height: 5 }, zIndex: 1, styles: {}, sizeMode: 'card', locked: false},
    { id: 'hvac-modes', uniqueId: nanoid(), visible: true, position: { x: 50, y: 90 }, size: { width: 90, height: 12 }, zIndex: 1, styles: {}, sizeMode: 'card', locked: false}
  ]
};

export const defaultTemplates: CardTemplates = {
    [DEFAULT_SENSOR_TEMPLATE_ID]: defaultSensorTemplate,
    [DEFAULT_LIGHT_TEMPLATE_ID]: defaultLightTemplate,
    [DEFAULT_SWITCH_TEMPLATE_ID]: defaultSwitchTemplate,
    [DEFAULT_CLIMATE_TEMPLATE_ID]: defaultClimateTemplate,
    [BEAUTIFUL_THERMOSTAT_TEMPLATE_ID]: beautifulThermostatTemplate,
    'humidifier-card': humidifierTemplate,
    'custom-template': customCardTemplate,
};

// --- Default Color Scheme ---
const theme: any = appleTheme;
export const DEFAULT_COLOR_SCHEME: ColorScheme = theme.colorScheme;

// --- Other Default Settings ---
export const defaultClockSettings: ClockSettings = { format: '24h', showSeconds: true, size: 'md' };
export const DEFAULT_SIDEBAR_WIDTH = 320;
export const DEFAULT_SIDEBAR_VISIBLE = true;
export const DEFAULT_THEME_MODE: 'day' | 'night' | 'auto' | 'schedule' = 'auto';
export const DEFAULT_WEATHER_PROVIDER: 'openweathermap' | 'yandex' | 'foreca' = 'openweathermap';
export const DEFAULT_WEATHER_SETTINGS: WeatherSettings = {
  iconPack: 'default',
  forecastDays: 4,
};
export const DEFAULT_LOW_BATTERY_THRESHOLD = 20;
export const DEFAULT_AURORA_SETTINGS: AuroraSettings = {
  color1: '#00ffc8',
  color2: '#78c8ff',
  color3: '#00b4ff',
  speed: 22,
  intensity: 90,
  blur: 18,
  saturate: 140,
  starsEnabled: true,
  starsSpeed: 6,
};

// --- Built-in Themes ---
export const DEFAULT_THEMES: ThemeDefinition[] = [
    { id: 'apple-default', name: 'Стандартная', isCustom: false, scheme: DEFAULT_COLOR_SCHEME },
    { id: 'apple-graphite', name: 'Графит', isCustom: false, scheme: {"light":{"dashboardBackgroundType":"gradient","dashboardBackgroundColor1":"#EAEAEB","dashboardBackgroundColor2":"#DCDCDC","cardOpacity":0.85,"panelOpacity":0.75,"cardBorderRadius":16,"cardBorderWidth":0,"cardBorderColor":"#D1D1D6","cardBorderColorOn":"#0A84FF","iconBackgroundShape":"circle","iconBackgroundColorOn":"rgba(255, 255, 255, 0.9)","iconBackgroundColorOff":"rgba(255, 255, 255, 0.4)","cardBackground":"rgba(255, 255, 255, 0.8)","cardBackgroundOn":"rgba(255, 255, 255, 0.95)","tabTextColor":"#515154","activeTabTextColor":"#1D1D1F","tabIndicatorColor":"#1D1D1F","thermostatHandleColor":"#FFFFFF","thermostatDialTextColor":"#1D1D1F","thermostatDialLabelColor":"#515154","thermostatHeatingColor":"#F97316","thermostatCoolingColor":"#3B82F6","clockTextColor":"#1D1D1F","nameTextColor":"#1D1D1F","statusTextColor":"#515154","valueTextColor":"#1D1D1F","unitTextColor":"#1D1D1F","nameTextColorOn":"#1D1D1F","statusTextColorOn":"#515154","valueTextColorOn":"#1D1D1F","unitTextColorOn":"#1D1D1F"},"dark":{"dashboardBackgroundType":"color","dashboardBackgroundColor1":"#1C1C1E","cardOpacity":0.8,"panelOpacity":0.75,"cardBorderRadius":16,"cardBorderWidth":0,"cardBorderColor":"#48484A","cardBorderColorOn":"#0A84FF","iconBackgroundShape":"circle","iconBackgroundColorOn":"rgba(255, 255, 255, 0.15)","iconBackgroundColorOff":"rgba(255, 255, 255, 0.05)","cardBackground":"rgba(44, 44, 46, 0.8)","cardBackgroundOn":"rgba(60, 60, 62, 0.85)","tabTextColor":"#8E8E93","activeTabTextColor":"#F5F5F7","tabIndicatorColor":"#F5F5F7","thermostatHandleColor":"#1C1C1E","thermostatDialTextColor":"#F5F5F7","thermostatDialLabelColor":"#8E8E93","thermostatHeatingColor":"#F28C18","thermostatCoolingColor":"#0A84FF","clockTextColor":"#F5F5F7","nameTextColor":"#F5F5F7","statusTextColor":"#8E8E93","valueTextColor":"#F5F5F7","unitTextColor":"#F5F5F7","nameTextColorOn":"#F5F5F7","statusTextColorOn":"#8E8E93","valueTextColorOn":"#F5F5F7","unitTextColorOn":"#F5F5F7"}} },
    { id: 'apple-mint', name: 'Мята', isCustom: false, scheme: {"light":{"dashboardBackgroundType":"gradient","dashboardBackgroundColor1":"#F0F7F6","dashboardBackgroundColor2":"#E6F0EF","cardOpacity":0.85,"panelOpacity":0.75,"cardBorderRadius":16,"cardBorderWidth":0,"cardBorderColor":"#D1FAE5","cardBorderColorOn":"#059669","iconBackgroundShape":"circle","iconBackgroundColorOn":"rgba(255, 255, 255, 0.9)","iconBackgroundColorOff":"rgba(255, 255, 255, 0.4)","cardBackground":"rgba(255, 255, 255, 0.8)","cardBackgroundOn":"rgba(255, 255, 255, 0.95)","tabTextColor":"#374151","activeTabTextColor":"#065F46","tabIndicatorColor":"#059669","thermostatHandleColor":"#FFFFFF","thermostatDialTextColor":"#065F46","thermostatDialLabelColor":"#374151","thermostatHeatingColor":"#F97316","thermostatCoolingColor":"#3B82F6","clockTextColor":"#065F46","nameTextColor":"#374151","statusTextColor":"#6B7280","valueTextColor":"#065F46","unitTextColor":"#065F46","nameTextColorOn":"#065F46","statusTextColorOn":"#374151","valueTextColorOn":"#065F46","unitTextColorOn":"#065F46"},"dark":{"dashboardBackgroundType":"color","dashboardBackgroundColor1":"#1A2421","cardOpacity":0.8,"panelOpacity":0.75,"cardBorderRadius":16,"cardBorderWidth":0,"cardBorderColor":"#1E293B","cardBorderColorOn":"#34D399","iconBackgroundShape":"circle","iconBackgroundColorOn":"rgba(255, 255, 255, 0.15)","iconBackgroundColorOff":"rgba(255, 255, 255, 0.05)","cardBackground":"rgba(30, 41, 59, 0.8)","cardBackgroundOn":"rgba(38, 52, 75, 0.85)","tabTextColor":"#9CA3AF","activeTabTextColor":"#A7F3D0","tabIndicatorColor":"#34D399","thermostatHandleColor":"#1A2421","thermostatDialTextColor":"#A7F3D0","thermostatDialLabelColor":"#9CA3AF","thermostatHeatingColor":"#F28C18","thermostatCoolingColor":"#0A84FF","clockTextColor":"#A7F3D0","nameTextColor":"#D1D5DB","statusTextColor":"#9CA3AF","valueTextColor":"#A7F3D0","unitTextColor":"#A7F3D0","nameTextColorOn":"#A7F3D0","statusTextColorOn":"#9CA3AF","valueTextColorOn":"#A7F3D0","unitTextColorOn":"#A7F3D0"}} },
    { id: 'futuristic', name: 'Футуристика', isCustom: false, scheme: {"light":{"dashboardBackgroundType":"gradient","dashboardBackgroundColor1":"#f5f7fa","dashboardBackgroundColor2":"#eef2f7","cardOpacity":0.8,"panelOpacity":0.7,"cardBorderRadius":16,"cardBorderWidth":0,"cardBorderColor":"#D1D9E6","cardBorderColorOn":"#007A7A","iconBackgroundShape":"circle","iconBackgroundColorOn":"rgba(255, 255, 255, 0.9)","iconBackgroundColorOff":"rgba(255, 255, 255, 0.4)","cardBackground":"rgba(255, 255, 255, 0.8)","cardBackgroundOn":"rgba(255, 255, 255, 1.0)","tabTextColor":"#5c677d","activeTabTextColor":"#007a7a","tabIndicatorColor":"#007a7a","thermostatHandleColor":"#FFFFFF","thermostatDialTextColor":"#005a5a","thermostatDialLabelColor":"#5c677d","thermostatHeatingColor":"#ff6b6b","thermostatCoolingColor":"#4d96ff","clockTextColor":"#005a5a","nameTextColor":"#333d4f","statusTextColor":"#5c677d","valueTextColor":"#005a5a","unitTextColor":"#005a5a","nameTextColorOn":"#005a5a","statusTextColorOn":"#5c677d","valueTextColorOn":"#005a5a","unitTextColorOn":"#005a5a"},"dark":{"dashboardBackgroundType":"gradient","dashboardBackgroundColor1":"#1a2a3a","dashboardBackgroundColor2":"#101a24","cardOpacity":0.8,"panelOpacity":0.7,"cardBorderRadius":16,"cardBorderWidth":0,"cardBorderColor":"#2A3A4A","cardBorderColorOn":"#00DADA","iconBackgroundShape":"circle","iconBackgroundColorOn":"rgba(255, 255, 255, 0.15)","iconBackgroundColorOff":"rgba(255, 255, 255, 0.05)","cardBackground":"rgba(20, 30, 40, 0.8)","cardBackgroundOn":"rgba(25, 35, 45, 1.0)","tabTextColor":"#9cb3cc","activeTabTextColor":"#00dada","tabIndicatorColor":"#00dada","thermostatHandleColor":"#1a2a3a","thermostatDialTextColor":"#00dada","thermostatDialLabelColor":"#9cb3cc","thermostatHeatingColor":"#ff8787","thermostatCoolingColor":"#74afff","clockTextColor":"#00dada","nameTextColor":"#c0d4e7","statusTextColor":"#9cb3cc","valueTextColor":"#00dada","unitTextColor":"#00dada","nameTextColorOn":"#00dada","statusTextColorOn":"#9cb3cc","valueTextColorOn":"#00dada","unitTextColorOn":"#00dada"}} },
    { id: 'deep-space', name: 'Глубокий космос', isCustom: false, scheme: {"light":{"dashboardBackgroundType":"gradient","dashboardBackgroundColor1":"#D4DEE7","dashboardBackgroundColor2":"#BCC8D6","cardOpacity":0.85,"panelOpacity":0.75,"cardBorderRadius":16,"cardBorderWidth":0,"cardBorderColor":"#E2E8F0","cardBorderColorOn":"#3182CE","iconBackgroundShape":"circle","iconBackgroundColorOn":"rgba(255, 255, 255, 0.9)","iconBackgroundColorOff":"rgba(255, 255, 255, 0.4)","cardBackground":"rgba(255, 255, 255, 0.7)","cardBackgroundOn":"rgba(255, 255, 255, 0.9)","tabTextColor":"#4A5568","activeTabTextColor":"#1A202C","tabIndicatorColor":"#2D3748","thermostatHandleColor":"#FFFFFF","thermostatDialTextColor":"#1A202C","thermostatDialLabelColor":"#4A5568","thermostatHeatingColor":"#DD6B20","thermostatCoolingColor":"#3182CE","clockTextColor":"#1A202C","nameTextColor":"#2D3748","statusTextColor":"#718096","valueTextColor":"#1A202C","unitTextColor":"#1A202C","nameTextColorOn":"#1A202C","statusTextColorOn":"#2D3748","valueTextColorOn":"#1A202C","unitTextColorOn":"#1A202C"},"dark":{"dashboardBackgroundType":"color","dashboardBackgroundColor1":"#0a0f14","cardOpacity":0.8,"panelOpacity":0.7,"cardBorderRadius":16,"cardBorderWidth":0,"cardBorderColor":"#2D3748","cardBorderColorOn":"#89B3F8","iconBackgroundShape":"circle","iconBackgroundColorOn":"rgba(255, 255, 255, 0.15)","iconBackgroundColorOff":"rgba(255, 255, 255, 0.05)","cardBackground":"rgba(18, 25, 35, 0.8)","cardBackgroundOn":"rgba(25, 33, 45, 0.9)","tabTextColor":"#9FB1CC","activeTabTextColor":"#EAF0F6","tabIndicatorColor":"#89B3F8","thermostatHandleColor":"#121923","thermostatDialTextColor":"#EAF0F6","thermostatDialLabelColor":"#9FB1CC","thermostatHeatingColor":"#F6AD55","thermostatCoolingColor":"#63B3ED","clockTextColor":"#EAF0F6","nameTextColor":"#CBD5E0","statusTextColor":"#A0AEC0","valueTextColor":"#EAF0F6","unitTextColor":"#EAF0F6","nameTextColorOn":"#EAF0F6","statusTextColorOn":"#CBD5E0","valueTextColorOn":"#EAF0F6","unitTextColorOn":"#EAF0F6"}} },
    {
        id: 'tron',
        name: 'Трон',
        isCustom: false,
        scheme: {
            light: {
                dashboardBackgroundType: "gradient",
                dashboardBackgroundColor1: "#F0F9FF",
                dashboardBackgroundColor2: "#CFFAFE",
                dashboardBackgroundImageBlur: 0,
                dashboardBackgroundImageBrightness: 100,
                cardOpacity: 0.9,
                panelOpacity: 0.8,
                cardBorderRadius: 6,
                cardBorderWidth: 1,
                cardBorderColor: "#0891B2",
                cardBorderColorOn: "#0891B2",
                iconBackgroundShape: "rounded-square",
                iconBackgroundColorOn: "rgba(8, 145, 178, 0.15)",
                iconBackgroundColorOff: "rgba(8, 145, 178, 0.05)",
                cardBackground: "rgba(255, 255, 255, 0.9)",
                cardBackgroundOn: "rgba(224, 242, 254, 1)",
                tabTextColor: "#64748B",
                activeTabTextColor: "#0891B2",
                tabIndicatorColor: "#0891B2",
                thermostatHandleColor: "#FFFFFF",
                thermostatDialTextColor: "#0891B2",
                thermostatDialLabelColor: "#64748B",
                thermostatHeatingColor: "#EA580C",
                thermostatCoolingColor: "#06B6D4",
                clockTextColor: "#0891B2",
                weatherIconSize: 96,
                weatherForecastIconSize: 48,
                weatherCurrentTempFontSize: 36,
                weatherCurrentDescFontSize: 14,
                weatherForecastDayFontSize: 12,
                weatherForecastMaxTempFontSize: 18,
                weatherForecastMinTempFontSize: 14,
                nameTextColor: "#334155",
                statusTextColor: "#64748B",
                valueTextColor: "#0891B2",
                unitTextColor: "#0891B2",
                nameTextColorOn: "#0C4A6E",
                statusTextColorOn: "#0369A1",
                valueTextColorOn: "#0891B2",
                unitTextColorOn: "#0891B2"
            },
            dark: {
                dashboardBackgroundType: "gradient",
                dashboardBackgroundColor1: "#020617", // Nearly black
                dashboardBackgroundColor2: "#0B1120", // Dark blue-black
                dashboardBackgroundImageBlur: 0,
                dashboardBackgroundImageBrightness: 100,
                cardOpacity: 0.85,
                panelOpacity: 0.85,
                cardBorderRadius: 6, // Tech feel
                cardBorderWidth: 1,
                cardBorderColor: "#22D3EE",
                cardBorderColorOn: "#22D3EE",
                iconBackgroundShape: "rounded-square",
                iconBackgroundColorOn: "rgba(34, 211, 238, 0.15)",
                iconBackgroundColorOff: "rgba(34, 211, 238, 0.05)",
                cardBackground: "rgba(15, 23, 42, 0.6)", // Dark Slate
                cardBackgroundOn: "rgba(6, 182, 212, 0.25)", // Cyan glow
                tabTextColor: "#475569",
                activeTabTextColor: "#22D3EE", // Cyan Neon
                tabIndicatorColor: "#22D3EE",
                thermostatHandleColor: "#0F172A",
                thermostatDialTextColor: "#22D3EE",
                thermostatDialLabelColor: "#94A3B8",
                thermostatHeatingColor: "#F97316", // Neon Orange (Clu)
                thermostatCoolingColor: "#22D3EE", // Neon Blue (Tron)
                clockTextColor: "#22D3EE",
                weatherIconSize: 96,
                weatherForecastIconSize: 48,
                weatherCurrentTempFontSize: 36,
                weatherCurrentDescFontSize: 14,
                weatherForecastDayFontSize: 12,
                weatherForecastMaxTempFontSize: 18,
                weatherForecastMinTempFontSize: 14,
                nameTextColor: "#E2E8F0",
                statusTextColor: "#64748B",
                valueTextColor: "#22D3EE",
                unitTextColor: "#22D3EE",
                nameTextColorOn: "#FFFFFF",
                statusTextColorOn: "#A5F3FC",
                valueTextColorOn: "#FFFFFF",
                unitTextColorOn: "#FFFFFF"
            }
        }
    }
];
]]></content>
</change>
</changes>