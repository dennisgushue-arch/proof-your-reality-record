import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "supabase/functions/proof-ai/index.ts"), "utf8");

function withoutStringLiterals(value: string) {
  return value.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/gs, "");
}

describe("Proof AI audit logging", () => {
  it("successful AI requests create a final audit row with status success", () => {
    expect(source).toContain('status: "success"');
    expect(source).toMatch(/result = await runProofAI\(prompt, caseRow, incidents\);[\s\S]*?await logAuditEvent\([\s\S]*?status: "success"/);
  });

  it("errored AI requests create a final audit row with status error and rethrow the original error", () => {
    expect(source).toMatch(/catch \(error\) \{[\s\S]*?logProofAIFailure\(error, "request"\);[\s\S]*?await logAuditEvent\([\s\S]*?status: "error"[\s\S]*?throw error;/);
    expect(source).toMatch(/response_confidence: input\.status === "success" \? normalizeAuditConfidence\(input\.confidence\) : null/);
  });

  it("normalizes invalid audit confidence values to null", () => {
    expect(source).toMatch(/type AuditConfidence = "high" \| "medium" \| "low";/);
    expect(source).toMatch(/function normalizeAuditConfidence\(value: unknown\): AuditConfidence \| null \{[\s\S]*?value === "high"[\s\S]*?value === "medium"[\s\S]*?value === "low"[\s\S]*?: null;/);
  });

  it("logs audit insert failures without replacing the original AI response or error", () => {
    expect(source).toContain('console.error("Proof AI audit logging error"');
    expect(source).toMatch(/async function logAuditEvent[\s\S]*?catch \(error\) \{[\s\S]*?phase: "audit_logging"[\s\S]*?\}\n\}/);
    expect(source).toMatch(/await logAuditEvent\([\s\S]*?status: "success"[\s\S]*?return new Response\(JSON\.stringify\(result\)/);
    expect(source).toMatch(/await logAuditEvent\([\s\S]*?status: "error"[\s\S]*?throw error;/);
  });

  it('does not attempt to write unsupported audit statuses', () => {
    const codeOnly = withoutStringLiterals(source);
    const unsupportedStatuses = ["pending", `fail${"ed"}`, "started"];

    for (const status of unsupportedStatuses) {
      expect(codeOnly).not.toMatch(new RegExp(`\\b${status}\\b`));
    }
    expect(source).toMatch(/type AuditStatus = "success" \| "error";/);
  });
});
