"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmDialogVariant = "default" | "destructive" | "warning" | "success" | "info";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: ConfirmDialogVariant;
  showCancel?: boolean;
}

const variantIcons: Record<ConfirmDialogVariant, React.ReactNode> = {
  default: null,
  destructive: <XCircle className="h-6 w-6 text-red-500" />,
  warning: <AlertTriangle className="h-6 w-6 text-sky-500" />,
  success: <CheckCircle className="h-6 w-6 text-green-500" />,
  info: <Info className="h-6 w-6 text-blue-500" />,
};

const variantButtonStyles: Record<ConfirmDialogVariant, string> = {
  default: "",
  destructive: "bg-red-600 hover:bg-red-700 focus:ring-red-600",
  warning: "bg-sky-600 hover:bg-sky-700 focus:ring-sky-600",
  success: "bg-green-600 hover:bg-green-700 focus:ring-green-600",
  info: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-600",
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
  showCancel = true,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            {variantIcons[variant] && (
              <div className="flex-shrink-0 mt-0.5">
                {variantIcons[variant]}
              </div>
            )}
            <div className="flex-1">
              <AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-sm">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          {showCancel && (
            <AlertDialogCancel onClick={handleCancel}>
              {cancelText}
            </AlertDialogCancel>
          )}
          <AlertDialogAction
            onClick={handleConfirm}
            className={cn(variantButtonStyles[variant])}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for easier usage
interface UseConfirmDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  showCancel?: boolean;
}

interface UseConfirmDialogReturn {
  confirm: () => Promise<boolean>;
  ConfirmDialogComponent: React.FC;
}

export function useConfirmDialog(
  options: UseConfirmDialogOptions
): UseConfirmDialogReturn {
  const [open, setOpen] = React.useState(false);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback(() => {
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = React.useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  const ConfirmDialogComponent = React.useCallback(() => (
    <ConfirmDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleCancel();
        }
        setOpen(isOpen);
      }}
      title={options.title}
      description={options.description}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      variant={options.variant}
      showCancel={options.showCancel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ), [open, options, handleConfirm, handleCancel]);

  return { confirm, ConfirmDialogComponent };
}
