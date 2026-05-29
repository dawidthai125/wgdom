import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Props = { children: ReactNode; onClose: () => void };

type State = { error: Error | null };

export class SmsModalErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("EmployeeSmsModal crash", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={this.props.onClose}>
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-md p-5 space-y-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-2 text-destructive">
              <AlertTriangle size={18} className="shrink-0 mt-0.5"/>
              <p className="text-sm font-semibold">Nie udało się otworzyć SMS pilne</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Odśwież stronę (Ctrl+F5) i spróbuj ponownie. Jeśli problem wraca, daj znać administratorowi.
            </p>
            <button
              type="button"
              onClick={this.props.onClose}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              Zamknij
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
