/** "Chrome on Windows" from a user agent string. Rough on purpose: it's only a label. */
export function describeDevice(userAgent: string | null): { label: string; mobile: boolean } {
  // Sessions from before devices were recorded have no user agent.
  if (!userAgent) return { label: "Device not recorded", mobile: false };

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

  const label = browser && os ? `${browser} on ${os}` : (browser ?? os ?? "Unknown device");
  return { label, mobile: /Mobile|iPhone|iPad|Android/.test(userAgent) };
}
