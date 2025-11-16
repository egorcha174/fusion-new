import { TimerCardsState, TimerCardState, TimerEventType } from "../types/timerWidgetTypes";
import { nanoid } from "nanoid";
import { create } from "zustand";

/**
 * Zustand store для управления состояниями таймер-виджетов (SepticTimer и других событий).
 * Сохраняет данные в localStorage, чтобы таймеры были постоянными между перезапусками.
 */
export const useTimerCardsStore = create<TimerCardsState & {
  addTimer: (defaults?: Partial<TimerCardState>) => void;
  updateTimer: (id: string, changes: Partial<TimerCardState>) => void;
  removeTimer: (id: string) => void;
  setLastEventDate: (id: string, date: string) => void;
}>(() => ({
  items: [],

  addTimer(defaults = {}) {
    const daysTotal = defaults.daysTotal ?? 60;
    const daysLeft = defaults.daysLeft ?? daysTotal;
    const bgColor = defaults.bgColor ?? "#2176ff";
    const lastEventDate = defaults.lastEventDate ?? new Date().toISOString().split("T")[0];
    const name = defaults.name ?? "Септик";
    const eventType = defaults.eventType ?? TimerEventType.Septic;
    const id = nanoid();
    this.items.push({
      id,
      name,
      eventType,
      daysTotal,
      daysLeft,
      bgColor,
      lastEventDate,
    });
    saveLocal(this.items);
  },
  updateTimer(id, changes) {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      this.items[idx] = { ...this.items[idx], ...changes };
      saveLocal(this.items);
    }
  },
  removeTimer(id) {
    this.items = this.items.filter((i) => i.id !== id);
    saveLocal(this.items);
  },
  setLastEventDate(id, date) {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      this.items[idx].lastEventDate = date;
      // Перерасчет дней до следующей откачки
      this.items[idx].daysLeft = calcDaysLeft(this.items[idx].lastEventDate, this.items[idx].daysTotal);
      saveLocal(this.items);
    }
  }
}));

function saveLocal(items: TimerCardState[]) {
  localStorage.setItem("TIMER_WIDGETS", JSON.stringify(items));
}

function calcDaysLeft(lastEventDate: string, daysTotal: number) {
  const last = new Date(lastEventDate);
  const now = new Date();
  const daysPassed = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  const left = daysTotal - daysPassed;
  return left > 0 ? left : 0;
}
