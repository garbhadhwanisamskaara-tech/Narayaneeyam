export type ContributionDetails = {
  amount: string;
  paymentUrl: string;
  note: string;
};

export const isValidContributionAmount = (amount: string) => {
  const n = Number(amount);
  return Number.isFinite(n) && n > 0;
};

export const isValidPaymentUrl = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "https:" && !!u.hostname.includes(".");
  } catch {
    return false;
  }
};

export default function ContributionDetailsForm({
  value,
  onChange,
}: {
  value: ContributionDetails;
  onChange: (v: ContributionDetails) => void;
}) {
  const set = (patch: Partial<ContributionDetails>) => onChange({ ...value, ...patch });

  const amountTouched = value.amount.trim().length > 0;
  const urlTouched = value.paymentUrl.trim().length > 0;
  const amountBad = amountTouched && !isValidContributionAmount(value.amount);
  const urlBad = urlTouched && !isValidPaymentUrl(value.paymentUrl);

  const inputClass =
    "mt-2 w-full rounded-xl border-2 border-border bg-background px-4 py-3.5 font-sans text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary";

  return (
    <div className="space-y-6">
      <div>
        <p className="font-sans text-base font-semibold text-foreground">Contribution details</p>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Tell members how much to offer and where to send it. You will confirm each contribution
          yourself once you receive it.
        </p>
        <p className="mt-2 font-sans text-xs text-muted-foreground">
          <span className="text-destructive" aria-hidden="true">*</span> Required fields
        </p>
      </div>

      <div>
        <label htmlFor="contribution-amount" className="font-sans text-base font-semibold text-foreground">
          Contribution amount <span className="text-destructive" aria-hidden="true">*</span>
        </label>
        <input
          id="contribution-amount"
          type="number"
          inputMode="decimal"
          min="1"
          step="1"
          value={value.amount}
          onChange={(e) => set({ amount: e.target.value })}
          placeholder="501"
          className={inputClass}
        />
        {amountBad && (
          <p className="mt-2 font-sans text-sm text-destructive">
            Please enter an amount greater than zero.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="payment-url" className="font-sans text-base font-semibold text-foreground">
          Payment link <span className="text-destructive" aria-hidden="true">*</span>
        </label>
        <input
          id="payment-url"
          type="url"
          inputMode="url"
          maxLength={500}
          value={value.paymentUrl}
          onChange={(e) => set({ paymentUrl: e.target.value })}
          placeholder="https://..."
          className={inputClass}
        />
        <p className="mt-2 font-sans text-sm text-muted-foreground">
          The link members will open to send their contribution.
        </p>
        {urlBad && (
          <p className="mt-1 font-sans text-sm text-destructive">
            Please enter a complete link starting with https://
          </p>
        )}
      </div>

      <div>
        <label htmlFor="payment-note" className="font-sans text-base font-semibold text-foreground">
          A note for members{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="payment-note"
          rows={3}
          maxLength={500}
          value={value.note}
          onChange={(e) => set({ note: e.target.value })}
          placeholder="UPI preferred"
          className={inputClass}
        />
      </div>
    </div>
  );
}
