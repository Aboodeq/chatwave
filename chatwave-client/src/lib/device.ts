import i18n from "../i18n";

/** "Chrome on Windows" from a user agent string. Rough on purpose: it's only a label. */
export function describeDevice(userAgent: string | null): { label: string; mobile: boolean } {
  // Sessions from before devices were recorded have no user agent.
  if (!userAgent) return { label: i18n.t("device.notRecorded"), mobile: false };

  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\/|Opera/.test(userAgent)
      ? "Opera"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : null;

  const os = /Windows/.test(userAgent)
    ? "Windows"
    : /iPhone|iPad|iPod/.test(userAgent)
      ? "iOS"
      : /Android/.test(userAgent)
        ? "Android"
        : /Mac OS X|Macintosh/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null;

  const label = browser && os ? i18n.t("device.browserOn", { browser, os }) : (browser ?? os ?? i18n.t("device.unknown"));
  return { label, mobile: /Mobile|iPhone|iPad|Android/.test(userAgent) };
}
