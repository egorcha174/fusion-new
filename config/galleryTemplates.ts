
import { DeviceType } from '../types';
import { nanoid } from 'nanoid';
import { DEFAULT_FONT_FAMILY } from './defaults';

export interface GalleryTemplate {
  id: string;
  name: string;
  description: string;
  deviceType: 'sensor' | 'light' | 'switch' | 'climate' | 'humidifier' | 'custom';
  author: string;
  version: string;
  previewIcon: string; // Iconify name
  templateStructure: any; // The partial CardTemplate object
}

export const GALLERY_TEMPLATES: GalleryTemplate[] = [
  {
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
  },
  {
    id: 'simple-light-switch',
    name: 'Simple Light',
    description: 'Minimalist light card with a large toggle area.',
    deviceType: 'light',
    author: 'Fusion Team',
    version: '1.0.0',
    previewIcon: 'mdi:lightbulb',
    templateStructure: {
        name: 'Simple Light',
        deviceType: 'light',
        width: 1,
        height: 1,
        elements: [
            { id: 'icon', uniqueId: nanoid(), visible: true, position: { x: 50, y: 40 }, size: { width: 40, height: 40 }, zIndex: 1, styles: { onColor: '#F59E0B' } },
            { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 50, y: 80 }, size: { width: 90, height: 15 }, zIndex: 2, styles: { textAlign: 'center', fontSize: 12 } }
        ]
    }
  },
    {
    id: 'detailed-sensor',
    name: 'Detailed Sensor',
    description: 'Sensor card with a history chart and large value display.',
    deviceType: 'sensor',
    author: 'Fusion Team',
    version: '1.0.0',
    previewIcon: 'mdi:chart-bell-curve',
    templateStructure: {
        name: 'Detailed Sensor',
        deviceType: 'sensor',
        width: 2,
        height: 1,
        elements: [
            { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 5, y: 5 }, size: { width: 60, height: 20 }, zIndex: 2, styles: { fontSize: 14 } },
            { id: 'value', uniqueId: nanoid(), visible: true, position: { x: 5, y: 30 }, size: { width: 50, height: 40 }, zIndex: 2, styles: { fontSize: 36, fontWeight: 'bold' } },
             { id: 'unit', uniqueId: nanoid(), visible: true, position: { x: 55, y: 45 }, size: { width: 20, height: 20 }, zIndex: 2, styles: { fontSize: 18, color: '#9CA3AF' } },
            { id: 'chart', uniqueId: nanoid(), visible: true, position: { x: 60, y: 10 }, size: { width: 35, height: 80 }, zIndex: 1, styles: { chartType: 'gradient' } }
        ]
    }
  }
];
