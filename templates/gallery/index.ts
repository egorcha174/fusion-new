import { GalleryTemplate } from './types';
import { modernThermostatGalleryTemplate } from './modern-thermostat.gallery';
import { simpleLightGalleryTemplate } from './simple-light.gallery';
import { detailedSensorGalleryTemplate } from './detailed-sensor.gallery';

export { GalleryTemplate } from './types';

export const GALLERY_TEMPLATES: GalleryTemplate[] = [
    modernThermostatGalleryTemplate,
    simpleLightGalleryTemplate,
    detailedSensorGalleryTemplate
];
