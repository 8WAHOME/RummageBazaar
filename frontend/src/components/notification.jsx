// src/components/notification.jsx - UPDATED
import React, { useEffect, useState } from 'react';
import notificationStore from '../utils/notificationStore.js';
import { 
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

const Notification = () => {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const unsubscribe = notificationStore.subscribe(setNotification);
    return unsubscribe;
  }, []);

  if (!notification?.show) return null;

  const config = {
    success: {
      icon: CheckCircleIcon,
      bgColor: "bg-green-50 border-green-200",
      iconColor: "text-green-400",
      textColor: "text-green-800",
      buttonColor: "text-green-400 hover:bg-green-100",
      shadow: "shadow-lg shadow-green-100/50",
    },
    error: {
      icon: XCircleIcon,
      bgColor: "bg-red-50 border-red-200",
      iconColor: "text-red-400",
      textColor: "text-red-800",
      buttonColor: "text-red-400 hover:bg-red-100",
      shadow: "shadow-lg shadow-red-100/50",
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgColor: "bg-yellow-50 border-yellow-200",
      iconColor: "text-yellow-400",
      textColor: "text-yellow-800",
      buttonColor: "text-yellow-400 hover:bg-yellow-100",
      shadow: "shadow-lg shadow-yellow-100/50",
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: "bg-blue-50 border-blue-200",
      iconColor: "text-blue-400",
      textColor: "text-blue-800",
      buttonColor: "text-blue-400 hover:bg-blue-100",
      shadow: "shadow-lg shadow-blue-100/50",
    }
  };

  const currentConfig = config[notification.type] || config.info;
  const Icon = currentConfig.icon;

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in-right">
      <div className={`flex items-center gap-3 ${currentConfig.bgColor} ${currentConfig.shadow} border rounded-xl p-4 max-w-md min-w-[300px] backdrop-blur-sm`}>
        <Icon className={`w-6 h-6 ${currentConfig.iconColor}`} />
        <div className="flex-1">
          <p className={`font-medium ${currentConfig.textColor}`}>{notification.message}</p>
        </div>
        <button
          onClick={() => notificationStore.hide(notification.id)}
          className={`p-1 rounded-full ${currentConfig.buttonColor} transition-colors`}
          aria-label="Close notification"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Notification;