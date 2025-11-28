import { nanoid } from 'nanoid';
import { DEFAULT_FONT_FAMILY } from '../../config/defaults';
import { GalleryTemplate } from './types';

export const modernThermostatGalleryTemplate: GalleryTemplate = {
    id: 'modern-thermostat',
    name: 'Modern Thermostat',
    description: 'A clean thermostat layout with a large dial and mode controls.',
    deviceType: 'climate',
    author: 'Fusion Team',
    version: '1.0.0',
    previewIcon: 'mdi:thermostat',
    templateStructure: {
      name: 'Modern Thermostat',
      deviceType: 'climate',
      width: 2,
      height: 2,
      elements: [
        { id: 'target-temperature', uniqueId: nanoid(), visible: true, position: { x: 5, y: 5 }, size: { width: 90, height: 90 }, zIndex: 1, styles: {} },
        { id: 'temperature', uniqueId: nanoid(), visible: true, position: { x: 50, y: 50 }, size: { width: 40, height: 15 }, zIndex: 2, styles: { decimalPlaces: 1, fontFamily: DEFAULT_FONT_FAMILY, fontSize: 18, textAlign: 'center' } },
        { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 50, y: 80 }, size: { width: 90, height: 10 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 14, textAlign: 'center' } },
        { id: 'hvac-modes', uniqueId: nanoid(), visible: true, position: { x: 85, y: 5 }, size: { width: 10, height: 40 }, zIndex: 3, styles: {} },
      ],
    }
};
