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
