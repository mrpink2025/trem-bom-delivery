import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface DialogWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  hideTitle?: boolean;
  hideDescription?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function DialogWrapper({
  open,
  onOpenChange,
  title = "Dialog",
  description,
  hideTitle = false,
  hideDescription = false,
  children,
  className
}: DialogWrapperProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        <DialogHeader>
          {hideTitle ? (
            <VisuallyHidden>
              <DialogTitle>{title}</DialogTitle>
            </VisuallyHidden>
          ) : (
            <DialogTitle>{title}</DialogTitle>
          )}
          {description && (
            hideDescription ? (
              <VisuallyHidden>
                <DialogDescription>{description}</DialogDescription>
              </VisuallyHidden>
            ) : (
              <DialogDescription>{description}</DialogDescription>
            )
          )}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}