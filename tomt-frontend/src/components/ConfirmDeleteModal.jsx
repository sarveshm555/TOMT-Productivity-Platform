import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ConfirmDeleteModal.css';

export default function ConfirmDeleteModal({
  isOpen,
  title = 'Delete Item?',
  message = 'Are you sure you want to permanently delete this item? This action cannot be undone.',
  itemPreview = null,
  confirmWord = 'DELETE',
  onConfirm,
  onClose,
}) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isMatched = inputValue.trim().toLowerCase() === confirmWord.toLowerCase();

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isMatched) {
      onConfirm();
      setInputValue('');
    }
  };

  return createPortal(
    <div className="confirm-delete-backdrop" onClick={onClose}>
      <div className="confirm-delete-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirm-delete-title">{title}</h3>
        <p className="confirm-delete-message">{message}</p>
        
        {itemPreview && (
          <div className="confirm-delete-preview">
            {itemPreview}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="confirm-delete-form">
          <label className="confirm-delete-label">
            Type <strong style={{ color: '#dc3545' }}>{confirmWord}</strong> to confirm:
          </label>
          <input
            type="text"
            className="confirm-delete-input"
            placeholder={`Type ${confirmWord} here...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />

          <div className="confirm-delete-actions">
            <button
              type="button"
              className="confirm-delete-btn cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="confirm-delete-btn delete"
              disabled={!isMatched}
            >
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
