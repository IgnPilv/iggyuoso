import './style.css';
import { startShell } from './app/shell';

// One website, one account, several learning modules (src/app/modules.ts). The shell draws the
// header and routes every page to the open module or to the shared pages.
startShell(document.getElementById('app')!);
