'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export function LoadingFeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-5 bg-card/40 border-border/60 rounded-2xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 flex-1">
              <Skeleton className="w-11 h-11 rounded-xl bg-secondary/80 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-48 rounded-md bg-secondary/80" />
                  <Skeleton className="h-4 w-20 rounded-md bg-secondary/60" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-20 rounded bg-secondary/60" />
                  <Skeleton className="h-3 w-24 rounded bg-secondary/60" />
                  <Skeleton className="h-3 w-16 rounded bg-secondary/60" />
                </div>
              </div>
            </div>
            <div className="space-y-2 flex flex-col items-end">
              <Skeleton className="h-6 w-24 rounded-full bg-secondary/80" />
              <Skeleton className="h-4 w-16 rounded bg-secondary/60" />
            </div>
          </div>

          <div className="pt-3 border-t border-border/40 flex items-center justify-between">
            <div className="flex gap-2">
              <Skeleton className="h-4 w-14 rounded bg-secondary/60" />
              <Skeleton className="h-4 w-16 rounded bg-secondary/60" />
              <Skeleton className="h-4 w-12 rounded bg-secondary/60" />
            </div>
            <Skeleton className="h-4 w-20 rounded bg-secondary/60" />
          </div>
        </Card>
      ))}
    </div>
  );
}
