import { CardTemplate } from '../types';
import { nanoid } from 'nanoid';
import { DEFAULT_HUMIDIFIER_TEMPLATE_ID } from '../config/defaults';

export const humidifierTemplate: CardTemplate = {
    id: DEFAULT_HUMIDIFIER_TEMPLATE_ID,
    name: "Увлажнитель (расширенный)",
    deviceType: "humidifier",
    styles: {},
    width: 2,
    height: 2,
    elements: [
      { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 5, y: 5 }, size: { width: 90, height: 8 }, zIndex: 2, styles: { textAlign: 'center', fontSize: 16 } },
      { id: 'status', uniqueId: nanoid(), visible: true, position: { x: 5, y: 14 }, size: { width: 90, height: 7 }, zIndex: 2, styles: { textAlign: 'center', fontSize: 12 } },
      { id: 'temperature', uniqueId: nanoid(), visible: true, position: { x: 5, y: 22 }, size: { width: 90, height: 7 }, zIndex: 2, styles: { textAlign: 'center', fontSize: 12 } },
      { id: 'target-temperature', uniqueId: nanoid(), visible: true, position: { x: 20, y: 30 }, size: { width: 60, height: 60 }, zIndex: 1, styles: {} },
      { id: 'fan-speed-control', uniqueId: nanoid(), visible: true, position: { x: 5, y: 85 }, size: { width: 90, height: 12 }, zIndex: 3, styles: { linkedFanEntityId: '' } }
    ],
};
