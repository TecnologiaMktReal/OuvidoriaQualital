import { ReactNode, useEffect } from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface LayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

export function Layout({ children, hideSidebar = false }: LayoutProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {!hideSidebar && <Sidebar />}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-none w-full px-0 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}



