import { describe, it, expect } from "vitest";
import {
  assertSafeDisplayText,
  containsUnsafeDisplayMarkup,
  sanitizeDisplayText,
} from "@/lib/sanitize-display-text";

describe("sanitize-display-text", () => {
  it("détecte les balises HTML", () => {
    expect(containsUnsafeDisplayMarkup('<img src=x onerror=alert(1)>')).toBe(true);
    expect(containsUnsafeDisplayMarkup("Acme Corp")).toBe(false);
  });

  it("sanitizeDisplayText retire les balises", () => {
    expect(sanitizeDisplayText("<b>Test</b>")).toBe("Test");
    expect(sanitizeDisplayText("  Normal  ")).toBe("Normal");
  });

  it("assertSafeDisplayText rejette le markup", () => {
    const bad = assertSafeDisplayText("<script>x</script>", "Nom");
    expect(bad.ok).toBe(false);
    const ok = assertSafeDisplayText("BRNB TECH", "Nom");
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value).toBe("BRNB TECH");
  });
});
