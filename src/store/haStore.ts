          const allRoomsWithPhysicalDevices = Array.from(roomsWithPhysicalDevicesMap.values())
              .filter(room => room.devices.length > 0)
              .sort((a,b) => a.name.localeCompare(b.name));

          set(() => ({ 
            allKnownDevices: deviceMap, 
            allRoomsForDevicePage: rooms, 
            batteryDevices: batteryDevicesList, 
            allRoomsWithPhysicalDevices,
            allScenes: scenes.sort((a,b) => a.name.localeCompare(b.name)),
            allAutomations: automations.sort((a,b) => a.name.localeCompare(b.name)),
            allScripts: scripts.sort((a,b) => a.name.localeCompare(b.name)),
        }));
      } catch (e) {
          console.error("Error updating derived state:", e);
      }
  };