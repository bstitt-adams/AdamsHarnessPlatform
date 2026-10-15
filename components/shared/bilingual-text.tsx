"use client";

import { cn } from "@/lib/utils";

interface BilingualTextProps {
  en: string;
  es?: string | null;
  className?: string;
  secondaryClassName?: string;
}

export function BilingualText({
  en,
  es,
  className,
  secondaryClassName,
}: BilingualTextProps) {
  if (!es) {
    return <span className={className}>{en}</span>;
  }

  return (
    <span className={cn("flex flex-col gap-0.5", className)}>
      <span>{en}</span>
      <span className={cn("text-sm text-muted-foreground italic", secondaryClassName)}>{es}</span>
    </span>
  );
}
