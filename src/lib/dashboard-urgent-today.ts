export type UrgentCategoryId =
  | "place"
  | "dokumentacja-ekipy"
  | "zdjecia"
  | "inspektor"
  | "wm"
  | "odbior"
  | "do-odzyskania";

export type UrgentTodayCategory = {
  id: UrgentCategoryId;
  label: string;
  count: number;
};

export type UrgentTodayInput = {
  needsUnsavedWeekAlert: boolean;
  payrollRolloverBlockersCount: number;
  consistencyAlertsCount: number;
  pendingReceiptsCount: number;
  pendingReportsCount: number;
  pendingPhotosCount: number;
  unseenInspectorFeedCount: number;
  inspectorNotesPendingCount: number;
  wmOverdueJobsCount: number;
  wmThisWeekJobsCount: number;
  handoverJobCount: number;
  recoverableAlertsCount: number;
};

function placeCount(input: UrgentTodayInput): number {
  return (
    (input.needsUnsavedWeekAlert ? 1 : 0)
    + input.payrollRolloverBlockersCount
    + input.consistencyAlertsCount
    + input.pendingReceiptsCount
  );
}

export function buildUrgentTodayCategories(input: UrgentTodayInput): {
  categories: UrgentTodayCategory[];
  urgentTodayTotal: number;
} {
  const categories: UrgentTodayCategory[] = [
    { id: "place", label: "Płace", count: placeCount(input) },
    { id: "dokumentacja-ekipy", label: "Dokumentacja ekipy", count: input.pendingReportsCount },
    { id: "zdjecia", label: "Zdjęcia", count: input.pendingPhotosCount },
    {
      id: "inspektor",
      label: "Inspektor",
      count: input.unseenInspectorFeedCount + input.inspectorNotesPendingCount,
    },
    {
      id: "wm",
      label: "WM",
      count: input.wmOverdueJobsCount + input.wmThisWeekJobsCount,
    },
    { id: "odbior", label: "Odbiory", count: input.handoverJobCount },
    { id: "do-odzyskania", label: "Do odzyskania", count: input.recoverableAlertsCount },
  ];

  const urgentTodayTotal = categories.reduce((sum, c) => sum + c.count, 0);
  return { categories, urgentTodayTotal };
}
