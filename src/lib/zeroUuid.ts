const UUID_REGEX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

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
 * Finds all raw UUIDs exposed in the visible text of an HTML string.
 */
export function findExposedUuidsInHtml(html: string): string[] {
  const visibleText = extractVisibleTextFromHtml(html);
  const matches = visibleText.match(UUID_REGEX);
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
