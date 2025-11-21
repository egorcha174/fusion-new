  const getCardStyle = (): React.CSSProperties => {
      // For media player, we don't set a background color, as the image will be the background
      if (device.type === DeviceType.MediaPlayer && (device.state === 'playing' || device.state === 'paused') && device.entityPictureUrl) {
          return {
              backgroundColor: '#000', // Fallback color
              borderRadius: `var(--radius-card)`,
          };
      }
      return { 
          backgroundColor: isOn ? 'var(--bg-card-on)' : 'var(--bg-card)',
          backdropFilter: 'blur(16px)',
          borderRadius: `var(--radius-card)`,
      };
  }

  const handleCardClick = (e: React.MouseEvent) => {
      if (isTogglable && !isEditMode && !isPreview) {
          handleMainToggle(e);
      }
  };

  return (
    <div className={getCardClasses()} style={getCardStyle()} onClick={handleCardClick}>
       {animationOverlay}
       {renderContent()}
    </div>
  );
};

export default React.memo(DeviceCard);