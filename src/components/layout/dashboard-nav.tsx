import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Wallet,
  Brain,
  Bot,
  CreditCard,
  Settings,
  Video,
  Star,
} from "lucide-react";

const navItems = [
  { name: "Overview", href: "/", icon: BarChart3 },
  { name: "Portfolio", href: "/portfolio", icon: Wallet },
  { name: "Market Summary", href: "/analysis", icon: Brain },
  { name: "Trading Signals", href: "/signals", icon: Star },
  { name: "Chatbot Builder", href: "/chatbot-builder", icon: Bot },
  { name: "Shorts Generator", href: "/shorts-generator", icon: Video },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface DashboardNavProps {
  onNavigate: (href: string) => void;
}

export function DashboardNav({ onNavigate }: DashboardNavProps) {
  const [location] = useLocation();

  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 mb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center space-x-0 bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-2 backdrop-blur-xl border border-slate-200 dark:border-slate-600">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <div key={item.name} className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "whitespace-nowrap flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 font-medium",
                      isActive 
                        ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25" 
                        : "hover:bg-white dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    )}
                    onClick={() => onNavigate(item.href)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:inline">{item.name}</span>
                  </Button>
                  {index < navItems.length - 1 && (
                    <div className="w-px h-8 bg-slate-300 dark:bg-slate-600 mx-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 