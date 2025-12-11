/**
 * Confirm Dialog Component
 * 
 * Custom modal dialog for confirmation prompts (delete, discard changes, etc.)
 * Replaces browser's confirm() with a styled, accessible dialog.
 */

import * as React from 'react';

export interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDangerous?: boolean; // Use red color for destructive actions
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isDangerous = false,
}) => {
    if (!isOpen) {
        return null;
    }

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        } else if (e.key === 'Enter') {
            onConfirm();
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '20px',
            }}
            onClick={handleBackdropClick}
            onKeyDown={handleKeyDown}
        >
            <div
                style={{
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                    minWidth: '320px',
                    maxWidth: '500px',
                    padding: '24px',
                }}
                role="dialog"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-message"
            >
                {/* Title */}
                <h2
                    id="confirm-dialog-title"
                    style={{
                        margin: '0 0 16px 0',
                        fontSize: '18px',
                        fontWeight: 600,
                        color: isDangerous ? '#d32f2f' : '#323130',
                    }}
                >
                    {title}
                </h2>

                {/* Message */}
                <p
                    id="confirm-dialog-message"
                    style={{
                        margin: '0 0 24px 0',
                        fontSize: '14px',
                        color: '#605e5c',
                        lineHeight: '1.5',
                    }}
                >
                    {message}
                </p>

                {/* Buttons */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px',
                    }}
                >
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: 600,
                            border: '1px solid #8a8886',
                            backgroundColor: '#fff',
                            color: '#323130',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            transition: 'all 0.1s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f3f2f1';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#fff';
                        }}
                    >
                        {cancelText}
                    </button>

                    <button
                        onClick={onConfirm}
                        autoFocus
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: 600,
                            border: 'none',
                            backgroundColor: isDangerous ? '#d32f2f' : '#0078d4',
                            color: '#fff',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            transition: 'all 0.1s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = isDangerous ? '#b71c1c' : '#106ebe';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = isDangerous ? '#d32f2f' : '#0078d4';
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
