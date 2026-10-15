/**
 * Toast utility functions for modern notifications
 * 
 * Use these instead of window.alert() for a better user experience
 */

import { toast } from "sonner";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Show a success toast notification
 */
export function showSuccess(message: string, options?: ToastOptions) {
  return toast.success(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    action: options?.action,
  });
}

/**
 * Show an error toast notification
 */
export function showError(message: string, options?: ToastOptions) {
  return toast.error(message, {
    description: options?.description,
    duration: options?.duration ?? 5000,
    action: options?.action,
  });
}

/**
 * Show a warning toast notification
 */
export function showWarning(message: string, options?: ToastOptions) {
  return toast.warning(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    action: options?.action,
  });
}

/**
 * Show an info toast notification
 */
export function showInfo(message: string, options?: ToastOptions) {
  return toast.info(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    action: options?.action,
  });
}

/**
 * Show a loading toast notification
 * Returns a function to dismiss the toast
 */
export function showLoading(message: string) {
  return toast.loading(message);
}

/**
 * Dismiss a specific toast by ID
 */
export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId);
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts() {
  toast.dismiss();
}

/**
 * Show a promise toast that updates based on promise state
 */
export function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
) {
  return toast.promise(promise, messages);
}

/**
 * Show a custom toast with more control
 */
export function showToast(message: string, options?: ToastOptions & { type?: ToastType }) {
  const type = options?.type ?? "info";
  
  switch (type) {
    case "success":
      return showSuccess(message, options);
    case "error":
      return showError(message, options);
    case "warning":
      return showWarning(message, options);
    case "loading":
      return showLoading(message);
    case "info":
    default:
      return showInfo(message, options);
  }
}
