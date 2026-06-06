import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Wallet,
  Edit2,
  Trash2,
  X,
  ChevronDown,
} from "lucide-react";
import type { Job } from "@/app/app-domain";
import {
  type RecoverableCharge,
  type RecoverableChargeFilters,
  type RecoverableChargeSourceType,
  type RecoverableChargeStatus,
  DEFAULT_RECOVERABLE_CHARGE_FILTERS,
  RECOVERABLE_CHARGE_STATUSES,
  RECOVERABLE_CHARGE_SOURCE_LABELS,
  recoverableChargeStatusLabel,
  recoverableChargeSourceLabel,
  recoverableChargeDescriptionLine,
  fmtRecoverableAmount,
  filterRecoverableCharges,
  defaultRecoverableCharge,
  formatRecoverableChargeDate,
  tagsToInputValue,
  inputValueToTags,
  jobLabelForCharge,
  validateRecoverableChargeDraft,
  openRecoverableChargesKpi,
  recoverableChargeSourceListLabel,
} from "@/lib/recoverable-charges";
import { addDeletedRecoverableChargeId } from "@/lib/cloud-sync";

type FormMode = "create" | "edit" | null;

export function RecoverableChargesView({
  charges,
  jobs,
  createdByName,
  onChange,
  onCommit,
}: {
  charges: RecoverableCharge[];
  jobs: Job[];
  createdByName: string;
  onChange: (next: RecoverableCharge[]) => void;
  onCommit: (next?: RecoverableCharge[], deletedId?: string) => void;
}) {
  const [filters, setFilters] = useState<RecoverableChargeFilters>(DEFAULT_RECOVERABLE_CHARGE_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [draft, setDraft] = useState<RecoverableCharge | null>(null);

  const jobsById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);

  const filtered = useMemo(() => filterRecoverableCharges(charges, filters), [charges, filters]);
  const openKpi = useMemo(() => openRecoverableChargesKpi(charges), [charges]);

  const selected = selectedId ? charges.find((c) => c.id === selectedId) ?? null : null;

  const openCreate = (preset?: Partial<RecoverableCharge>) => {
    const base = defaultRecoverableCharge(createdByName);
    setDraft({ ...base, ...preset });
    setFormMode("create");
  };

  const openEdit = (charge: RecoverableCharge) => {
    setDraft({ ...charge });
    setFormMode("edit");
    setSelectedId(charge.id);
  };

  const closeForm = () => {
    setFormMode(null);
    setDraft(null);
  };

  const saveDraft = () => {
    if (!draft) return;
    const validation = validateRecoverableChargeDraft(draft);
    if (!validation.ok) return;
    const title = draft.title.trim() || draft.description.trim().slice(0, 80) || "Pozycja do rozliczenia";
    const now = new Date().toISOString();
    const normalized: RecoverableCharge = {
      ...draft,
      title,
      description: draft.description.trim(),
      clientName: draft.clientName.trim(),
      responsibleInspector: draft.responsibleInspector.trim(),
      updatedAt: now,
      sourceJobId: draft.sourceType === "job" ? draft.sourceJobId : "",
    };
    if (formMode === "create") {
      const next = [normalized, ...charges];
      onChange(next);
      onCommit(next);
      setSelectedId(normalized.id);
    } else {
      const next = charges.map((c) => (c.id === normalized.id ? normalized : c));
      onChange(next);
      onCommit(next);
    }
    closeForm();
  };

  const removeCharge = (id: string) => {
    if (!window.confirm("Usunąć tę pozycję z rejestru?")) return;
    addDeletedRecoverableChargeId(id);
    const next = charges.filter((c) => c.id !== id);
    onChange(next);
    onCommit(next, id);
    if (selectedId === id) setSelectedId(null);
    if (draft?.id === id) closeForm();
  };

  const setDraftSourceType = (sourceType: RecoverableChargeSourceType) => {
    if (!draft) return;
    if (sourceType === "standalone") {
      setDraft({ ...draft, sourceType, sourceJobId: "" });
    } else {
      setDraft({ ...draft, sourceType });
    }
  };

  const onSelectJob = (jobId: string) => {
    if (!draft) return;
    const job = jobsById.get(jobId);
    setDraft({
      ...draft,
      sourceJobId: jobId,
      clientName: job?.client?.trim() || draft.clientName,
    });
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className={`flex flex-col min-h-0 overflow-hidden ${selected && !formMode ? "flex-1 lg:flex-[1.4]" : "flex-1"}`}>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-start sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Wallet size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold">Do rozliczenia</h1>
                  <p className="text-xs text-muted-foreground">Kwoty do odzyskania od klientów — rejestr pozycji poza lub po kosztorysie</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openCreate()}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
              >
                <Plus size={14} />
                Dodaj pozycję
              </button>
            </div>

            <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 max-w-md">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Do rozliczenia</span>
              <span className="text-sm font-semibold">{openKpi.count} pozycji</span>
              <span className="text-sm font-bold text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {fmtRecoverableAmount(openKpi.sum)}
              </span>
            </div>

            <div className="flex flex-col lg:flex-row gap-2">
              <div className="relative flex-1 min-w-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Szukaj opisu, klienta, inspektora, tagów…"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  className="w-full bg-card border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as RecoverableChargeFilters["status"] }))}
                  className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm min-w-[8.5rem]"
                >
                  <option value="all">Wszystkie statusy</option>
                  {RECOVERABLE_CHARGE_STATUSES.map((s) => (
                    <option key={s} value={s}>{recoverableChargeStatusLabel(s)}</option>
                  ))}
                </select>
                <select
                  value={filters.sourceType}
                  onChange={(e) => setFilters((f) => ({ ...f, sourceType: e.target.value as RecoverableChargeFilters["sourceType"] }))}
                  className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm min-w-[8.5rem]"
                >
                  <option value="all">Wszystkie źródła</option>
                  <option value="job">{RECOVERABLE_CHARGE_SOURCE_LABELS.job}</option>
                  <option value="standalone">{RECOVERABLE_CHARGE_SOURCE_LABELS.standalone}</option>
                </select>
                <select
                  value={`${filters.sort}:${filters.sortDir}`}
                  onChange={(e) => {
                    const [sort, sortDir] = e.target.value.split(":") as [RecoverableChargeFilters["sort"], "asc" | "desc"];
                    setFilters((f) => ({ ...f, sort, sortDir }));
                  }}
                  className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm min-w-[9rem]"
                >
                  <option value="date:desc">Data ↓</option>
                  <option value="date:asc">Data ↑</option>
                  <option value="amount:desc">Kwota ↓</option>
                  <option value="amount:asc">Kwota ↑</option>
                  <option value="status:asc">Status</option>
                  <option value="client:asc">Klient A–Z</option>
                </select>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden min-w-0">
              <div className="hidden sm:grid sm:grid-cols-[5.5rem_minmax(0,1fr)_5.5rem_minmax(0,1.2fr)_4.5rem] xl:grid-cols-[5.5rem_minmax(0,1fr)_5.5rem_minmax(0,1fr)_5rem_4.5rem] gap-2 px-3 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/30">
                <span>Status</span>
                <span>Opis</span>
                <span className="text-right">Kwota</span>
                <span>Źródło</span>
                <span className="hidden xl:block">Inspektor</span>
                <span>Data</span>
              </div>
              {filtered.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  {charges.length === 0
                    ? "Brak pozycji — dodaj pierwszą pozycję do rozliczenia."
                    : "Brak wyników — zmień filtry lub wyszukiwanie."}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map((charge) => (
                    <button
                      key={charge.id}
                      type="button"
                      onClick={() => { setSelectedId(charge.id); setFormMode(null); }}
                      className={`w-full text-left px-3 py-3 transition-colors hover:bg-secondary/40 ${selectedId === charge.id ? "bg-primary/5" : ""}`}
                    >
                      <div className="sm:grid sm:grid-cols-[5.5rem_minmax(0,1fr)_5.5rem_minmax(0,1.2fr)_4.5rem] xl:grid-cols-[5.5rem_minmax(0,1fr)_5.5rem_minmax(0,1fr)_5rem_4.5rem] sm:gap-2 sm:items-center space-y-1 sm:space-y-0 min-w-0">
                        <span className="text-xs font-medium whitespace-nowrap">
                          {recoverableChargeStatusLabel(charge.status)}
                        </span>
                        <span className="text-sm truncate min-w-0" title={recoverableChargeDescriptionLine(charge)}>
                          {recoverableChargeDescriptionLine(charge)}
                        </span>
                        <span className="text-sm font-semibold sm:text-right whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {fmtRecoverableAmount(charge.amount)}
                        </span>
                        <span
                          className="text-xs text-muted-foreground truncate min-w-0"
                          title={recoverableChargeSourceLabel(charge, jobsById)}
                        >
                          {recoverableChargeSourceListLabel(charge, jobsById)}
                        </span>
                        <span className="hidden xl:block text-xs text-muted-foreground truncate min-w-0">
                          {charge.responsibleInspector || "—"}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRecoverableChargeDate(charge.createdAt)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{filtered.length} z {charges.length} pozycji</p>
          </div>
        </div>
      </div>

      {(selected || formMode) && (
        <div className="w-full lg:w-[22rem] xl:w-[24rem] shrink-0 border-t lg:border-t-0 lg:border-l border-border flex flex-col min-h-0 bg-card/50 overflow-hidden">
          {formMode && draft ? (
            <ChargeFormPanel
              draft={draft}
              jobs={jobs}
              mode={formMode}
              onChange={setDraft}
              onClose={closeForm}
              onSave={saveDraft}
              onSourceType={setDraftSourceType}
              onSelectJob={onSelectJob}
            />
          ) : selected ? (
            <ChargeDetailPanel
              charge={selected}
              jobsById={jobsById}
              onEdit={() => openEdit(selected)}
              onDelete={() => removeCharge(selected.id)}
              onClose={() => setSelectedId(null)}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ChargeDetailPanel({
  charge,
  jobsById,
  onEdit,
  onDelete,
  onClose,
}: {
  charge: RecoverableCharge;
  jobsById: Map<string, Job>;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const job = charge.sourceJobId ? jobsById.get(charge.sourceJobId) : undefined;

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <p className="text-sm font-semibold">Szczegóły</p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onEdit} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground" title="Edytuj">
            <Edit2 size={14} />
          </button>
          <button type="button" onClick={onDelete} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Usuń">
            <Trash2 size={14} />
          </button>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground lg:hidden">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 text-sm">
        <DetailRow label="Status" value={recoverableChargeStatusLabel(charge.status)} />
        <DetailRow label="Opis" value={recoverableChargeDescriptionLine(charge)} multiline />
        <DetailRow label="Kwota" value={fmtRecoverableAmount(charge.amount)} mono />
        <DetailRow
          label="Źródło"
          value={
            charge.sourceType === "job"
              ? job
                ? jobLabelForCharge(job)
                : charge.sourceJobId || RECOVERABLE_CHARGE_SOURCE_LABELS.job
              : charge.clientName || RECOVERABLE_CHARGE_SOURCE_LABELS.standalone
          }
        />
        <DetailRow label="Inspektor" value={charge.responsibleInspector || "—"} />
        <DetailRow label="Tagi" value={charge.tags.length ? charge.tags.join(", ") : "—"} />
        <div className="pt-2 border-t border-border space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Historia utworzenia</p>
          <DetailRow label="Utworzono" value={formatRecoverableChargeDate(charge.createdAt)} />
          <DetailRow label="Autor" value={charge.createdBy || "—"} />
          <DetailRow label="Ostatnia zmiana" value={formatRecoverableChargeDate(charge.updatedAt)} />
        </div>
        <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
          Powiązanie z fakturami i pełny workflow rozliczeń będzie dostępne w kolejnej wersji. Na razie panel służy wyłącznie do podglądu wpisów.
        </p>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  multiline,
  mono,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm ${multiline ? "whitespace-pre-wrap break-words" : "truncate"} ${mono ? "font-semibold" : ""}`} style={mono ? { fontFamily: "'JetBrains Mono', monospace" } : undefined}>
        {value}
      </p>
    </div>
  );
}

function ChargeFormPanel({
  draft,
  jobs,
  mode,
  onChange,
  onClose,
  onSave,
  onSourceType,
  onSelectJob,
}: {
  draft: RecoverableCharge;
  jobs: Job[];
  mode: "create" | "edit";
  onChange: (c: RecoverableCharge) => void;
  onClose: () => void;
  onSave: () => void;
  onSourceType: (t: RecoverableChargeSourceType) => void;
  onSelectJob: (jobId: string) => void;
}) {
  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => jobLabelForCharge(a).localeCompare(jobLabelForCharge(b), "pl")),
    [jobs],
  );
  const validation = useMemo(() => validateRecoverableChargeDraft(draft), [draft]);

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <p className="text-sm font-semibold">{mode === "create" ? "Nowa pozycja" : "Edycja"}</p>
        <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
        <div className="flex gap-1 p-1 bg-secondary rounded-xl">
          <button
            type="button"
            onClick={() => onSourceType("job")}
            className={`flex-1 py-2 rounded-lg text-xs font-medium ${draft.sourceType === "job" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            Z roboty
          </button>
          <button
            type="button"
            onClick={() => onSourceType("standalone")}
            className={`flex-1 py-2 rounded-lg text-xs font-medium ${draft.sourceType === "standalone" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            Poza systemem
          </button>
        </div>

        {draft.sourceType === "job" ? (
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Robota *</span>
            <div className="relative">
              <select
                value={draft.sourceJobId}
                onChange={(e) => onSelectJob(e.target.value)}
                className={`w-full appearance-none bg-secondary border rounded-xl px-3 py-2.5 text-sm pr-8 ${!validation.ok && validation.error === "missing_job" ? "border-destructive" : "border-border"}`}
              >
                <option value="">— wybierz robotę —</option>
                {sortedJobs.map((j) => (
                  <option key={j.id} value={j.id}>{jobLabelForCharge(j)}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            {!validation.ok && validation.error === "missing_job" && (
              <p className="text-xs text-destructive">{validation.message}</p>
            )}
          </label>
        ) : (
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Klient / opis źródła</span>
            <input
              type="text"
              value={draft.clientName}
              onChange={(e) => onChange({ ...draft, clientName: e.target.value })}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm"
              placeholder="np. Klient XYZ, naprawa po gwarancji"
            />
          </label>
        )}

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Tytuł (opcjonalnie)</span>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm"
            placeholder="Krótki tytuł pozycji"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Opis *</span>
          <textarea
            value={draft.description}
            onChange={(e) => onChange({ ...draft, description: e.target.value })}
            rows={3}
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm resize-y min-h-[4.5rem]"
            placeholder="Co do odzyskania, za co, kiedy…"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Kwota (PLN) *</span>
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={draft.amount > 0 ? draft.amount : ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "" || raw === "-") {
                onChange({ ...draft, amount: 0 });
                return;
              }
              const n = parseFloat(raw);
              if (!Number.isFinite(n) || n < 0) return;
              onChange({ ...draft, amount: n });
            }}
            className={`w-full bg-secondary border rounded-xl px-3 py-2.5 text-sm ${!validation.ok && validation.error === "invalid_amount" ? "border-destructive" : "border-border"}`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
          {!validation.ok && validation.error === "invalid_amount" && (
            <p className="text-xs text-destructive">{validation.message}</p>
          )}
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Status</span>
          <select
            value={draft.status}
            onChange={(e) => onChange({ ...draft, status: e.target.value as RecoverableChargeStatus })}
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm"
          >
            {RECOVERABLE_CHARGE_STATUSES.map((s) => (
              <option key={s} value={s}>{recoverableChargeStatusLabel(s)}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Inspektor odpowiedzialny</span>
          <input
            type="text"
            value={draft.responsibleInspector}
            onChange={(e) => onChange({ ...draft, responsibleInspector: e.target.value })}
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm"
            placeholder="Imię i nazwisko"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Tagi (po przecinku)</span>
          <input
            type="text"
            value={tagsToInputValue(draft.tags)}
            onChange={(e) => onChange({ ...draft, tags: inputValueToTags(e.target.value) })}
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm"
            placeholder="materiał, gwarancja, zlecenie dodatkowe"
          />
        </label>
      </div>
      <div className="shrink-0 px-4 py-3 border-t border-border flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border border-border hover:bg-secondary">
          Anuluj
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!validation.ok}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          Zapisz
        </button>
      </div>
    </div>
  );
}
