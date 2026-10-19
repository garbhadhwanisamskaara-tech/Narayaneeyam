export function characterCountState(length: number, maximum: number): "normal" | "warning" | "limit" {
  if (length >= maximum) return "limit";
  if (length >= maximum * 0.9) return "warning";
  return "normal";
}