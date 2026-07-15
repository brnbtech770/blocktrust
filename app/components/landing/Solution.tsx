import { UserPlus, ShieldCheck, CheckCircle2, type LucideIcon } from "lucide-react";

type Step = {
  icon: LucideIcon;
  iconColor: string;
  ringColor: string;
  step: string;
  title: string;
  text: string;
};

const steps: Step[] = [
  {
    icon: UserPlus,
    iconColor: "#00d4ff",
    ringColor: "rgba(0,212,255,0.35)",
    step: "Étape 1",
    title: "Inscrivez-vous et vérifiez votre identité",
    text: "Vérifiez votre identité en 2 minutes. Particulier ou entreprise, processus rapide et sécurisé.",
  },
  {
    icon: ShieldCheck,
    iconColor: "#BDA76B",
    ringColor: "rgba(189,167,107,0.4)",
    step: "Étape 2",
    title: "Obtenez votre badge certifié blockchain",
    text: "Un QR rotatif unique, ancré sur Polygon, impossible à copier ou falsifier.",
  },
  {
    icon: CheckCircle2,
    iconColor: "#00d4ff",
    ringColor: "rgba(0,212,255,0.35)",
    step: "Étape 3",
    title: "Intégrez votre badge partout",
    text: "Site web, email, documents, appels vidéo, numéro de téléphone — votre identité certifiée visible à chaque échange. Recevez une alerte si quelqu'un usurpe votre identité auprès de vos contacts.",
  },
];

export default function Solution() {
  return (
    <section
      id="comment"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] neon-cyan">
          La solution
        </p>
        <h2 className="font-syne mx-auto max-w-3xl text-balance text-2xl font-semibold leading-snug text-white sm:text-3xl">
          3 étapes pour sécuriser votre <span className="text-bt-cyan">identité</span>
        </h2>
      </div>

      <div className="relative mt-10 sm:mt-14 mx-auto w-full max-w-md sm:max-w-lg md:max-w-xl">
        <ol className="w-full space-y-10 sm:space-y-12">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === steps.length - 1;
            return (
              <li key={step.step} className="relative min-w-0 pl-14 sm:pl-20">
                {!isLast && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-[1.375rem] top-12 -bottom-10 w-px sm:left-7 sm:top-14 sm:-bottom-12"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(0,212,255,0.6), rgba(189,167,107,0.4), rgba(0,212,255,0.6))",
                    }}
                  />
                )}
                <div
                  className="absolute left-0 top-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 sm:h-14 sm:w-14"
                  style={{
                    background: "rgba(10,22,40,0.95)",
                    borderColor: step.ringColor,
                    boxShadow: `0 0 24px ${step.ringColor}`,
                  }}
                >
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: step.iconColor }} />
                </div>
                <h3 className="font-syne mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-balance break-words text-base font-semibold leading-snug text-white sm:mt-1 sm:text-lg md:text-xl">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-white/50 sm:text-xs">
                    {step.step}
                  </span>
                  <span>{step.title}</span>
                </h3>
                <p className="mt-2 min-w-0 text-sm leading-relaxed text-white/70 break-words sm:text-[0.9375rem]">
                  {step.text}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
