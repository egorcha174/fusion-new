import { CardTemplate } from '../types';
import { nanoid } from 'nanoid';
import { DEFAULT_FONT_FAMILY } from '../config/defaults';

export const customCardTemplate: CardTemplate = {
    id: 'custom-template', name: 'Стандартная кастомная', deviceType: 'custom',
    styles: { },
    width: 2,
    height: 2,
    elements: [
      { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 8 }, size: { width: 84, height: 15 }, zIndex: 1, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 } },
    ],
};
