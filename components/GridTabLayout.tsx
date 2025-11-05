import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import DeviceCard from './DeviceCard';
import { Tab, Device, CardSize, LayoutItem } from '../types';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface GridTabLayoutProps {
  tab: Tab;
  allDevices: Map<string, Device>;
  onGridLayoutChange: (tabId: string, newLayout: LayoutItem[]) => void;
  onDeviceRemoveFromTab: (deviceId: string, tabId: string) => void;
  onDeviceToggle: (deviceId: string) => void;
  onTemperatureChange: (deviceId: string, change: number) => void;
  onBrightnessChange: (deviceId: string, brightness: number) => void;
  onPresetChange: (deviceId: string, preset: string) => void;
  onCameraCardClick: (device: Device) => void;
  isEditMode: boolean;
  onEditDevice: (device: Device) => void;
  onDeviceContextMenu: (event: React.MouseEvent, deviceId: string, tabId: string) => void;
  cardSize: CardSize;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
}

// Map card size to row height
const cardSizeToRowHeight: Record<CardSize, number> = {
    xs: 56,  // (96px card + 16px vertical margin) / 2 rows = 56
    sm: 66,  // (120+16)/2
    md: 80,  // (144+16)/2
    lg: 96,  // (176+16)/2
    xl: 112, // (208+16)/2
};

const GridTabLayout: React.FC<GridTabLayoutProps> = ({
  tab,
  allDevices,
  onGridLayoutChange,
  isEditMode,
  ...props
}) => {

  const handleLayoutChange = (newLayout: LayoutItem[]) => {
    // Prevent layout changes when not in edit mode
    if (isEditMode) {
      onGridLayoutChange(tab.id, newLayout);
    }
  };

  const handleClick = (e: React.MouseEvent, device: Device) => {
    if (isEditMode) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    // Logic from DraggableDeviceCard
    const isCamera = device.type === 18; // DeviceType.Camera
    const isTogglable = device.type !== 11 && device.type !== 3 && device.type !== 12 && !isCamera; // Thermostat, Climate, Sensor

    if (isTogglable) {
      props.onDeviceToggle(device.id);
    }
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={{ lg: tab.gridLayout }}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 24, md: 20, sm: 12, xs: 8, xxs: 4 }}
      rowHeight={cardSizeToRowHeight[props.cardSize]}
      margin={[16, 16]}
      onLayoutChange={handleLayoutChange}
      isDraggable={isEditMode}
      isResizable={isEditMode}
      measureBeforeMount={false}
      useCSSTransforms={true}
      compactType="vertical"
    >
      {(tab.gridLayout || []).map((item) => {
        const device = allDevices.get(item.i);
        if (!device) return <div key={item.i} />; // Render an empty div for missing devices

        return (
          <div 
            key={item.i} 
            className="group"
            onClick={(e) => handleClick(e, device)}
            onContextMenu={(e) => {
                if(isEditMode) e.preventDefault();
                props.onDeviceContextMenu(e, device.id, tab.id)
            }}
          >
            <DeviceCard
              device={device}
              onTemperatureChange={(change) => props.onTemperatureChange(device.id, change)}
              onBrightnessChange={(brightness) => props.onBrightnessChange(device.id, brightness)}
              onPresetChange={(preset) => props.onPresetChange(device.id, preset)}
              onCameraCardClick={props.onCameraCardClick}
              isEditMode={isEditMode}
              onEditDevice={() => props.onEditDevice(device)}
              onRemoveFromTab={() => props.onDeviceRemoveFromTab(device.id, tab.id)}
              cardSize={props.cardSize}
              haUrl={props.haUrl}
              signPath={props.signPath}
              getCameraStreamUrl={props.getCameraStreamUrl}
            />
             {isEditMode && <div className="absolute inset-0 bg-black/20 pointer-events-none group-hover:bg-black/0 transition-colors" />}
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
};

export default GridTabLayout;