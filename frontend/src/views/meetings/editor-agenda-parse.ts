/**
 * Turns an agenda pasted from Word / Google Docs into agenda blocks.
 *
 * Rules (these are deliberate - please keep them):
 *  - A numbered line ("1. Title (Owner)", "2) Title") starts a NEW agenda item.
 *  - Everything that follows it - bullets (* - • –), lettered points, or indented / plain
 *    continuation lines - belongs to that same item. They are NEVER split into separate items.
 *  - The whole block (headline + its sub-points) becomes ONE string. Line breaks and the original
 *    bullet markers of the sub-points are kept exactly; nothing is joined with semicolons.
 *  - Only the headline's own number is dropped, because the editor numbers items itself.
 *  - Minutes are not touched here: sub-points never become minutes.
 *
 * Without any numbering at all, indentation decides: lines at the shallowest indent are items and
 * deeper lines are their sub-points.
 */
export interface ParsedAgendaBlock {
  /** The headline only (marker removed). */
  headline: string;
  /** Sub-point lines, original markers intact. */
  subPoints: string[];
  /** headline + sub-points joined by newlines - this is what gets stored as the agenda string. */
  text: string;
}

const NUMBERED_RE = /^\d{1,3}[.)](?:\s+|(?=[^\d\s]))/;
const ANY_MARKER_RE = /^(?:\d{1,3}[.)]|[•●♦*\-–—◦○▪‣·])\s+/;

interface Line {
  raw: string;
  lead: number; // raw leading whitespace characters
  indent: number; // visual indent (tab = 4)
  trimmed: string;
  numbered: boolean;
}

export const parseAgendaText = (input: string): ParsedAgendaBlock[] => {
  const lines: Line[] = input
    .replace(/ /g, ' ')
    .split(/\r\n|\r|\n/)
    .filter((l) => l.trim())
    .map((l) => {
      const raw = l.replace(/\s+$/, '');
      const leadStr = /^[\t ]*/.exec(raw)?.[0] ?? '';
      const trimmed = raw.slice(leadStr.length);
      return { raw, lead: leadStr.length, indent: leadStr.replace(/\t/g, '    ').length, trimmed, numbered: NUMBERED_RE.test(trimmed) };
    });
  if (lines.length === 0) return [];

  const hasNumbering = lines.some((l) => l.numbered);
  const numberedIndent = hasNumbering ? Math.min(...lines.filter((l) => l.numbered).map((l) => l.indent)) : 0;
  const baseIndent = Math.min(...lines.map((l) => l.indent));

  const isHeader = (l: Line, first: boolean) => {
    if (first) return true;
    // A numbered line indented deeper than the other numbered lines is a nested sub-point.
    if (hasNumbering) return l.numbered && l.indent <= numberedIndent;
    return l.indent <= baseIndent;
  };

  const groups: { head: Line; subs: Line[] }[] = [];
  lines.forEach((l, i) => {
    if (isHeader(l, i === 0)) groups.push({ head: l, subs: [] });
    else groups[groups.length - 1].subs.push(l);
  });

  const cut = Math.min(...groups.map((g) => g.head.lead));
  return groups.map(({ head, subs }) => {
    const headline = head.trimmed.replace(hasNumbering ? NUMBERED_RE : ANY_MARKER_RE, '').trim() || head.trimmed;
    // Remove the shared outer indentation only; keep relative indentation and markers untouched.
    const subPoints = subs.map((s) => s.raw.slice(Math.min(cut, s.lead)));
    return { headline, subPoints, text: [headline, ...subPoints].join('\n') };
  });
};
