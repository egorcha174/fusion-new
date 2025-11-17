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
                } as React.CSSProperties,
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