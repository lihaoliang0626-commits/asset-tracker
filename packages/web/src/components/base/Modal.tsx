import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string | React.ReactNode;
  headerAside?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disableAutoFocus?: boolean;
}

/**
 * 模态框组件
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  headerAside,
  children,
  footer,
  size = 'md',
  disableAutoFocus = false,
}) => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={sizes[size]}
        onOpenAutoFocus={(event) => {
          if (disableAutoFocus) {
            event.preventDefault();
          }
        }}
      >
        {title && (
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              {typeof title === 'string' ? (
                <DialogTitle>{title}</DialogTitle>
              ) : (
                title
              )}
              {headerAside && (
                <div className="pr-8 pt-1">
                  {headerAside}
                </div>
              )}
            </div>
          </DialogHeader>
        )}
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <DialogFooter className="mt-4">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
