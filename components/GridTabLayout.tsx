import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import DeviceCard from './DeviceCard';
import { Tab, Device, LayoutItem, DeviceType } from '../types';

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
  // cardSize is no longer needed for layout, but kept for DeviceCard if it uses it internally.
  // We can remove it if DeviceCard becomes fully adaptive. Let's assume it's still needed for now.
  // Update: It's better to make DeviceCard adaptive. We'll pass a size that's always consistent.
  // cardSize: CardSize;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
  // Injected by WidthProvider
  width?: number;
}


const GridTabLayout: React.FC<GridTabLayoutProps> = ({
  tab,
  allDevices,
  onGridLayoutChange,
  isEditMode,
  width, // from WidthProvider
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
    const isCamera = device.type === DeviceType.Camera;
    const isTogglable = device.type !== DeviceType.Thermostat && device.type !== DeviceType.Climate && device.type !== DeviceType.Sensor && !isCamera;

    if (isTogglable) {
      props.onDeviceToggle(device.id);
    }
  };
  
  // --- Dynamic Square Grid Calculation ---
  const cols = tab.gridCols || 24;
  const margin: [number, number] = [16, 16]; // Corresponds to Tailwind gap-4
  // Calculate row height based on width to create square grid cells.
  // The formula is: (total_width - total_horizontal_margin) / number_of_columns
  const rowHeight = width ? (width - margin[0] * (cols + 1)) / cols : 100;

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={{ lg: tab.gridLayout }}
      // Use the same column count for all breakpoints for predictable sizing,
      // let the container width handle responsiveness.
      // Or define responsive columns if needed, but squareness is only guaranteed at one breakpoint.
      // Let's keep it simple and consistent for now.
      cols={{ lg: cols, md: cols, sm: cols, xs: cols, xxs: cols }}
      rowHeight={rowHeight}
      margin={margin}
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
              // In grid mode, cardSize is determined by the grid, let's use a medium default for internal styles
              cardSize={'md'}
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