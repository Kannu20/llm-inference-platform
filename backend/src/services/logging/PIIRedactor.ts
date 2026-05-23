// src/services/logging/PIIRedactor.ts
// Regex-based PII redaction before storing previews
// Runs synchronously — fast enough for 500-char previews

export class PIIRedactor {
  private static readonly PATTERNS: Array<{ name: string; regex: RegExp; replacement: string }> = [
    // Email addresses
    {
      name: 'email',
      regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
      replacement: '[EMAIL]',
    },
    // Phone numbers (US + international formats)
    {
      name: 'phone',
      regex: /(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?)(\d{3}[\s.\-]?\d{4})/g,
      replacement: '[PHONE]',
    },
    // SSN
    {
      name: 'ssn',
      regex: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
      replacement: '[SSN]',
    },
    // Credit card numbers
    {
      name: 'credit_card',
      regex: /\b(?:\d{4}[\s\-]?){3}\d{4}\b/g,
      replacement: '[CREDIT_CARD]',
    },
    // API keys / tokens (long alphanumeric strings 20+ chars)
    {
      name: 'api_key',
      regex: /\b[A-Za-z0-9_\-]{20,}\b/g,
      replacement: '[API_KEY]',
    },
    // IP addresses
    {
      name: 'ip_address',
      regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      replacement: '[IP]',
    },
  ];

  /**
   * Redact PII from a string.
   * Returns the redacted string.
   */
  static redact(input: string): string {
    if (!input) return input;
    let result = input;
    for (const pattern of this.PATTERNS) {
      result = result.replace(pattern.regex, pattern.replacement);
    }
    return result;
  }

  /**
   * Create a safe preview: truncate to maxLength and redact PII.
   */
  static preview(input: string, maxLength = 500): string {
    const truncated = input.slice(0, maxLength * 2); // redact before truncating for accuracy
    const redacted = this.redact(truncated);
    return redacted.slice(0, maxLength);
  }
}
