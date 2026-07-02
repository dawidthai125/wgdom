import { useEffect } from "react";

let lockCount = 0;
let touchGuardInstalled = false;

function syncLockClass() {
  document.documentElement.classList.toggle("modal-scroll-locked", lockCount > 0);
}

/** Diagnostyka / smoke — aktualna liczba aktywnych locków. */
export function getModalScrollLockCount(): number {
  return lockCount;
}

/**
 * Reset stuck lock — gdy brak otwartego modala w DOM, a lockCount > 0.
 * Wywoływane przy zmianie widoku (App goToView).
 */
export function reconcileModalScrollLock(): void {
  if (typeof document === "undefined" || lockCount <= 0) return;
  const hasOpenModal = document.querySelector(
    ".modal-overlay, .modal-sheet, [data-slot='sheet-content'], [data-slot='dialog-content']",
  );
  if (!hasOpenModal) {
    lockCount = 0;
    syncLockClass();
  }
}

/** Ref-counted scroll lock — blokuje rubber-band iOS za otwartym sheet/modalem. */
export function acquireModalScrollLock(): () => void {
  if (typeof document === "undefined") return () => {};
  lockCount += 1;
  syncLockClass();
  return () => {
    lockCount = Math.max(0, lockCount - 1);
    syncLockClass();
  };
}

export function useModalScrollLock(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    return acquireModalScrollLock();
  }, [open]);
}

function isScrollableModalSurface(el: Element): boolean {
  return Boolean(
    el.closest(".modal-sheet, .modal-overlay, [data-slot='sheet-content'], [data-slot='dialog-content']"),
  );
}

/** Globalny guard touchmove — instalowany raz w main.tsx. */
export function initModalScrollLock(): () => void {
  if (typeof document === "undefined" || touchGuardInstalled) return () => {};
  touchGuardInstalled = true;

  const onTouchMove = (e: TouchEvent) => {
    if (!document.documentElement.classList.contains("modal-scroll-locked")) return;
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (isScrollableModalSurface(target)) return;
    e.preventDefault();
  };

  document.addEventListener("touchmove", onTouchMove, { passive: false });

  return () => {
    document.removeEventListener("touchmove", onTouchMove);
    lockCount = 0;
    syncLockClass();
    touchGuardInstalled = false;
  };
}
