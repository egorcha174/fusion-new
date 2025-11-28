import { nanoid } from 'nanoid';
import { GalleryTemplate } from './types';

export const simpleLightGalleryTemplate: GalleryTemplate = {
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
};
