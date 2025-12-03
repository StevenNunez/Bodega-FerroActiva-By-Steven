
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardV2Props {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
}

export function StatCardV2({ title, value, icon: Icon, color }: StatCardV2Props) {
  return (
    <div className={cn("flex items-center gap-4 rounded-lg p-4", color)}>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20">
            <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
            <p className="text-sm text-white/80">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
  );
}
