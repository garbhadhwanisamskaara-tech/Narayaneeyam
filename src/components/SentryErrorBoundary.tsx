import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";

function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md space-y-4">
        <h1 className="text-2xl font-display text-foreground">Something went wrong</h1>
        <p className="text-muted-foreground font-body">
          We have been notified and are looking into it. Please try again.
        </p>
        <Button onClick={resetError} className="bg-primary text-primary-foreground">
          Try Again
        </Button>
      </div>
    </div>
  );
}

export const SentryErrorBoundary = Sentry.withErrorBoundary(
  ({ children }: { children: React.ReactNode }) => <>{children}</>,
  { fallback: (props) => <ErrorFallback error={props.error instanceof Error ? props.error : new Error(String(props.error))} resetError={props.resetError} /> }
);
