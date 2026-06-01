import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Props = { children: ReactNode; label?: string; onReset?: () => void };
type State = { error: Error | null };

/** Chroni lazy-panele — błąd w jednej zakładce nie wywala całej aplikacji. */
export class ViewErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[${this.props.label ?? "view"}]`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center min-h-[40dvh] p-6 text-center">
          <AlertTriangle size={32} className="text-destructive mb-3 opacity-80" />
          <p className="text-sm font-semibold text-foreground mb-1">
            {this.props.label ? `Błąd: ${this.props.label}` : "Coś poszło nie tak"}
          </p>
          <p className="text-xs text-muted-foreground max-w-md mb-4">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset?.();
              window.location.reload();
            }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            Odśwież stronę
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
