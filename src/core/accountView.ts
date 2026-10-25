import type { Account } from './sync/account';
import { h } from './dom';
import { keptLabels } from './records';

// The account card at the top of the profile, shared by every module: who is playing here (a guest, saved on this device
// only, or a signed-in account that syncs), signing in with Google (or by an emailed link), and the sync state.
// It redraws itself when the account changes.

export function ago(iso: string | undefined, now = Date.now()): string {
  if (!iso) return 'not yet';
  const min = Math.round((now - Date.parse(iso)) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  if (min < 24 * 60) return `${Math.round(min / 60)} h ago`;
  return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short' });
}

/** What a wipe keeps, in words: each module's own work, and the settings. */
function kept() {
  const s = [...keptLabels(), 'settings'].join(', ').replace(/, ([^,]*)$/, ' and $1');
  return s[0].toUpperCase() + s.slice(1);
}

export function accountCard(account: Account): HTMLElement {
  const card = h('section', { class: 'card account' });
  let email = '';
  let useEmail = false;
  let confirming = false;
  let wiping = false;
  // "Wipe progress", with a second step that says exactly what goes and what stays.
  const wipeBlock = (signedIn: boolean) => {
    if (!confirming) {
      return h('div', { class: 'account-wipe' },
        h('button', { class: 'secondary danger', onclick: () => { confirming = true; draw(); } }, 'Wipe progress'));
    }
    return h('div', { class: 'account-wipe confirm', role: 'alertdialog', 'aria-label': 'Wipe progress?' },
      h('p', {}, h('strong', {}, 'Wipe all progress? '),
        `Your progress in every module (every take, star, clean take, XP, streak, practice day, review and the path) goes, ${signedIn ? 'here and in your account, on every device you sign in on' : 'on this device'}. `,
        `${kept()} stay. This cannot be undone.`),
      h('div', { class: 'controls' },
        h('button', {
          class: 'danger-solid', disabled: wiping,
          onclick: async () => {
            wiping = true;
            draw();
            const ok = await account.wipe();
            wiping = false;
            if (ok) confirming = false;
            draw();
          },
        }, wiping ? 'Wiping…' : 'Wipe everything'),
        h('button', { class: 'secondary', disabled: wiping, onclick: () => { confirming = false; draw(); } }, 'Cancel')));
  };
  const draw = () => {
    const who = account.identity();
    const avatar = h('span', { class: `account-avatar${who.kind === 'guest' ? ' guest' : ''}`, 'aria-hidden': 'true' },
      who.kind === 'guest' ? 'G' : (who.email[0] ?? '?').toUpperCase());
    const error = account.error ? h('p', { class: 'account-error', role: 'alert' }, account.error) : null;
    if (who.kind === 'guest') {
      let signIn: HTMLElement;
      if (!account.available) {
        signIn = h('p', { class: 'small' }, 'Accounts that carry your progress to every device are coming. Until then, everything stays here.');
      } else if (account.linkSentTo) {
        signIn = h('div', { class: 'account-sent' },
          h('p', {}, `Check your email (${account.linkSentTo}) and open the link on this device. Your progress here comes with you into the account.`),
          h('button', { class: 'secondary', onclick: () => { account.linkSentTo = ''; draw(); } }, 'Use another email'));
      } else {
        const input = h('input', { type: 'email', name: 'email', autocomplete: 'email', placeholder: 'you@example.com', 'aria-label': 'Email', required: true, value: email });
        input.oninput = () => { email = input.value; };
        const form = h('form', { class: 'account-form' }, input, h('button', { type: 'submit', class: 'secondary' }, 'Email me a sign-in link'));
        form.onsubmit = (e) => {
          e.preventDefault();
          if (!input.checkValidity()) return input.reportValidity();
          (form.querySelector('button') as HTMLButtonElement).disabled = true;
          void account.sendLink(input.value);
        };
        const google = h('button', { class: 'account-google', disabled: account.leaving, onclick: () => void account.signInWithGoogle() },
          account.leaving ? 'Opening Google…' : 'Continue with Google');
        signIn = h('div', { class: 'account-signin' },
          h('p', { class: 'small' }, 'Sign in to keep your progress on every device. Your progress here comes with you into the account.'),
          google,
          useEmail
            ? h('div', {}, h('p', { class: 'small' }, 'No password: we email you a link to open on this device.'), form)
            : h('button', { class: 'secondary account-use-email', onclick: () => { useEmail = true; draw(); } }, 'Use email instead'));
      }
      card.replaceChildren(...[
        h('div', { class: 'account-head' }, avatar, h('div', {},
          h('h2', {}, 'Guest'),
          h('p', { class: 'small' }, 'Saved in this browser, on this device only. Another device or browser, or clearing this site\'s data, starts from zero.'))),
        error, signIn, wipeBlock(false)].filter((x) => !!x) as HTMLElement[]);
    } else {
      const status = account.status === 'syncing' ? 'Syncing…'
        : account.status === 'offline' ? 'Offline. Practice is saved here and syncs when you are back online.'
          : account.status === 'error' ? 'Not synced.'
            : `Synced ${ago(account.lastSync)}.`;
      card.replaceChildren(...[
        h('div', { class: 'account-head' }, avatar, h('div', {},
          h('h2', {}, who.email),
          h('p', { class: 'small' }, h('span', { class: `sync-dot ${account.status}` }), ` ${status} Your progress follows you to every device you sign in on.`))),
        error,
        account.newerData ? h('p', { class: 'account-error' }, 'Some progress was saved by a newer version of iggyuoso. ',
          h('button', { class: 'secondary', onclick: () => location.reload() }, 'Reload')) : null,
        h('div', { class: 'controls' },
          h('button', { class: 'secondary', disabled: account.status === 'syncing', onclick: () => void account.sync() }, 'Sync now'),
          h('button', { class: 'secondary', onclick: () => void account.signOut() }, 'Sign out')),
        h('p', { class: 'small' }, 'Signing out keeps your progress on this device, as a guest.'),
        wipeBlock(true)].filter((x) => !!x) as HTMLElement[]);
    }
  };
  const off = account.onChange(() => (card.isConnected || !card.dataset.drawn ? draw() : off()));
  draw();
  card.dataset.drawn = '1';
  return card;
}
