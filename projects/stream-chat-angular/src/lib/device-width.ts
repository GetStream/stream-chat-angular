export type DeviceWidth = {
  device: 'mobile' | 'tablet' | 'full';
  width: number;
};

export const getDeviceWidth = (): DeviceWidth => {
  const width = window.innerWidth;
  if (width < 768) return { device: 'mobile', width };
  if (width < 1024) return { device: 'tablet', width };
  return { device: 'full', width };
};
