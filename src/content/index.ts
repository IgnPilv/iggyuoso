import { loadContent } from './load';

const files = import.meta.glob('../../content/**/*.yaml', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const { content, errors: contentErrors } = loadContent(files);
if (contentErrors.length) console.warn('Content problems:\n' + contentErrors.join('\n'));
