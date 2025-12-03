// src/utils/notificationStore.js
class NotificationStore {
  constructor() {
    this.listeners = [];
    this.queue = [];
    this.currentNotification = null;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentNotification));
  }

  show(message, type = 'info', duration = 5000) {
    const id = Date.now();
    const notification = {
      id,
      show: true,
      message,
      type,
      duration
    };

    // If there's already a notification showing, add to queue
    if (this.currentNotification) {
      this.queue.push(notification);
      return;
    }

    this.currentNotification = notification;
    this.notifyListeners();

    // Auto-remove after duration
    setTimeout(() => {
      this.hide(id);
    }, duration);
  }

  hide(id) {
    if (this.currentNotification && this.currentNotification.id === id) {
      this.currentNotification = null;
      this.notifyListeners();

      // Show next in queue
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        setTimeout(() => this.show(next.message, next.type, next.duration), 300);
      }
    }
  }

  success(message, duration) {
    this.show(message, 'success', duration);
  }

  error(message, duration) {
    this.show(message, 'error', duration);
  }

  warning(message, duration) {
    this.show(message, 'warning', duration);
  }

  info(message, duration) {
    this.show(message, 'info', duration);
  }
}

// Create singleton instance
const notificationStore = new NotificationStore();
export default notificationStore;