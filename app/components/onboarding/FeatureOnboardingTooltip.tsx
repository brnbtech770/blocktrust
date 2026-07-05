"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle, X } from "lucide-react";
import {
  ONBOARDING_FEATURE_ENCYCLOPEDIA_STEP,
  ONBOARDING_FEATURE_TOOLTIPS,
  isOnboardingFeaturePage,
  onboardingFeatureSeenKey,
  type OnboardingFeature,
} from "@/lib/onboarding";

type Props = {
  feature: OnboardingFeature;
  className?: string;
};

export default function FeatureOnboardingTooltip({ feature, className = "mb-6" }: Props) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const content = ONBOARDING_FEATURE_TOOLTIPS[feature];
  const onSamePage = isOnboardingFeaturePage(pathname, feature);

  useEffect(() => {
    if (onSamePage) return;
    if (localStorage.getItem(onboardingFeatureSeenKey(feature)) === "1") return;
    setVisible(true);
  }, [feature, onSamePage]);

  function dismiss() {
    localStorage.setItem(onboardingFeatureSeenKey(feature), "1");
    setVisible(false);
  }

  function openEncyclopedia() {
    dismiss();
    window.dispatchEvent(
      new CustomEvent("bt-open-onboarding", {
        detail: { stepId: ONBOARDING_FEATURE_ENCYCLOPEDIA_STEP[feature] },
      }),
    );
  }

  if (!visible || onSamePage) return null;

  return (
    <div
      className={`relative rounded-xl border border-bt-cyan/25 bg-gradient-to-br from-[#0d1f3c] to-[#0a1628] p-4 sm:p-5 ${className}`}
      role="note"
    >
      <div className="flex gap-3 pr-8">
        <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-bt-cyan" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-white/80">{content.message}</p>
          {content.linkHref ? (
            <Link
              href={content.linkHref}
              className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-bt-cyan hover:underline"
            >
              {content.linkLabel ?? "En savoir plus"}
            </Link>
          ) : (
            <button
              type="button"
              onClick={openEncyclopedia}
              className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-bt-cyan hover:underline"
            >
              Ouvrir le guide
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/10 hover:text-white"
        aria-label="Ne plus afficher"
        title="Ne plus afficher"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 text-xs font-medium text-white/45 transition hover:text-white/70"
      >
        Ne plus afficher
      </button>
    </div>
  );
}
