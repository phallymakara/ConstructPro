import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, maxWidth, children }) => {
  if (!isOpen) return null;

  return (
    <div className="erp-modal-overlay" onClick={onClose}>
      <div className="erp-modal" style={maxWidth ? { maxWidth } : undefined} onClick={e => e.stopPropagation()}>
        <div className="erp-modal-header">
          <h3 className="erp-modal-title">{title}</h3>
          <button
            onClick={onClose}
            className="erp-modal-close-btn"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
