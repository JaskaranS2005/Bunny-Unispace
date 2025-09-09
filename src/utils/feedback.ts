/**
 * Triggers a short vibration on supported devices.
 */
export const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      // A short, crisp vibration for feedback
      navigator.vibrate(50);
    }
  };