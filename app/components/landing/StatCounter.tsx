"use client";

import { useEffect, useRef, useState } from "react";

type StatCounterProps = {
  /** Valeur cible (chiffre principal). */
  value: number;
  /** Préfixe affiché avant le nombre (ex. "+"). */
  prefix?: string;
  /** Suffixe affiché après le nombre (ex. "%", "-bit"). */
  suffix?: string;
  /** Décimales à afficher. */
  decimals?: number;
  /** Durée de l'animation en ms. */
  duration?: number;
  /** Classe(s) Tailwind sur le span affichant la valeur. */
  className?: string;
};

/**
 * Compteur animé déclenché à l'entrée dans le viewport via IntersectionObserver.
 * Pas de librairie externe — utilise requestAnimationFrame.
 */
export default function StatCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1800,
  className = "",
}: StatCounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || startedRef.current) continue;
          startedRef.current = true;
          observer.unobserve(entry.target);

          const start = performance.now();
          const animate = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(value * eased);
            if (progress < 1) requestAnimationFrame(animate);
            else setDisplay(value);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value, duration]);

  const formatted = display.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
