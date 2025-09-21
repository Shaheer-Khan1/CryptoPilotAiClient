import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

interface RedirectIfAuthenticatedProps {
  children: ReactNode;
  redirectTo?: string;
}

export function RedirectIfAuthenticated({ 
  children, 
  redirectTo = "/dashboard" 
}: RedirectIfAuthenticatedProps) {
  const { currentUser, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && currentUser) {
      setLocation(redirectTo);
    }
  }, [currentUser, loading, redirectTo, setLocation]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (currentUser) {
    return null;
  }

  return <>{children}</>;
}