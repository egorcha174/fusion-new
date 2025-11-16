import React, { useState } from "react";
import SepticTimerWidget from "./SepticTimerWidget";
import { useTimerCardsStore } from "../store/timerCardsStore";
import { TimerCardState } from "../types/timerWidgetTypes";

const TimerCardsPanel: React.FC = () => {
  const timers = useTimerCardsStore((s) => s.items);
  const addTimer = useTimerCardsStore((s) => s.addTimer);
  const updateTimer = useTimerCardsStore((s) => s.updateTimer);
  const removeTimer = useTimerCardsStore((s) => s.removeTimer);
  const setLastEventDate = useTimerCardsStore((s) => s.setLastEventDate);
  
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editState, setEditState] = useState<Partial<TimerCardState> | null>(null);

  return (
    <div className="flex flex-wrap gap-6">
      {/* Кнопка добавления нового таймера */}
      <button
        onClick={() => addTimer()}
        className="bg-blue-100 text-blue-900 px-4 py-2 rounded-xl font-bold shadow"
      >
        + Таймер
      </button>
      {timers.map((timer) => (
        <div
          key={timer.id}
          className="relative group"
          onContextMenu={(e) => {
            e.preventDefault();
            setMenuOpenId(timer.id);
            setEditState(timer);
          }}
        >
          <SepticTimerWidget
            daysTotal={timer.daysTotal}
            daysLeft={timer.daysLeft}
            bgColor={timer.bgColor}
          />
          {menuOpenId === timer.id && (
            <div
              className="absolute top-0 left-0 z-30 bg-white rounded-xl px-4 py-3 shadow-xl ring-2 ring-blue-400 w-60 min-w-[220px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="font-bold mb-2">Настройки таймера</div>
              <label className="block mb-1">Имя:
                <input type="text" className="block w-full p-1 border rounded" value={editState?.name || ""} onChange={e => setEditState({ ...editState!, name: e.target.value })}/>
              </label>
              <label className="block mb-1">Дней между событиями:
                <input type="number" className="block w-full p-1 border rounded" value={editState?.daysTotal || 0} min={1} onChange={e => setEditState({ ...editState!, daysTotal: Number(e.target.value) })}/>
              </label>
              <label className="block mb-1">Цвет волны:
                <input type="color" className="block w-12 h-8" value={editState?.bgColor || "#2176ff"} onChange={e => setEditState({ ...editState!, bgColor: e.target.value })}/>
              </label>
              <label className="block mb-1">Дата последнего события:
                <input type="date" className="block w-full p-1 border rounded" value={editState?.lastEventDate || ""} onChange={e => setEditState({ ...editState!, lastEventDate: e.target.value })}/>
              </label>
              <div className="mt-2 flex gap-2">
                <button
                  className="bg-green-100 text-green-900 px-3 py-1 rounded font-bold"
                  onClick={() => { updateTimer(timer.id, editState!); setMenuOpenId(null); }}
                >Сохранить</button>
                <button className="bg-gray-100 text-gray-900 px-3 py-1 rounded font-bold" onClick={() => setMenuOpenId(null)}>Отмена</button>
                <button className="bg-red-100 text-red-900 px-3 py-1 rounded font-bold ml-auto" onClick={() => { removeTimer(timer.id); setMenuOpenId(null); }}>Удалить</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TimerCardsPanel;
