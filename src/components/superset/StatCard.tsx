"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// The one dashboard-card shape: caption label top-left, icon or action
// top-right, hero content below. Every Food stat card consumes this so the
// dashboard reads as one designed group instead of five near-misses.
export function StatCard({ label, icon, action, className, children }: {
  label: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("p-4 gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground flex items-center gap-2">
          {label}
        </span>
        {action ?? <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>}
      </div>
      {children}
    </Card>
  );
}
