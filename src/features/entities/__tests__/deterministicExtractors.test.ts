import { describe, expect, it } from "vitest";
import {
  collapseWhitespace,
  extractDeterministicEntities,
  getDaysInMonth,
  isLeapYear,
  isValidCalendarDate,
  normalizeEmail,
  normalizeGeneralName,
  normalizeIdentifier,
  normalizePhone,
  normalizePunctuation,
  normalizeUrl,
  toIsoDateIfValid,
} from "../extraction/deterministicExtractors.ts";

function candidatesFor(text: string) {
  return extractDeterministicEntities({ description: text });
}

describe("deterministic entity extractors", () => {
  it("extracts a valid email address and preserves the matched text", () => {
    const [email] = candidatesFor("Send updates to Person.Example+Proof@Example.COM today.").filter((candidate) => candidate.type === "email");

    expect(email).toMatchObject({
      type: "email",
      canonicalName: "Person.Example+Proof@Example.COM",
      normalizedName: "person.example+proof@example.com",
      matchedText: "Person.Example+Proof@Example.COM",
      sourceField: "description",
      confidence: "high",
    });
  });

  it("normalizes email values to lowercase", () => {
    expect(normalizeEmail("  ADMIN@Example.Org ")).toBe("admin@example.org");
  });

  it("extracts a valid US phone number", () => {
    const [phone] = candidatesFor("Call (415) 555-1212 ext. 9 after 3pm.").filter((candidate) => candidate.type === "phone");

    expect(phone).toMatchObject({
      type: "phone",
      canonicalName: "(415) 555-1212 ext. 9",
      normalizedName: "41555512129",
      matchedText: "(415) 555-1212 ext. 9",
      confidence: "high",
    });
  });

  it("extracts compact US phone numbers without regex lookbehind", () => {
    const [phone] = candidatesFor("Backup number 4155551212 is available.").filter((candidate) => candidate.type === "phone");

    expect(phone).toMatchObject({
      type: "phone",
      matchedText: "4155551212",
      normalizedName: "4155551212",
      confidence: "medium",
    });
  });

  it("normalizes phone values to digits only", () => {
    expect(normalizePhone("+1 (415) 555-1212 ext. 9")).toBe("141555512129");
  });

  it("prevents ordinary numbers from being treated as phone numbers", () => {
    const results = candidatesFor("Invoice 12345, room 202, total 5000, reference 8675309.");

    expect(results.some((candidate) => candidate.type === "phone")).toBe(false);
  });

  it("extracts URLs without creating duplicate email or address matches inside the URL", () => {
    const results = candidatesFor("Review https://example.com/contact/user@example.com/123-Main-St before Monday.");
    const urls = results.filter((candidate) => candidate.type === "url");

    expect(urls).toHaveLength(1);
    expect(urls[0]).toMatchObject({
      canonicalName: "https://example.com/contact/user@example.com/123-Main-St",
      normalizedName: "example.com/contact/user@example.com/123-main-st",
      matchedText: "https://example.com/contact/user@example.com/123-Main-St",
    });
    expect(results.some((candidate) => candidate.type === "email")).toBe(false);
    expect(results.some((candidate) => candidate.type === "address")).toBe(false);
    expect(normalizeUrl("https://Example.com/")).toBe("example.com");
  });

  it("extracts unambiguous dates and converts them to ISO dates", () => {
    const results = candidatesFor("Dates: July 22, 2026, 2026-07-23, 13/07/2026, and 28 February 2026.");
    const dates = results.filter((candidate) => candidate.type === "date").map((candidate) => candidate.normalizedName);

    expect(dates).toEqual(expect.arrayContaining(["2026-07-22", "2026-07-23", "2026-07-13", "2026-02-28"]));
  });

  it("exposes pure calendar validation helpers", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
    expect(getDaysInMonth(2024, 2)).toBe(29);
    expect(getDaysInMonth(2025, 2)).toBe(28);
    expect(isValidCalendarDate(2024, 2, 29)).toBe(true);
    expect(isValidCalendarDate(2025, 2, 29)).toBe(false);
    expect(toIsoDateIfValid(2026, 2, 28)).toBe("2026-02-28");
    expect(toIsoDateIfValid(2026, 2, 31)).toBeNull();
  });

  it("accepts valid leap-day and non-leap-day ISO dates", () => {
    const dates = candidatesFor("Valid dates are 2024-02-29 and 2026-02-28.")
      .filter((candidate) => candidate.type === "date")
      .map((candidate) => candidate.normalizedName);

    expect(dates).toEqual(expect.arrayContaining(["2024-02-29", "2026-02-28"]));
  });

  it("rejects impossible dates instead of relying on JavaScript rollover", () => {
    const results = candidatesFor("Invalid dates: 2025-02-29, 2026-02-31, February 31, 2026, 31/02/2026, and April 31, 2026.");

    expect(results.some((candidate) => candidate.type === "date")).toBe(false);
  });

  it("skips ambiguous slash dates", () => {
    const results = candidatesFor("Ambiguous date: 03/04/2026 should not be converted.");

    expect(results.some((candidate) => candidate.type === "date")).toBe(false);
  });

  it("extracts likely street addresses", () => {
    const [address] = candidatesFor("Meeting happened at 123 Main Street Apt 4B near the lobby.").filter((candidate) => candidate.type === "address");

    expect(address).toMatchObject({
      type: "address",
      canonicalName: "123 Main Street Apt 4B",
      normalizedName: "123 main st apt 4b",
      matchedText: "123 Main Street Apt 4B",
      confidence: "medium",
    });
  });

  it("extracts valid explicitly formatted VIN identifiers", () => {
    const [vehicle] = candidatesFor("The report lists VIN: 1HGCM82633A004352.").filter((candidate) => candidate.type === "vehicle");

    expect(vehicle).toMatchObject({
      type: "vehicle",
      canonicalName: "1HGCM82633A004352",
      normalizedName: "1HGCM82633A004352",
      matchedText: "VIN: 1HGCM82633A004352",
      confidence: "high",
    });
  });

  it("rejects invalid VIN characters and lengths", () => {
    for (const text of [
      "VIN: 1HGCM82633A00435I",
      "VIN: 1HGCM82633A00435O",
      "VIN: 1HGCM82633A00435Q",
      "VIN: 1HGCM82633A00435",
      "VIN: 1HGCM82633A0043529",
    ]) {
      expect(candidatesFor(text).some((candidate) => candidate.type === "vehicle")).toBe(false);
    }
  });

  it("extracts valid explicit license plate identifiers", () => {
    const [plate] = candidatesFor("Officer noted License Plate: ABC-123 near the curb.").filter((candidate) => candidate.type === "vehicle");

    expect(plate).toMatchObject({
      type: "vehicle",
      canonicalName: "ABC 123",
      normalizedName: "ABC123",
      matchedText: "License Plate: ABC-123",
      confidence: "medium",
    });
  });

  it("extracts explicit registration and number plate identifiers", () => {
    const results = candidatesFor("Registration: AB-123-CD and Number Plate: 12 AB 345 were recorded.");
    const vehicles = results.filter((candidate) => candidate.type === "vehicle");

    expect(vehicles).toEqual(expect.arrayContaining([
      expect.objectContaining({
        canonicalName: "AB 123 CD",
        normalizedName: "AB123CD",
        matchedText: "Registration: AB-123-CD",
        confidence: "medium",
      }),
      expect.objectContaining({
        canonicalName: "12 AB 345",
        normalizedName: "12AB345",
        matchedText: "Number Plate: 12 AB 345",
        confidence: "medium",
      }),
    ]));
  });

  it("rejects ordinary prose as vehicle identifiers", () => {
    for (const text of ["Plate was broken", "Tag urgent", "Vehicle ID pending"]) {
      expect(candidatesFor(text).some((candidate) => candidate.type === "vehicle")).toBe(false);
    }
  });

  it("extracts explicitly formatted court case numbers", () => {
    const results = candidatesFor("Refs: Case No. 24-FC-1001, Case # 12345, Docket No. 2026-CV-100, Docket: ABC-123, Cause No. 25-1234.");
    const courts = results.filter((candidate) => candidate.type === "court");

    expect(courts).toHaveLength(5);
    expect(courts[0]).toMatchObject({
      type: "court",
      canonicalName: "24 FC 1001",
      normalizedName: "24FC1001",
      matchedText: "Case No. 24-FC-1001",
      confidence: "high",
    });
  });

  it("extracts Case Number court identifiers", () => {
    const [court] = candidatesFor("Case Number: A-26-123456-C is active.").filter((candidate) => candidate.type === "court");

    expect(court).toMatchObject({
      canonicalName: "A 26 123456 C",
      normalizedName: "A26123456C",
      matchedText: "Case Number: A-26-123456-C",
    });
  });

  it("rejects ordinary prose and court-like identifiers without digits", () => {
    for (const text of [
      "Case notes were updated",
      "Case details are missing",
      "File upload failed",
      "Docket information is unavailable",
      "The case manager called",
      "Case No. ABCDEF",
    ]) {
      expect(candidatesFor(text).some((candidate) => candidate.type === "court")).toBe(false);
    }
  });

  it("deduplicates email casing differences", () => {
    const results = candidatesFor("Email Person@Example.com and person@example.com again.");

    expect(results.filter((candidate) => candidate.type === "email" && candidate.normalizedName === "person@example.com")).toHaveLength(1);
  });

  it("deduplicates phone formatting differences", () => {
    const results = candidatesFor("Call (415) 555-1212 or 415-555-1212.");

    expect(results.filter((candidate) => candidate.type === "phone" && candidate.normalizedName === "4155551212")).toHaveLength(1);
  });

  it("deduplicates court identifier casing and prefix variants", () => {
    const results = candidatesFor("Case No. 24-FC-1001 and Case # 24-fc-1001 refer to the same matter.");

    expect(results.filter((candidate) => candidate.type === "court" && candidate.normalizedName === "24FC1001")).toHaveLength(1);
  });

  it("deduplicates the same normalized entity across source fields", () => {
    const results = extractDeterministicEntities({
      title: "Contact Person@Example.com",
      notes: "Use person@example.com for follow-up",
    });

    expect(results.filter((candidate) => candidate.type === "email" && candidate.normalizedName === "person@example.com")).toHaveLength(1);
  });

  it("does not deduplicate different entity types with the same normalized text", () => {
    const results = candidatesFor("Visit https://example.com and email example@example.com.");

    expect(results.some((candidate) => candidate.type === "url" && candidate.normalizedName.includes("example.com"))).toBe(true);
    expect(results.some((candidate) => candidate.type === "email" && candidate.normalizedName === "example@example.com")).toBe(true);
  });

  it("generates safe context excerpts around matches", () => {
    const [email] = candidatesFor("Before the match, there is context. Contact alpha@example.com immediately after the event.").filter((candidate) => candidate.type === "email");

    expect(email.contextExcerpt).toContain("Contact alpha@example.com immediately");
    expect(email.contextExcerpt.length).toBeLessThanOrEqual(140);
  });

  it("normalizes capitalization", () => {
    expect(normalizeGeneralName("  ACME SCHOOL  ")).toBe("acme school");
  });

  it("collapses repeated whitespace", () => {
    expect(collapseWhitespace("  repeated     spaces\ninside\ttext  ")).toBe("repeated spaces inside text");
  });

  it("normalizes non-semantic punctuation", () => {
    expect(normalizePunctuation("  Acme,   Inc.;  \"North\"  ")).toBe("Acme Inc. North");
  });

  it("normalizes identifiers consistently", () => {
    expect(normalizeIdentifier("24-fc 1001")).toBe("24FC1001");
  });
});
