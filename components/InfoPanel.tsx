
import React, { useState, useEffect } from 'react';

const Clock: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    return (
        <div className="font-mono text-5xl sm:text-6xl md:text-7xl font-bold text-gray-100 tracking-tighter">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
    );
};


const InfoPanel: React.FC = () => {
    return (
        <aside className="fixed top-0 left-0 h-full bg-gray-900 ring-1 ring-white/5 text-white hidden lg:flex flex-col w-80 p-8">
            <Clock />
            {/* Placeholder for camera feed */}
            <div className="mt-8 aspect-video bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </div>
            {/* Placeholder for weather */}
            <div className="mt-8">
                <div className="flex items-center">
                     <div className="text-5xl">☁️</div>
                     <div className="ml-4">
                        <p className="text-3xl font-bold">6°C</p>
                        <p className="text-gray-400">Облачно</p>
                    </div>
                </div>
                 <div className="mt-6 flex justify-between text-center text-gray-400">
                    <div><p>ПТ</p><p className="text-2xl mt-1">🌥️</p><p className="font-semibold text-white mt-1">7°C</p></div>
                    <div><p>СБ</p><p className="text-2xl mt-1">☀️</p><p className="font-semibold text-white mt-1">5°C</p></div>
                    <div><p>ВС</p><p className="text-2xl mt-1">☁️</p><p className="font-semibold text-white mt-1">2°C</p></div>
                    <div><p>ПН</p><p className="text-2xl mt-1">🌙</p><p className="font-semibold text-white mt-1">-3°C</p></div>
                </div>
            </div>
        </aside>
    );
};

export default InfoPanel;
