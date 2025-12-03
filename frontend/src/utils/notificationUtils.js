// src/utils/notifications.js
import notificationStore from './notificationStore.js';

class NotificationSystem {
  show(message, type = 'info', duration = 5000) {
    notificationStore.show(message, type, duration);
  }

  success(message, duration = 4000) {
    this.show(message, 'success', duration);
  }

  error(message, duration = 6000) {
    this.show(message, 'error', duration);
  }

  warning(message, duration = 5000) {
    this.show(message, 'warning', duration);
  }

  info(message, duration = 4000) {
    this.show(message, 'info', duration);
  }
}

// Create singleton instance
const notification = new NotificationSystem();

// Export for React components
export { notification };

// Export convenience methods (optional shortcuts)
export const notifySuccess = (message) => notification.success(message);
export const notifyError = (message) => notification.error(message);
export const notifyWarning = (message) => notification.warning(message);
export const notifyInfo = (message) => notification.info(message);

// For backward compatibility
export const showNotification = (message, type = 'info') => {
  notification[type](message);
};

export default notification;