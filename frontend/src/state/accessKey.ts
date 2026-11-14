/** Anonymous browser capability key (no accounts; key stored locally only). */
const KEY_NAME = 'fieldshift.access_key'

function randomKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return 'fsk_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function getAccessKey(): string {
  let key = localStorage.getItem(KEY_NAME)
  if (!key) {
    key = randomKey()
    localStorage.setItem(KEY_NAME, key)
  }
  return key
}

export function clearAccessKey(): void {
  localStorage.removeItem(KEY_NAME)
}

export function hasAccessKey(): boolean {
  return localStorage.getItem(KEY_NAME) !== null
}
