/** User-controlled motion preference, stored alongside the access key/lang.
 *
 * The OS-level `prefers-reduced-motion` stays the primary signal (framer's
 * useReducedMotion); this flag lets a user — or an accessibility-minded
 * environment — force the calm, instant-motion experience explicitly. */
const KEY = "fieldshift.reducedMotion"

export function userPrefersReducedMotion(): boolean {
  try {
    return localStorage.getItem(KEY) === "1"
  } catch {
    return false
  }
}

export function setMotionPreference(reduced: boolean): void {
  try {
    localStorage.setItem(KEY, reduced ? "1" : "0")
  } catch {
    /* storage unavailable — the OS preference still applies */
  }
}
