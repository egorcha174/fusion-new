import { CardTemplates } from '../types';
import { defaultSensorTemplate } from './default-sensor.template';
import { defaultLightTemplate } from './default-light.template';
import { defaultSwitchTemplate } from './default-switch.template';
import { defaultClimateTemplate } from './default-climate.template';
import { humidifierTemplate } from './humidifier-card.template';
import { customCardTemplate } from './custom-template.template';

export const defaultTemplates: CardTemplates = {
    [defaultSensorTemplate.id]: defaultSensorTemplate,
    [defaultLightTemplate.id]: defaultLightTemplate,
    [defaultSwitchTemplate.id]: defaultSwitchTemplate,
    [defaultClimateTemplate.id]: defaultClimateTemplate,
    [humidifierTemplate.id]: humidifierTemplate,
    [customCardTemplate.id]: customCardTemplate,
};
