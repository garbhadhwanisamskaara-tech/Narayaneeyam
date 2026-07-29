import { useState } from "react";
import { Instagram } from "lucide-react";

export const INSTAGRAM_URL = "https://instagram.com/narayaneeyam_official";

const SAFFRON = "#D4521A";
const GOLD = "#C8922A";
const CREAM = "#FDF6EC";

type Props = {
  variant?: "icon" | "inline" | "cta";
  label?: string;
  size?: number;
  className?: string;
};

export default function InstagramFollow({
  variant = "icon",
  label = "Follow us on Instagram",
  size = 20,
  className = "",
}: Props) {
  const [hover, setHover] = useState(false);
  const color = hover ? GOLD : SAFFRON;

  const link = (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ color, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", fontWeight: 600 }}
      className={variant === "cta" ? "" : className}
    >
      <Instagram size={size} color={color} strokeWidth={2} />
      {variant !== "icon" && <span>{label}</span>}
    </a>
  );

  if (variant !== "cta") return link;

  return (
    <div
      className={`rounded-xl ${className}`}
      style={{ background: CREAM, padding: "20px 24px", marginTop: 40, textAlign: "center" }}
    >
      <p style={{ color: SAFFRON, marginBottom: 10, fontWeight: 600 }}>
        Enjoyed this? Follow us for daily chants and reflections
      </p>
      {link}
    </div>
  );
}
