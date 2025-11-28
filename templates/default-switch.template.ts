import { CardTemplate } from '../types';
import { nanoid } from 'nanoid';
import { DEFAULT_FONT_FAMILY, DEFAULT_SWITCH_TEMPLATE_ID } from '../config/defaults';

export const defaultSwitchTemplate: CardTemplate = {
    id: DEFAULT_SWITCH_TEMPLATE_ID, name: 'Стандартный переключатель', deviceType: 'switch',
    styles: { },
    width: 1,
    height: 1,
    elements: [
      { id: 'icon', uniqueId: nanoid(), visible: true, position: { x: 8, y: 8 }, size: { width: 20, height: 20 }, zIndex: 2, styles: { onColor: 'rgb(59 130 246 / 1)' } },
      { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 35 }, size: { width: 84, height: 22 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 } },
      { id: 'status', uniqueId: nanoid(), visible: true, position: { x: 8, y: 58 }, size: { width: 84, height: 12 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 14 } },
    ],
};
