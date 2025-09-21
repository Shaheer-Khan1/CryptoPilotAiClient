import { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!currentUser) {
      setLocation("/login");
    }
  }, [currentUser, setLocation]);

  if (!currentUser) {
    return null;
  }

  return <>{children}</>;
}
