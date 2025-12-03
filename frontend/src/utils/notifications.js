// src/utils/notifications.js
// Custom notification system
class NotificationSystem {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create notification container
    this.container = document.createElement('div');
    this.container.className = 'fixed top-4 right-4 z-50 space-y-3 max-w-sm';
    document.body.appendChild(this.container);
  }

  show(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    const bgColor = {
      success: 'bg-emerald-500',
      error: 'bg-red-500',
      warning: 'bg-amber-500',
      info: 'bg-blue-500'
    }[type];

    const icon = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    }[type];

    notification.className = `p-4 rounded-xl text-white shadow-2xl transform transition-all duration-300 ${bgColor} animate-in slide-in-from-right-full`;
    notification.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-lg">${icon}</span>
        <span class="flex-1 font-medium">${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200 transition-colors">
          ✕
        </button>
      </div>
    `;

    this.container.appendChild(notification);

    // Auto remove after duration
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
          if (notification.parentElement) {
            notification.remove();
          }
        }, 300);
      }
    }, duration);

    return notification;
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

// Create global instance
const notification = new NotificationSystem();

// Make it available globally
window.showNotification = (message, type = 'info') => {
  notification[type](message);
};

// Custom confirm dialog - FIXED to properly handle async/await
window.customConfirm = (message, title = 'Confirm Action') => {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    overlay.style.zIndex = '9999';
    
    const dialog = document.createElement('div');
    dialog.className = 'bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-auto animate-in zoom-in-95';
    dialog.innerHTML = `
      <div class="text-center">
        <div class="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">${title}</h3>
        <p class="text-gray-600 mb-6">${message}</p>
        <div class="flex gap-3">
          <button class="flex-1 bg-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-400 transition-colors" id="cancel-btn">
            Cancel
          </button>
          <button class="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors" id="confirm-btn">
            Confirm
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Prevent scrolling when modal is open
    document.body.style.overflow = 'hidden';

    const confirmBtn = dialog.querySelector('#confirm-btn');
    const cancelBtn = dialog.querySelector('#cancel-btn');

    const cleanup = () => {
      overlay.style.opacity = '0';
      overlay.style.transform = 'scale(0.95)';
      document.body.style.overflow = ''; // Restore scrolling
      setTimeout(() => {
        if (overlay.parentElement) {
          overlay.remove();
        }
      }, 300);
    };

    const handleConfirm = () => {
      cleanup();
      setTimeout(() => resolve(true), 50);
    };

    const handleCancel = () => {
      cleanup();
      setTimeout(() => resolve(false), 50);
    };

    confirmBtn.onclick = handleConfirm;
    cancelBtn.onclick = handleCancel;

    // Close on overlay click
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        handleCancel();
      }
    };

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    // Cleanup event listener when done
    overlay.addEventListener('animationend', () => {
      document.removeEventListener('keydown', handleEscape);
    });
  });
};

// Replace native confirm with our custom one
window.confirm = (message) => customConfirm(message, 'Please Confirm');

export default notification;