import { CardTemplate } from '../types';
import { nanoid } from 'nanoid';
import { DEFAULT_FONT_FAMILY, DEFAULT_CLIMATE_TEMPLATE_ID } from '../config/defaults';

export const defaultClimateTemplate: CardTemplate = {
    id: DEFAULT_CLIMATE_TEMPLATE_ID, name: 'Стандартный климат', deviceType: 'climate',
    styles: { },
    width: 2,
    height: 2,
    elements: [
      { id: 'temperature', uniqueId: nanoid(), visible: true, position: { x: 8, y: 15 }, size: { width: 40, height: 15 }, zIndex: 2, styles: { decimalPlaces: 0, fontFamily: DEFAULT_FONT_FAMILY, fontSize: 24 } },
      { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 32 }, size: { width: 40, height: 10 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 } },
      { id: 'status', uniqueId: nanoid(), visible: true, position: { x: 8, y: 44 }, size: { width: 40, height: 8 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 14 } },
      { id: 'target-temperature', uniqueId: nanoid(), visible: true, position: { x: 25, y: 5 }, size: { width: 90, height: 90 }, zIndex: 1, styles: {} },
      { id: 'hvac-modes', uniqueId: nanoid(), visible: true, position: { x: 80, y: 25 }, size: { width: 15, height: 50 }, zIndex: 2, styles: {} },
      { id: 'linked-entity', uniqueId: nanoid(), visible: false, position: { x: 8, y: 8 }, size: { width: 10, height: 10 }, zIndex: 2, styles: { linkedEntityId: '', showValue: false } },
    ],
};
