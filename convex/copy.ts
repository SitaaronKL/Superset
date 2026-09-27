// Product rule: no em dashes in anything the user reads, including AI output.
// Models slip them in regardless of instructions, so every user-facing string
// from an LLM passes through here before it is stored or returned.

/** Instruction appended to every system prompt that produces user-facing text. */
export const NO_EM_DASH_RULE =
  "Never use em dashes or en dashes. Use commas, periods, or parentheses instead. Use a plain hyphen for ranges like 6-7.";

/** Replace em and en dashes with punctuation that reads naturally. */
export function noEmDash(text: string): string {
  return text
    // Ranges: "6–7" or "6—7" become "6-7".
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1-$2")
    // A dash opening a line or bullet becomes nothing.
    .replace(/^([ \t]*)[–—]\s*/gm, "$1")
    // A dash ending a line becomes a period.
    .replace(/\s*[–—]\s*$/gm, ".")
    // A dash between words becomes a comma.
    .replace(/\s*[–—]\s*/g, ", ")
    // Tidy a comma that landed before other punctuation.
    .replace(/,\s*([.,;:!?])/g, "$1");
}

/** Deep-clean every string in an LLM JSON result. */
export function noEmDashDeep<T>(value: T): T {
  if (typeof value === "string") return noEmDash(value) as T;
  if (Array.isArray(value)) return value.map(noEmDashDeep) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, noEmDashDeep(v)]),
    ) as T;
  }
  return value;
}
