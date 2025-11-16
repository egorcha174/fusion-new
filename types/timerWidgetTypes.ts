import { DeviceType } from "../types";

export enum TimerEventType {
  Septic = "septic",
  Custom = "custom",
}

export interface TimerCardState {
  id: string;
  name: string;
  eventType: TimerEventType;
  daysTotal: number;
  daysLeft: number;
  bgColor: string;
  lastEventDate: string;
}

export interface TimerCardsState {
  items: TimerCardState[];
}

// Для управления таймерами из HA
export interface HassTimerState {
  id: string;
  name: string;
  lastEventDate: string;
  daysBetween: number;
}
