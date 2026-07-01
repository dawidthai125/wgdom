/** NG-04.3 #009 krok 3 — tekstowy CTA do istniejącego JobFilePreviewModal (workspace handler). */
export function BoqAthExplainLink({
  onOpenAthPreview,
}: {
  onOpenAthPreview: () => void;
}) {
  return (
    <button
      type="button"
      className="min-h-[44px] text-[11px] text-primary font-medium hover:underline px-1"
      onClick={onOpenAthPreview}
      data-kosztorys-ath-explain-cta
    >
      Szczegóły w pełnym podglądzie ATH
    </button>
  );
}
