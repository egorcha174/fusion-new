import { CardTemplate } from '../types';
import { nanoid } from 'nanoid';
import { DEFAULT_FONT_FAMILY, DEFAULT_SENSOR_TEMPLATE_ID } from '../config/defaults';

export const defaultSensorTemplate: CardTemplate = {
    id: DEFAULT_SENSOR_TEMPLATE_ID, name: 'Стандартный сенсор', deviceType: 'sensor',
    styles: { },
    width: 1,
    height: 1,
    elements: [
      { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 7 }, size: { width: 65, height: 22 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 } },
      { id: 'icon', uniqueId: nanoid(), visible: true, position: { x: 80, y: 7 }, size: { width: 15, height: 15 }, zIndex: 2, styles: {} },
      { id: 'value', uniqueId: nanoid(), visible: true, position: { x: 8, y: 35 }, size: { width: 70, height: 40 }, zIndex: 2, styles: { decimalPlaces: 1, fontFamily: DEFAULT_FONT_FAMILY, fontSize: 52 } },
      { id: 'unit', uniqueId: nanoid(), visible: true, position: { x: 70, y: 40 }, size: { width: 25, height: 25 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 24 } },
      { id: 'chart', uniqueId: nanoid(), visible: true, position: { x: 0, y: 82 }, size: { width: 100, height: 18 }, zIndex: 1, styles: { chartTimeRange: 24, chartTimeRangeUnit: 'hours', chartType: 'gradient' } },
      { id: 'status', uniqueId: nanoid(), visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
    ],
};
