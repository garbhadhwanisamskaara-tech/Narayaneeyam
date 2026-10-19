import { characterCountState } from "@/lib/characterCount";

export default function CharacterCounter({ value, maximum }: { value: string; maximum: number }) {
  const state = characterCountState(value.length, maximum);
  return (
    <p className={`mt-1 text-right font-sans text-xs ${
      state === "limit" ? "text-character-limit" : state === "warning" ? "text-character-warning" : "text-muted-foreground"
    }`}>
      {value.length} / {maximum}
    </p>
  );
}