"use client";

import { Check, Minus } from "lucide-react";
import {
  getB2CCompareTable,
  getB2BCompareTable,
  type CompareCell,
  type CompareTableData,
} from "@/lib/pricing-compare";

type Props = {
  mode: "B2C" | "B2B";
};

function CompareCellContent({ value }: { value: CompareCell }) {
  if (value === "yes") {
    return <Check className="mx-auto h-4 w-4 text-emerald-400" aria-label="Inclus" />;
  }
  if (value === "no") {
    return <Minus className="mx-auto h-4 w-4 text-white/25" aria-label="Non inclus" />;
  }
  return <span className="text-sm text-white/80">{value}</span>;
}

function CompareTable({ data }: { data: CompareTableData }) {
  const { plans, rows } = data;

  const stickyTop = "top-14 sm:top-16";
  const stickyBg = "bg-[#0a1628]";

  return (
    <div className="relative -mx-4 sm:mx-0">
      <div className="overflow-x-auto px-4 pb-2 sm:px-0">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th
                scope="col"
                className={`sticky left-0 z-30 ${stickyTop} min-w-[9rem] ${stickyBg} px-3 py-3 text-xs font-medium uppercase tracking-wider text-white/50 sm:min-w-[11rem] sm:px-4`}
              >
                Fonctionnalité
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.id}
                  scope="col"
                  className={`sticky ${stickyTop} z-20 min-w-[5.5rem] px-3 py-3 text-center font-syne text-sm font-bold sm:min-w-[6.5rem] sm:px-4 sm:text-base ${
                    plan.highlighted
                      ? "bg-bt-cyan/10 text-bt-cyan"
                      : `${stickyBg} text-white`
                  }`}
                >
                  {plan.name}
                  {plan.highlighted ? (
                    <span className="mt-0.5 block text-[10px] font-normal uppercase tracking-wider text-bt-cyan/70">
                      Populaire
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-[#0a1628] px-3 py-3 text-left text-xs font-medium text-white/60 sm:px-4 sm:text-sm"
                >
                  {row.label}
                </th>
                {plans.map((plan) => {
                  const cell = row.cells[plan.id] ?? "no";
                  const isAuditAdvanced =
                    plan.id === "ENTERPRISE" && cell === "Avancés";
                  return (
                    <td
                      key={plan.id}
                      className={`px-3 py-3 text-center sm:px-4 ${
                        plan.highlighted ? "bg-bt-cyan/[0.04]" : ""
                      }`}
                    >
                      {isAuditAdvanced ? (
                        <span className="inline-flex items-center justify-center gap-1 text-sm text-white/80">
                          <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                          Avancés
                        </span>
                      ) : (
                        <CompareCellContent value={cell} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PricingCompareTable({ mode }: Props) {
  const data = mode === "B2C" ? getB2CCompareTable() : getB2BCompareTable();

  return (
    <section
      id="compare"
      aria-labelledby="compare-heading"
      className="mx-auto mt-12 max-w-6xl px-4 sm:mt-16 sm:px-6 lg:px-8"
    >
      <h2
        id="compare-heading"
        className="font-syne text-balance mx-auto mb-2 max-w-3xl text-center text-xl font-bold text-white sm:text-2xl"
      >
        Comparer les plans en détail
      </h2>
      <p className="mx-auto mb-8 max-w-2xl text-balance text-center text-sm text-white/50">
        {mode === "B2C"
          ? "Tous les prix sont TTC · sans engagement · résiliable à tout moment"
          : "Tous les prix sont HT · TVA 20% en sus · sans engagement"}
      </p>
      <CompareTable data={data} />
    </section>
  );
}
