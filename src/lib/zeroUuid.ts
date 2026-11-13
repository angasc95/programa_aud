const UUID_REGEX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const UUID_TEST_REGEX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

/**
 * Checks whether a string contains any raw 36-character UUID.
 */
export function containsRawUuid(value: string): boolean {
  return UUID_TEST_REGEX.test(value);
}

/**
 * Extracts visible text content from an HTML string by stripping tags and attributes.
 */
export function extractVisibleTextFromHtml(html: string): string {
  // Replace tags with space
  const withoutTags = html.replace(/<[^>]+>/g, ' ');
  // Replace multiple spaces with a single space
  return withoutTags.replace(/\s+/g, ' ').trim();
}

/**
 * Extracts user-visible HTML attribute text (tooltips, aria-labels, placeholders,
 * and visible non-hidden <input> values) while ignoring hidden inputs, <option value>,
 * and internal data-* attributes.
 */
export function extractVisibleAttributeTextFromHtml(html: string): string {
  const parts: string[] = [];

  // Tooltips, accessibility labels, and placeholders
  const attrRegex = /\b(?:title|aria-label|placeholder)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = attrRegex.exec(html)) !== null) {
    const val = attrMatch[1] ?? attrMatch[2] ?? '';
    if (val) parts.push(val);
  }

  // Visible <input> values (exclude type="hidden")
  const inputTagRegex = /<input\b([^>]*)>/gi;
  let inputMatch: RegExpExecArray | null;
  while ((inputMatch = inputTagRegex.exec(html)) !== null) {
    const attrs = inputMatch[1] || '';
    if (/\btype\s*=\s*(?:"hidden"|'hidden'|hidden\b)/i.test(attrs)) {
      continue;
    }
    const valMatch = attrs.match(/\bvalue\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (valMatch) {
      const val = valMatch[1] ?? valMatch[2] ?? '';
      if (val) parts.push(val);
    }
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Finds all raw UUIDs exposed in visible text, tooltips, or visible form inputs of an HTML string.
 */
export function findExposedUuidsInHtml(html: string): string[] {
  const visibleText = extractVisibleTextFromHtml(html);
  const visibleAttrs = extractVisibleAttributeTextFromHtml(html);
  const combined = `${visibleText} ${visibleAttrs}`;
  const matches = combined.match(UUID_REGEX);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Asserts that an HTML string adheres to the Zero-UUID Exposure Mandate.
 */
export function assertZeroUuidExposure(html: string): {
  compliant: boolean;
  exposedUuids: string[];
} {
  const exposed = findExposedUuidsInHtml(html);
  return {
    compliant: exposed.length === 0,
    exposedUuids: exposed,
  };
}
