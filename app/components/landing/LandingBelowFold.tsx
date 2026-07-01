import type { ReactNode } from "react";
import Problem from "./Problem";
import Solution from "./Solution";
import BisSection from "./BisSection";
import Proofs from "./Proofs";
import LandingBelowFoldClient from "./LandingBelowFoldClient";

type Props = {
  threatAlert: ReactNode;
};

/** Sections landing statiques (RSC) + îlot client pour animations / compteurs. */
export default function LandingBelowFold({ threatAlert }: Props) {
  return (
    <>
      <Problem />
      {threatAlert}
      <Solution />
      <BisSection />
      <LandingBelowFoldClient />
      <Proofs />
    </>
  );
}
