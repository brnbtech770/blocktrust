"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  animation?: "fade-up" | "fade-in";
  className?: string;
  as?: "div" | "li" | "section" | "article";
  once?: boolean;
};

/**
 * Révélation au scroll — visible par défaut (SSR / sans JS), animation si IntersectionObserver dispo.
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
  const [revealed, setRevealed] = useState(false);
  const [canAnimate, setCanAnimate] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    setCanAnimate(true);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setRevealed(false);
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
    opacity: canAnimate && !revealed ? 0 : undefined,
  };

  const Tag = as as "div";
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      style={style}
      className={`${revealed && canAnimate ? `animate-${animation}` : ""} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
