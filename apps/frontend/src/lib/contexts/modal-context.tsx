'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ModalOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

interface ModalContextType {
  showAlert: (message: string, options?: ModalOptions) => Promise<void>;
  showConfirm: (message: string, options?: ModalOptions) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

type ModalResolve = ((value: boolean) => void) | ((value?: void) => void);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{
    message: string;
    options?: ModalOptions;
    type: 'alert' | 'confirm';
    resolve: ModalResolve;
  } | null>(null);

  const showAlert = useCallback(
    (message: string, options?: ModalOptions): Promise<void> => {
      return new Promise((resolve) => {
        setModalContent({
          message,
          options,
          type: 'alert',
          resolve: () => {
            setIsOpen(false);
            resolve();
          },
        });
        setIsOpen(true);
      });
    },
    []
  );

  const showConfirm = useCallback(
    (message: string, options?: ModalOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setModalContent({
          message,
          options,
          type: 'confirm',
          resolve: (value: boolean) => {
            setIsOpen(false);
            resolve(value);
          },
        });
        setIsOpen(true);
      });
    },
    []
  );

  const handleConfirm = () => {
    if (modalContent) {
      if (modalContent.type === 'confirm') {
        (modalContent.resolve as (value: boolean) => void)(true);
      } else {
        (modalContent.resolve as (value?: void) => void)();
      }
      setModalContent(null);
    }
  };

  const handleCancel = () => {
    if (modalContent) {
      if (modalContent.type === 'confirm') {
        (modalContent.resolve as (value: boolean) => void)(false);
      } else {
        (modalContent.resolve as (value?: void) => void)();
      }
      setModalContent(null);
    }
  };

  const handleClose = () => {
    if (modalContent) {
      if (modalContent.type === 'confirm') {
        (modalContent.resolve as (value: boolean) => void)(false);
      } else {
        (modalContent.resolve as (value?: void) => void)();
      }
      setModalContent(null);
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalContent?.options?.title ||
                (modalContent?.type === 'confirm' ? 'Confirm Action' : 'Notification')}
            </DialogTitle>
            {modalContent?.options?.description && (
              <DialogDescription>
                {modalContent.options.description}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-foreground">{modalContent?.message}</p>
          </div>
          <DialogFooter>
            {modalContent?.type === 'confirm' && (
              <Button
                variant="outline"
                onClick={handleCancel}
              >
                {modalContent?.options?.cancelText || 'Cancel'}
              </Button>
            )}
            <Button
              variant={modalContent?.options?.variant || 'default'}
              onClick={handleConfirm}
            >
              {modalContent?.options?.confirmText ||
                (modalContent?.type === 'confirm' ? 'Confirm' : 'OK')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

