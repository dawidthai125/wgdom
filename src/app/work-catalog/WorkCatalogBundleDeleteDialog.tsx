import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";

type Props = {
  open: boolean;
  bundleName: string;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function WorkCatalogBundleDeleteDialog({
  open,
  bundleName,
  deleting,
  onOpenChange,
  onConfirm,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Usunąć pakiet?</AlertDialogTitle>
          <AlertDialogDescription>
            Pakiet <strong>{bundleName || "bez nazwy"}</strong> zostanie trwale usunięty z biblioteki.
            Dane synchronizują się z chmurą (<code>kw-wgdom-work-bundles</code>).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {deleting ? "Usuwanie…" : "Usuń pakiet"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
