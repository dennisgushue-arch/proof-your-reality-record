import type { DeterministicExtractionInput, EntityConfidence, EntityExtractionResult, EntityType, ExtractedEntityCandidate } from "../types.ts";

type TextSource = {
  sourceField: string;
  text: string;
};

type ProtectedSpan = {
  sourceField: string;
  start: number;
  end: number;
};

type CandidateDraft = ExtractedEntityCandidate & {
  start: number;
  end: number;
};

type MatchPosition = {
  matchedText: string;
  start: number;
  end: number;
};

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>()"']*[^\s<>()"'.,;:!?]/gi;
const US_PHONE_PATTERN = /(^|[^\dA-Za-z])((?:\+1[\s.-]?)?(?:\([2-9]\d{2}\)|[2-9]\d{2})[\s.-]?[2-9]\d{2}[\s.-]?\d{4}(?:\s*(?:x|ext\.?|extension)\s*\d{1,6})?)(?=$|[^\dA-Za-z])/gi;
const ISO_DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b/g;
const MONTH_DATE_PATTERN = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+\d{4}\b/gi;
const DAY_MONTH_DATE_PATTERN = /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\b/gi;
const SLASH_DATE_PATTERN = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g;
const STREET_ADDRESS_PATTERN = /\b\d{1,6}\s+(?:[A-Za-z0-9.'-]+\s+){0,6}(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Court|Ct\.?|Circle|Cir\.?|Way|Place|Pl\.?|Terrace|Ter\.?|Highway|Hwy\.?|Route|Rte\.?)\b(?:\s+(?:Apt|Apartment|Unit|Suite|Ste|#)\s*[A-Za-z0-9-]+)?/gi;
const VIN_PATTERN = /\b(?:VIN\s*(?:#|:)|Vehicle\s+Identification\s+Number\s*:)\s*([A-HJ-NPR-Z0-9]{17})\b/gi;
const LICENSE_PLATE_PATTERN = /\b(?:Plate\s*(?:#|:)|License\s+Plate\s*:|Number\s+Plate\s*:|Registration\s*(?:No\.|Number|#|:)|Reg\s*(?:No\.|#|:)|Tag\s*:)\s*([A-Z0-9][A-Z0-9 -]{0,8}[A-Z0-9])\b/gi;
const COURT_CASE_PATTERN = /\b(?:Case\s+(?:No\.|Number:|#)|Docket\s+(?:No\.|#)|Docket:|Cause\s+No\.)\s*([A-Z0-9][A-Z0-9-]{2,39})\b/gi;
const TRAILING_PUNCTUATION_PATTERN = /[.,;:!?]+$/;

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

export function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizePunctuation(value: string): string {
  return collapseWhitespace(value)
    .replace(/[“”"']/g, "")
    .replace(/\s*[,;]+\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeGeneralName(value: string): string {
  return normalizePunctuation(value).toLowerCase();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeIdentifier(value: string): string {
  return value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

export function normalizeSeparatedIdentifier(value: string): string {
  return collapseWhitespace(value.replace(/[^A-Z0-9]+/gi, " ")).toUpperCase();
}

export function normalizeUrl(value: string): string {
  return collapseWhitespace(value)
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

function normalizeAddress(value: string): string {
  return normalizeGeneralName(value)
    .replace(/\bstreet\b/g, "st")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\broad\b/g, "rd")
    .replace(/\bboulevard\b/g, "blvd")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\blane\b/g, "ln")
    .replace(/\bcourt\b/g, "ct")
    .replace(/\bcircle\b/g, "cir")
    .replace(/\bplace\b/g, "pl")
    .replace(/\bterrace\b/g, "ter")
    .replace(/\bhighway\b/g, "hwy")
    .replace(/\broute\b/g, "rte");
}

function getSources(input: DeterministicExtractionInput): TextSource[] {
  const sources: TextSource[] = [];
  if (input.title?.trim()) sources.push({ sourceField: "title", text: input.title });
  if (input.description?.trim()) sources.push({ sourceField: "description", text: input.description });
  if (input.notes?.trim()) sources.push({ sourceField: "notes", text: input.notes });
  const tags = input.tags?.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0) ?? [];
  if (tags.length > 0) sources.push({ sourceField: "tags", text: tags.join(", ") });
  return sources;
}

function getContextExcerpt(text: string, start: number, end: number, radius = 64): string {
  return collapseWhitespace(text.slice(Math.max(0, start - radius), Math.min(text.length, end + radius)));
}

function hasSemanticValue(value: string): boolean {
  return /[A-Za-z0-9]/.test(value);
}

function overlapsProtectedSpan(sourceField: string, start: number, end: number, protectedSpans: ProtectedSpan[]): boolean {
  return protectedSpans.some((span) => span.sourceField === sourceField && start < span.end && end > span.start);
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(TRAILING_PUNCTUATION_PATTERN, "");
}

function hasDigit(value: string): boolean {
  return /\d/.test(value);
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function getDaysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  if (month >= 1 && month <= 12) return 31;
  return 0;
}

export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  return year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= getDaysInMonth(year, month);
}

export function toIsoDateIfValid(year: number, month: number, day: number): string | null {
  if (!isValidCalendarDate(year, month, day)) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getMonthNumber(value: string): number | null {
  return MONTHS[value.toLowerCase()] ?? null;
}

function parseUnambiguousDate(value: string): string | null {
  const normalized = collapseWhitespace(value);

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (iso) {
    return toIsoDateIfValid(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const monthFirst = /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/.exec(normalized);
  if (monthFirst) {
    const month = getMonthNumber(monthFirst[1]);
    return month ? toIsoDateIfValid(Number(monthFirst[3]), month, Number(monthFirst[2])) : null;
  }

  const dayFirst = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(normalized);
  if (dayFirst) {
    const month = getMonthNumber(dayFirst[2]);
    return month ? toIsoDateIfValid(Number(dayFirst[3]), month, Number(dayFirst[1])) : null;
  }

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(normalized);
  if (!slash) return null;

  const first = Number(slash[1]);
  const second = Number(slash[2]);
  const year = Number(slash[3]);
  if (first <= 12 && second <= 12) return null;

  const month = first > 12 ? second : first;
  const day = first > 12 ? first : second;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return toIsoDateIfValid(year, month, day);
}

function createCandidate(input: {
  type: EntityType;
  canonicalName: string;
  normalizedName: string;
  matchedText: string;
  sourceField: string;
  contextExcerpt: string;
  confidence?: EntityConfidence;
  start: number;
  end: number;
}): CandidateDraft | null {
  const canonicalName = collapseWhitespace(input.canonicalName);
  const normalizedName = collapseWhitespace(input.normalizedName);
  const matchedText = input.matchedText;

  if (!hasSemanticValue(canonicalName) || !hasSemanticValue(normalizedName) || !hasSemanticValue(matchedText)) {
    return null;
  }

  return {
    type: input.type,
    canonicalName,
    normalizedName,
    matchedText,
    sourceField: input.sourceField,
    contextExcerpt: input.contextExcerpt,
    confidence: input.confidence ?? "high",
    start: input.start,
    end: input.end,
  };
}

function collectMatches(input: {
  sources: TextSource[];
  pattern: RegExp;
  type: EntityType;
  protectedSpans: ProtectedSpan[];
  getMatchPosition?: (match: RegExpExecArray) => MatchPosition;
  build: (match: RegExpExecArray, source: TextSource) => Omit<Parameters<typeof createCandidate>[0], "sourceField" | "contextExcerpt" | "start" | "end"> | null;
}): CandidateDraft[] {
  const candidates: CandidateDraft[] = [];

  for (const source of input.sources) {
    input.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = input.pattern.exec(source.text)) !== null) {
      const position = input.getMatchPosition?.(match) ?? {
        matchedText: match[0],
        start: match.index,
        end: match.index + match[0].length,
      };
      const start = position.start;
      const end = position.end;
      if (overlapsProtectedSpan(source.sourceField, start, end, input.protectedSpans)) continue;

      const candidateParts = input.build(match, source);
      if (!candidateParts) continue;

      const candidate = createCandidate({
        ...candidateParts,
        type: input.type,
        sourceField: source.sourceField,
        contextExcerpt: getContextExcerpt(source.text, start, end),
        start,
        end,
      });
      if (candidate) candidates.push(candidate);
    }
  }

  return candidates;
}

function dedupeCandidates(candidates: CandidateDraft[]): ExtractedEntityCandidate[] {
  const seen = new Set<string>();
  const output: ExtractedEntityCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.type}:${candidate.normalizedName}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const { start: _start, end: _end, ...publicCandidate } = candidate;
    output.push(publicCandidate);
  }

  return output;
}

export function extractDeterministicEntities(input: DeterministicExtractionInput): ExtractedEntityCandidate[] {
  const sources = getSources(input);
  const candidates: CandidateDraft[] = [];
  const protectedSpans: ProtectedSpan[] = [];

  const urlCandidates = collectMatches({
    sources,
    pattern: URL_PATTERN,
    type: "url",
    protectedSpans,
    build: (match) => {
      const matchedText = match[0];
      return {
        matchedText,
        canonicalName: collapseWhitespace(matchedText),
        normalizedName: normalizeUrl(matchedText),
      };
    },
  });
  candidates.push(...urlCandidates);
  protectedSpans.push(...urlCandidates.map((candidate) => ({ sourceField: candidate.sourceField, start: candidate.start, end: candidate.end })));

  candidates.push(...collectMatches({
    sources,
    pattern: EMAIL_PATTERN,
    type: "email",
    protectedSpans,
    build: (match) => {
      const matchedText = match[0];
      return {
        matchedText,
        canonicalName: collapseWhitespace(matchedText),
        normalizedName: normalizeEmail(matchedText),
      };
    },
  }));

  candidates.push(...collectMatches({
    sources,
    pattern: US_PHONE_PATTERN,
    type: "phone",
    protectedSpans,
    getMatchPosition: (match) => {
      const boundary = match[1] ?? "";
      const matchedText = match[2];
      const start = match.index + boundary.length;
      return { matchedText, start, end: start + matchedText.length };
    },
    build: (match) => {
      const matchedText = match[2];
      const normalizedName = normalizePhone(matchedText);
      if (normalizedName.length < 10 || normalizedName.length > 17) return null;
      const confidence: EntityConfidence = /[\s().-]/.test(matchedText) ? "high" : "medium";
      return {
        matchedText,
        canonicalName: collapseWhitespace(matchedText),
        normalizedName,
        confidence,
      };
    },
  }));

  for (const pattern of [ISO_DATE_PATTERN, MONTH_DATE_PATTERN, DAY_MONTH_DATE_PATTERN, SLASH_DATE_PATTERN]) {
    candidates.push(...collectMatches({
      sources,
      pattern,
      type: "date",
      protectedSpans,
      build: (match) => {
        const matchedText = match[0];
        const normalizedName = parseUnambiguousDate(matchedText);
        if (!normalizedName) return null;
        return {
          matchedText,
          canonicalName: collapseWhitespace(matchedText),
          normalizedName,
        };
      },
    }));
  }

  candidates.push(...collectMatches({
    sources,
    pattern: STREET_ADDRESS_PATTERN,
    type: "address",
    protectedSpans,
    build: (match) => {
      const matchedText = match[0];
      return {
        matchedText,
        canonicalName: collapseWhitespace(matchedText),
        normalizedName: normalizeAddress(matchedText),
        confidence: "medium",
      };
    },
  }));

  candidates.push(...collectMatches({
    sources,
    pattern: VIN_PATTERN,
    type: "vehicle",
    protectedSpans,
    build: (match) => {
      const matchedText = match[0];
      const identifier = match[1];
      if (identifier.length !== 17 || !/^[A-HJ-NPR-Z0-9]{17}$/i.test(identifier)) return null;
      return {
        matchedText,
        canonicalName: collapseWhitespace(identifier).toUpperCase(),
        normalizedName: normalizeIdentifier(identifier),
      };
    },
  }));

  candidates.push(...collectMatches({
    sources,
    pattern: LICENSE_PLATE_PATTERN,
    type: "vehicle",
    protectedSpans,
    build: (match) => {
      const matchedText = stripTrailingPunctuation(match[0]);
      const identifier = stripTrailingPunctuation(match[1]);
      const compact = normalizeIdentifier(identifier);
      if (compact.length < 2 || compact.length > 10 || !hasDigit(compact)) return null;
      return {
        matchedText,
        canonicalName: normalizeSeparatedIdentifier(identifier),
        normalizedName: compact,
        confidence: "medium",
      };
    },
  }));

  candidates.push(...collectMatches({
    sources,
    pattern: COURT_CASE_PATTERN,
    type: "court",
    protectedSpans,
    build: (match) => {
      const matchedText = stripTrailingPunctuation(match[0]);
      const identifier = stripTrailingPunctuation(match[1]);
      const compact = normalizeIdentifier(identifier);
      if (compact.length < 3 || !hasDigit(compact)) return null;
      return {
        matchedText,
        canonicalName: normalizeSeparatedIdentifier(identifier),
        normalizedName: compact,
      };
    },
  }));

  return dedupeCandidates(candidates);
}

export function extractDeterministicEntityResult(input: DeterministicExtractionInput): EntityExtractionResult {
  const candidates = extractDeterministicEntities(input);
  return {
    candidates,
    deterministicCount: candidates.length,
    errors: [],
  };
}
