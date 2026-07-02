"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  X,
} from "lucide-react";
import {
  ONBOARDING_AUTO_DISMISS_KEY,
  ONBOARDING_STEPS,
  shouldAutoOpenOnboarding,
  type OnboardingStepId,
} from "@/lib/onboarding";

type Props = {
  onboardingCompletedAt: string | null;
  lastLoginAt: string | null;
};

type PanelMode = "tour" | "menu";

const HIGHLIGHT_CLASS = "onboarding-highlight-ring";

export default function OnboardingAssistant({
  onboardingCompletedAt: initialCompletedAt,
  lastLoginAt,
}: Props) {
  const pathname = usePathname();
  const [completedAt, setCompletedAt] = useState<string | null>(initialCompletedAt);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PanelMode>("tour");
  const [stepIndex, setStepIndex] = useState(0);
  const [completing, setCompleting] = useState(false);

  const currentStep = ONBOARDING_STEPS[stepIndex];
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;
  const isFirstStep = stepIndex === 0;

  const clearHighlight = useCallback(() => {
    document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((el) => {
      el.classList.remove(HIGHLIGHT_CLASS);
    });
  }, []);

  const applyHighlight = useCallback(
    (target?: string) => {
      clearHighlight();
      if (!target || pathname !== "/dashboard") return;
      const el = document.querySelector(`[data-onboarding-target="${target}"]`);
      if (!el) return;
      el.classList.add(HIGHLIGHT_CLASS);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [clearHighlight, pathname],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(ONBOARDING_AUTO_DISMISS_KEY) === "1";
    if (shouldAutoOpenOnboarding(completedAt, lastLoginAt, dismissed)) {
      setOpen(true);
      setMode("tour");
      setStepIndex(0);
    }
  }, [completedAt, lastLoginAt]);

  useEffect(() => {
    if (!open || mode !== "tour") {
      clearHighlight();
      return;
    }
    applyHighlight(currentStep?.highlightTarget);
    return () => clearHighlight();
  }, [open, mode, stepIndex, currentStep?.highlightTarget, applyHighlight, clearHighlight]);

  function openMenu() {
    setMode("menu");
    setOpen(true);
    clearHighlight();
  }

  function openTourAt(index: number) {
    setStepIndex(index);
    setMode("tour");
    setOpen(true);
  }

  function dismissAutoOpen() {
    localStorage.setItem(ONBOARDING_AUTO_DISMISS_KEY, "1");
    setOpen(false);
    clearHighlight();
  }

  async function completeOnboarding() {
    setCompleting(true);
    try {
      const res = await fetch("/api/user/onboarding-complete", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { onboardingCompletedAt?: string };
      setCompletedAt(data.onboardingCompletedAt ?? new Date().toISOString());
      localStorage.removeItem(ONBOARDING_AUTO_DISMISS_KEY);
      setOpen(false);
      clearHighlight();
    } finally {
      setCompleting(false);
    }
  }

  function handleNext() {
    if (isLastStep) {
      void completeOnboarding();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, ONBOARDING_STEPS.length - 1));
  }

  function handlePrevious() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function stepButtonLabel(stepId: OnboardingStepId): string {
    if (stepId === "welcome") return "Commencer";
    if (stepId === "finish") return "Terminer le guide";
    return "Suivant";
  }

  return (
    <>
      <button
        type="button"
        onClick={openMenu}
        className="fixed bottom-5 right-5 z-[60] flex h-12 w-12 items-center justify-center rounded-full border border-bt-cyan/40 bg-bt-cyan text-[#0a1628] shadow-lg shadow-bt-cyan/20 transition hover:scale-105 hover:bg-bt-cyan/90 focus:outline-none focus:ring-2 focus:ring-bt-cyan/50 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
        aria-label="Guide d'utilisation"
        title="Guide d'utilisation"
      >
        <HelpCircle className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex onboarding-panel-enter"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#060d1a]/75 backdrop-blur-[2px]"
            aria-label="Fermer le guide"
            onClick={dismissAutoOpen}
          />

          <div
            className={`relative ml-auto flex h-full w-full flex-col border-white/10 bg-gradient-to-b from-[#0d1f3c] to-[#0a1628] shadow-2xl onboarding-sidebar-enter sm:max-w-md sm:border-l md:max-w-lg ${
              mode === "menu" ? "sm:max-w-sm" : ""
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-bt-cyan">
                  Guide BLOCKTRUST™
                </p>
                <h2 id="onboarding-title" className="font-syne truncate text-lg font-bold text-white">
                  {mode === "menu" ? "Étapes du guide" : currentStep.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={dismissAutoOpen}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {mode === "menu" ? (
              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                <p className="mb-4 text-sm text-white/60">
                  Choisissez une étape à consulter. Vous pouvez revenir ici à tout moment via le bouton
                  d&apos;aide.
                </p>
                <ul className="space-y-2">
                  {ONBOARDING_STEPS.map((step, index) => (
                    <li key={step.id}>
                      <button
                        type="button"
                        onClick={() => openTourAt(index)}
                        className="flex w-full min-h-[44px] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-left transition hover:border-bt-cyan/30 hover:bg-bt-cyan/5"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bt-cyan/15 font-mono text-xs font-bold text-bt-cyan">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-medium text-white">{step.title}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
                  <p className="text-sm leading-relaxed text-white/80">{currentStep.body}</p>

                  {currentStep.practicalSteps && currentStep.practicalSteps.length > 0 ? (
                    <ol className="mt-4 space-y-2">
                      {currentStep.practicalSteps.map((item, i) => (
                        <li
                          key={item}
                          className="flex gap-2 text-sm leading-relaxed text-white/70"
                        >
                          <span className="font-mono text-xs font-semibold text-bt-cyan">{i + 1}.</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}

                  {currentStep.bullets && currentStep.bullets.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {currentStep.bullets.map((item) => (
                        <li
                          key={item.label}
                          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
                        >
                          <span className="font-semibold text-white">{item.label}</span>
                          <span className="text-white/60"> — {item.description}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {currentStep.useCase ? (
                    <div className="mt-5 rounded-lg border border-[#BDA76B]/25 bg-[#BDA76B]/5 p-3">
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#BDA76B]">
                        <Lightbulb className="h-3.5 w-3.5" aria-hidden />
                        Cas d&apos;usage
                      </p>
                      <p className="text-sm leading-relaxed text-white/75">{currentStep.useCase}</p>
                    </div>
                  ) : null}

                  {currentStep.highlightTarget && pathname !== "/dashboard" ? (
                    <p className="mt-4 text-xs text-amber-300/90">
                      Retournez sur l&apos;accueil du dashboard pour voir la section mise en surbrillance.
                    </p>
                  ) : null}

                  {currentStep.linkHref ? (
                    <Link
                      href={currentStep.linkHref}
                      className="mt-5 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-bt-cyan hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      {currentStep.linkLabel ?? "En savoir plus"}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  ) : null}

                  <p className="mt-6 text-xs text-white/40">
                    Étape {stepIndex + 1} sur {ONBOARDING_STEPS.length}
                  </p>
                </div>

                <div className="flex flex-col gap-2 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <button
                    type="button"
                    onClick={() => setMode("menu")}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1 text-sm text-white/55 transition hover:text-white"
                  >
                    Toutes les étapes
                  </button>
                  <div className="flex gap-2">
                    {!isFirstStep ? (
                      <button
                        type="button"
                        onClick={handlePrevious}
                        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg border border-white/15 px-4 text-sm font-medium text-white/80 transition hover:bg-white/5 sm:flex-none"
                      >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Retour
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={completing}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-bt-cyan px-5 text-sm font-semibold text-[#0a1628] transition hover:bg-bt-cyan/90 disabled:opacity-60 sm:flex-none"
                    >
                      {completing ? (
                        "Enregistrement…"
                      ) : isLastStep ? (
                        <>
                          <Check className="h-4 w-4" aria-hidden />
                          {stepButtonLabel(currentStep.id)}
                        </>
                      ) : (
                        <>
                          {stepButtonLabel(currentStep.id)}
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
