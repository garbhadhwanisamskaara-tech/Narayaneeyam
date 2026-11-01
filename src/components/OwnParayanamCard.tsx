import { Link } from "react-router-dom";
import { Flower2, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Home card that starts a new own (personal) parayanam. When the user may not
 * create one, the button is shown faded with a lock and does nothing.
 * Running own parayanams show their garden in the home garden section.
 */
export default function OwnParayanamCard() {
  const { user, canCreate } = useAuth();
  if (!user) return null;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-start gap-4">
        <Flower2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-semibold text-foreground">Your own parayanam</p>
          <div className="mt-4">
            {canCreate ? (
              <Link
                to="/parayanam/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Create your own parayanam
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground opacity-50 cursor-not-allowed select-none"
              >
                Create your own parayanam
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
