import React from 'react';
import { Check, X } from 'lucide-react';

export default function Toast({ isVisible, message, icon = '✨', onClose }) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="bg-gray-900/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-xl border border-white/10 flex items-center gap-3 text-xs sm:text-sm font-medium">
        <span className="text-base">{icon}</span>
        <span className="font-['Prompt']">{message}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white ml-2 p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
