"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Délai en millisecondes avant le déclenchement de l'animation. */
  delay?: number;
  /** Animation à utiliser (classe Tailwind sans préfixe `animate-`). */
  animation?: "fade-up" | "fade-in";
  /** Classe(s) Tailwind supplémentaires sur le wrapper. */
  className?: string;
  /** Element HTML rendu (par défaut `div`). */
  as?: "div" | "li" | "section" | "article";
  /** Re-déclenche l'animation à chaque entrée dans le viewport. */
  once?: boolean;
};

/**
 * Wrapper léger autour d'IntersectionObserver pour révéler ses enfants
 * lorsqu'ils entrent dans le viewport. Pas de dépendance externe.
 */
export default function Reveal({
  children,
  delay = 0,
  animation = "fade-up",
  className = "",
  as = "div",
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  const style: CSSProperties = {
    animationDelay: `${delay}ms`,
    animationFillMode: "both",
    opacity: visible ? undefined : 0,
  };

  const Tag = as as "div";
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      style={style}
      className={`${visible ? `animate-${animation}` : ""} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
