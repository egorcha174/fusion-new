import { nanoid } from 'nanoid';
import { GalleryTemplate } from './types';

export const detailedSensorGalleryTemplate: GalleryTemplate = {
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
};
