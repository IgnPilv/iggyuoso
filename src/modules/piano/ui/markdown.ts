// Just enough Markdown for lesson text: paragraphs, line breaks, **bold**, *italic*, "- " lists,
// [links](#/...). The Book adds headings, numbered lists, "> " boxes and tables (`bookMarkdown`).

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const safeHref = (u: string) => (/^(#|https:\/\/)/.test(u) ? u.replace(/"/g, '%22') : '#');
const inline = (t: string) => esc(t)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\*(.+?)\*/g, '<em>$1</em>')
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text: string, href: string) =>
    `<a href="${safeHref(href)}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`);

export function markdown(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim());
      if (lines.every((l) => l.startsWith('- '))) return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
      return `<p>${lines.map(inline).join(' ')}</p>`;
    })
    .join('');
}

/** Long-form Markdown for the Book. `#`–`###` headings, lists, `> ` boxes, `|` tables. */
export function bookMarkdown(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const head = /^(#{1,3})\s+(.*)$/.exec(lines[0]);
      if (head) {
        const level = head[1].length + 1;
        const id = head[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return `<h${level} id="${id}">${inline(head[2])}</h${level}>` + (lines.length > 1 ? bookMarkdown(lines.slice(1).join('\n')) : '');
      }
      if (lines.every((l) => l.startsWith('- '))) return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
      if (lines.every((l) => /^\d+\.\s/.test(l))) return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
      if (lines.every((l) => l.startsWith('>'))) {
        return `<aside class="callout">${markdown(lines.map((l) => l.replace(/^>\s?/, '')).join('\n'))}</aside>`;
      }
      if (lines.length >= 2 && lines.every((l) => l.startsWith('|')) && /^\|[\s:|-]+\|$/.test(lines[1])) {
        const cells = (l: string) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const [th, , ...rows] = lines;
        return `<div class="table-wrap"><table><thead><tr>${cells(th).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>`
          + `<tbody>${rows.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      }
      return `<p>${lines.map(inline).join(' ')}</p>`;
    })
    .join('');
}
