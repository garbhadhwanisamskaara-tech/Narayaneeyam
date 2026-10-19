/** Display only: stored participation types and access rules are unchanged. */
export function participationLabel(type: string | null | undefined): string {
  if (type === "PAID") return "Needs Guru Approval";
  if (type === "FREE") return "Direct access";
  return "—";
}