import type { ReactElement, ReactNode } from "react";

export type ToastActionElement = ReactElement;

export interface ToastProps {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ToastActionElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: string;
}



