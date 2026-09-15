function decodeEntity(value: string) {
  const named: Record<string, string> = {
    nbsp: ' ',
    nbps: ' ',
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
  };

  return value.replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (match, entity: string) => {
      const normalized = entity.toLowerCase();

      if (normalized.startsWith('#x')) {
        const code = Number.parseInt(
          normalized.slice(2),
          16,
        );

        return Number.isFinite(code)
          ? String.fromCodePoint(code)
          : match;
      }

      if (normalized.startsWith('#')) {
        const code = Number.parseInt(
          normalized.slice(1),
          10,
        );

        return Number.isFinite(code)
          ? String.fromCodePoint(code)
          : match;
      }

      return named[normalized] ?? match;
    },
  );
}

export function zendeskCommentText(
  value?: string | null,
) {
  if (!value) return 'No text';

  let text = value
    .replace(
      /<\s*br\s*\/?\s*>/gi,
      '\n',
    )
    .replace(
      /<\s*\/\s*(p|div|section|article|blockquote|h[1-6])\s*>/gi,
      '\n\n',
    )
    .replace(
      /<\s*li\b[^>]*>/gi,
      '• ',
    )
    .replace(
      /<\s*\/\s*li\s*>/gi,
      '\n',
    )
    .replace(
      /<\s*\/\s*(ul|ol)\s*>/gi,
      '\n',
    )
    .replace(/<[^>]+>/g, '');

  text = decodeEntity(text)
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text || 'No text';
}
