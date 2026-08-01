"use client";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

export function IntentLink({
  event,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  event: AnalyticsEvent;
  children: ReactNode;
}) {
  return (
    <a {...props} onClick={() => track(event)}>
      {children}
    </a>
  );
}
