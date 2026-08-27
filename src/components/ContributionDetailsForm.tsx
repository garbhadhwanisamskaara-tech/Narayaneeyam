export type ContributionDetails = {
  amount: string;
  paymentUrl: string;
  note: string;
};

export const isValidContributionAmount = (amount: string) => {
  const n = Number(amount);
  return Number.isFinite(n) && n > 0;
};

export const isValidPaymentInstructions = (value: string) => {
  return value.trim().length > 0;
};
  const set = (patch: Partial<ContributionDetails>) => onChange({ ...value, ...patch });

  const amountTouched = value.amount.trim().length > 0;
  const paymentInstructionsTouched = value.paymentUrl.trim().length > 0;
  const amountBad = amountTouched && !isValidContributionAmount(value.amount);
  const paymentInstructionsBad =
    paymentInstructionsTouched && !isValidPaymentInstructions(value.paymentUrl);

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
        <label
          htmlFor="payment-instructions"
          className="font-sans text-base font-semibold text-foreground"
        >
          Payment instructions{" "}
          <span className="text-destructive" aria-hidden="true">*</span>
        </label>
      
        <textarea
          id="payment-instructions"
          rows={2}
          maxLength={500}
          value={value.paymentUrl}
          onChange={(e) => set({ paymentUrl: e.target.value })}
          placeholder="e.g. GPay 9876543210, UPI name@okaxis, or https://rzp.io/..."
          className={inputClass}
        />
      
        <p className="mt-2 font-sans text-sm text-muted-foreground">
          Enter a GPay number, UPI ID, bank-transfer instruction, or payment link.
        </p>

        {paymentInstructionsBad && (
          <p className="mt-1 font-sans text-sm text-destructive">
            Please enter payment instructions.
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
