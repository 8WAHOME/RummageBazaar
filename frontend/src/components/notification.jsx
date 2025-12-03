// src/components/notification.jsx
import React, { useEffect, useState } from 'react';
import { 
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

const Notification = ({ show, message, type = "info", onClose }) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  if (!isVisible) return null;

  const config = {
    success: {
      icon: CheckCircleIcon,
      bgColor: "bg-green-50 border-green-200",
      iconColor: "text-green-400",
      textColor: "text-green-800",
      buttonColor: "text-green-400 hover:bg-green-100",
    },
    error: {
      icon: XCircleIcon,
      bgColor: "bg-red-50 border-red-200",
      iconColor: "text-red-400",
      textColor: "text-red-800",
      buttonColor: "text-red-400 hover:bg-red-100",
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgColor: "bg-yellow-50 border-yellow-200",
      iconColor: "text-yellow-400",
      textColor: "text-yellow-800",
      buttonColor: "text-yellow-400 hover:bg-yellow-100",
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: "bg-blue-50 border-blue-200",
      iconColor: "text-blue-400",
      textColor: "text-blue-800",
      buttonColor: "text-blue-400 hover:bg-blue-100",
    }
  };

  const currentConfig = config[type] || config.info;
  const Icon = currentConfig.icon;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className={`flex items-center gap-3 ${currentConfig.bgColor} border rounded-xl p-4 shadow-lg max-w-md`}>
        <Icon className={`w-6 h-6 ${currentConfig.iconColor}`} />
        <div className="flex-1">
          <p className={`font-medium ${currentConfig.textColor}`}>{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            if (onClose) onClose();
          }}
          className={`p-1 rounded-full ${currentConfig.buttonColor} transition-colors`}
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Notification;