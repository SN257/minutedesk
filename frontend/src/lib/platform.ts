/** True on Apple devices (Mac, iPhone, iPad), where the command key is ⌘; elsewhere it is Ctrl. */
export const isMac: boolean = (() => {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const p = nav.userAgentData?.platform || nav.platform || nav.userAgent || '';
  return /mac|iphone|ipad|ipod/i.test(p);
})();

/** The modifier key's name for this device. */
export const MOD = isMac ? '⌘' : 'Ctrl';

/** A shortcut as shown to the person: "⌘K" on Mac, "Ctrl K" elsewhere. */
export const shortcut = (key: string) => (isMac ? `${MOD}${key}` : `${MOD} ${key}`);
