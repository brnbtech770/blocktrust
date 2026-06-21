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
    return (
      <Check
        className="mx-auto h-5 w-5 text-emerald-400"
        aria-label="Inclus"
        strokeWidth={2.5}
      />
    );
  }
  if (value === "no") {
    return (
      <Minus
        className="mx-auto h-4 w-4 text-white/30"
        aria-label="Non inclus"
        strokeWidth={2}
      />
    );
  }
  return <span className="text-sm leading-snug text-white/85">{value}</span>;
}

function PlanColumnHeader({
  name,
  highlighted,
}: {
  name: string;
  highlighted: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <div className="whitespace-nowrap text-lg font-bold leading-tight text-white">
        {name}
      </div>
      {highlighted ? (
        <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-cyan-400">
          Populaire
        </div>
      ) : (
        <div className="h-[14px]" aria-hidden />
      )}
    </div>
  );
}

function featuredHeaderClass(highlighted: boolean): string {
  if (!highlighted) return "border-t-2 border-transparent bg-[#0a1628]";
  return "border-t-2 border-cyan-400 bg-[#0c2238]";
}

function featuredCellClass(highlighted: boolean): string {
  return highlighted ? "bg-cyan-500/[0.08]" : "";
}

function CompareTable({ data }: { data: CompareTableData }) {
  const { plans, rows } = data;
  const stickyTop = "top-14 sm:top-16";

  return (
    <div className="relative -mx-4 sm:mx-0">
      <div className="overflow-x-auto px-4 pb-2 sm:px-0">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr>
              <th
                scope="col"
                className={`sticky left-0 z-40 ${stickyTop} min-w-[200px] border-b border-white/[0.06] bg-[#0a1628] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/50`}
              >
                Fonctionnalité
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.id}
                  scope="col"
                  className={`sticky z-30 ${stickyTop} min-w-[7rem] border-b border-white/[0.06] px-6 py-4 text-center ${featuredHeaderClass(plan.highlighted)}`}
                >
                  <PlanColumnHeader name={plan.name} highlighted={plan.highlighted} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const isEven = rowIndex % 2 === 0;
              return (
                <tr
                  key={row.label}
                  className={`border-b border-white/[0.06] transition-colors hover:bg-white/[0.03] ${
                    isEven ? "bg-white/[0.02]" : "bg-transparent"
                  }`}
                >
                  <th
                    scope="row"
                    className={`sticky left-0 z-20 min-w-[200px] border-b border-white/[0.06] px-6 py-4 text-left text-sm font-semibold leading-snug text-white/75 ${
                      isEven ? "bg-[#0b1829]" : "bg-[#0a1628]"
                    }`}
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
                        className={`border-b border-white/[0.06] px-6 py-4 text-center ${featuredCellClass(plan.highlighted)}`}
                      >
                        {isAuditAdvanced ? (
                          <span className="inline-flex items-center justify-center gap-1.5 text-sm text-white/85">
                            <Check
                              className="h-5 w-5 shrink-0 text-emerald-400"
                              aria-hidden
                              strokeWidth={2.5}
                            />
                            Avancés
                          </span>
                        ) : (
                          <CompareCellContent value={cell} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
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
