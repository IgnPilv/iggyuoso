import { loadContent } from './load';
import { loadTree } from './tree';

const files = import.meta.glob('../../content/**/*.yaml', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const { content, errors: contentErrors } = loadContent(files);
if (contentErrors.length) console.warn('Content problems:\n' + contentErrors.join('\n'));

export const { years: tree, nodes: treeNodes, errors: treeErrors } = loadTree(files, content.lessons);
if (treeErrors.length) console.warn('Mastery tree problems:\n' + treeErrors.join('\n'));
