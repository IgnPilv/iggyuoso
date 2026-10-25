import type { Module } from '../core/module';

// Which page a hash address is. Kept free of the DOM so it can be tested.
//   #/                       the open module's home
//   #/profile, #/settings, #/demo[/arg]   shared pages (the open module stays open)
//   #/<module id>[/<route>[/<arg>]]       a module's page, which opens that module
//   #/<route>[/<arg>]        a page of a module with `topLevel` routes (the piano's old links)
// Anything unknown is the open module's home.

export const SHELL_ROUTES = ['profile', 'settings', 'demo'] as const;
export type ShellRoute = (typeof SHELL_ROUTES)[number];

export type Resolved =
  | { kind: 'shell'; route: ShellRoute; module: Module; arg?: string }
  | { kind: 'module'; route: string; module: Module; arg?: string };

export function resolveRoute(hash: string, modules: Module[], openId: string | undefined): Resolved {
  const open = modules.find((m) => m.id === openId) ?? modules[0];
  const [first = '', ...rest] = hash.replace(/^#\/?/, '').split('/');
  const dec = (s: string | undefined) => (s ? decodeURIComponent(s) : undefined);
  if ((SHELL_ROUTES as readonly string[]).includes(first)) return { kind: 'shell', route: first as ShellRoute, module: open, arg: dec(rest[0]) };
  const byId = modules.find((m) => m.id === first);
  if (byId) {
    const [route = '', arg] = rest;
    return byId.routes[route] ? { kind: 'module', module: byId, route, arg: dec(arg) } : { kind: 'module', module: byId, route: '' };
  }
  // Old top-level links: the open module first, so a name two modules share stays where it is.
  const top = [open, ...modules].find((m) => m.topLevel && first && m.routes[first]);
  if (top) return { kind: 'module', module: top, route: first, arg: dec(rest[0]) };
  return { kind: 'module', module: open, route: '' };
}

/** Problems with a set of modules: ids, and route names that would answer twice. */
export function moduleProblems(modules: Module[], reservedWords: string[] = []): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const top = new Map<string, string>();
  for (const m of modules) {
    if (!/^[a-z][a-z0-9-]*$/.test(m.id)) out.push(`module id "${m.id}" must be lowercase letters, digits and dashes`);
    if (ids.has(m.id)) out.push(`two modules have the id "${m.id}"`);
    ids.add(m.id);
    if ((SHELL_ROUTES as readonly string[]).includes(m.id)) out.push(`module id "${m.id}" is a shared page`);
    if (reservedWords.includes(m.id)) out.push(`module id "${m.id}" is the first word of piano records`);
    if (!m.routes['']) out.push(`module "${m.id}" has no home route ('')`);
    if (m.topLevel) {
      for (const r of Object.keys(m.routes)) {
        if (!r) continue;
        if ((SHELL_ROUTES as readonly string[]).includes(r)) out.push(`module "${m.id}" route "${r}" is a shared page`);
        if (top.has(r)) out.push(`route "${r}" is in "${top.get(r)}" and "${m.id}"`);
        top.set(r, m.id);
      }
    }
  }
  for (const m of modules) if (top.has(m.id)) out.push(`module id "${m.id}" is also a route of "${top.get(m.id)}"`);
  return out;
}
