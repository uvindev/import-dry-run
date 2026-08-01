export type AnalyticsEvent =
  | "workbench_viewed"
  | "import_checked"
  | "error_report_copied"
  | "team_interest"
  | "feedback_intent";

export function track(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;
  const plausible = (window as Window & { plausible?: (name: string) => void })
    .plausible;
  plausible?.(event);
}
