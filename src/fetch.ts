import {
  fetch as fetchPolyfill,
  type RequestInit,
  Agent,
  ProxyAgent,
  Dispatcher,
} from "undici";
import process from "node:process";
import tls from "node:tls";
import { version as pkgVersion } from "../package.json";

let _agent: Dispatcher | undefined;
let _systemCAsLoaded = false;

/**
 * Merge the OS trust store into Node's default CA list so that requests trust
 * certificates added at the system level (e.g. corporate root CAs deployed via
 * MDM, Keychain, the Windows cert store, or /etc/ssl/certs).
 *
 * No-op on Node versions that lack tls.getCACertificates / setDefaultCACertificates
 * (added in Node 22.15). Best-effort; failures are swallowed so an unusual
 * system trust store cannot break fetches that would otherwise have worked.
 */
function ensureSystemCAsLoaded(): void {
  if (_systemCAsLoaded) return;
  _systemCAsLoaded = true;

  const t = tls as typeof tls & {
    getCACertificates?: (
      type: "default" | "system" | "bundled" | "extra"
    ) => string[];
    setDefaultCACertificates?: (certs: string[]) => void;
  };
  if (
    typeof t.getCACertificates !== "function" ||
    typeof t.setDefaultCACertificates !== "function"
  ) {
    return;
  }

  try {
    const system = t.getCACertificates("system");
    if (!system || system.length === 0) return;
    const defaults = t.getCACertificates("default");
    t.setDefaultCACertificates([...defaults, ...system]);
  } catch {
    // best-effort — fall through to whatever default trust Node had
  }
}

/**
 * Get a dispatcher (Agent or ProxyAgent) for fetch requests.
 * Respects HTTPS_PROXY, https_proxy, HTTP_PROXY, http_proxy.
 * When no proxy is set, uses a plain Agent with optional TLS verification control.
 */
async function getAgent(_url?: string): Promise<Dispatcher> {
  ensureSystemCAsLoaded();

  const rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0";

  const envProxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;

  if (envProxyUrl) {
    if (!_agent) {
      _agent = new ProxyAgent({
        uri: envProxyUrl,
        connect: {
          rejectUnauthorized,
        },
        requestTls: {
          rejectUnauthorized,
        },
      });
    }
    return _agent;
  }

  if (!_agent) {
    _agent = new Agent({
      connect: {
        rejectUnauthorized,
      },
    });
  }

  return _agent;
}

function getUserAgent(): Record<string, string> {
  const platformMap: Record<string, string> = {
    darwin: "Macintosh",
    win32: "Windows NT",
    linux: "Linux",
    android: "Android",
    ios: "iPhone",
  };
  const platform = platformMap[process.platform] || "Unknown";
  const osDetails = process.platform === "win32" ? "10.0" : "";
  return {
    "User-Agent": `Mozilla/5.0 (${platform}${
      osDetails ? "; " + osDetails : ""
    }) builder-doctor/${pkgVersion}`,
    "Sec-Ch-Ua-Platform": platform,
  };
}

/**
 * Fetch with proxy support (HTTPS_PROXY / HTTP_PROXY) and shared dispatcher.
 * Uses undici; respects NODE_TLS_REJECT_UNAUTHORIZED for TLS verification.
 */
export const safeFetch = async (
  input: string | URL,
  init?: RequestInit
): ReturnType<typeof globalThis.fetch> => {
  const url = typeof input === "string" ? input : input.toString();
  const agent = await getAgent(url);
  return fetchPolyfill(input, {
    ...init,
    dispatcher: agent,
    headers: {
      ...init?.headers,
      ...getUserAgent(),
    },
  }) as ReturnType<typeof globalThis.fetch>;
};

const TLS_CERT_ERROR_CODES = new Set([
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "CERT_UNTRUSTED",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

export function getTlsCertErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let i = 0; i < 8 && current; i += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && TLS_CERT_ERROR_CODES.has(code)) {
      return code;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export function formatTlsCertErrorMessage(code: string): string {
  return [
    `Network request failed with TLS certificate error: ${code}.`,
    "",
    "This usually means your network is behind a corporate proxy or firewall that",
    "intercepts HTTPS traffic with a custom certificate authority that Node.js does",
    "not trust by default.",
    "",
    "To fix this, try one of the following (in order of preference):",
    "  1. Point Node at your organization's root CA bundle (recommended):",
    "       export NODE_EXTRA_CA_CERTS=/path/to/your-org-ca.pem",
    "     Ask your IT team for the certificate file if you do not have it.",
    "",
    "  2. If you are behind an HTTP(S) proxy, make sure it is set:",
    "       export HTTPS_PROXY=http://your-proxy:port",
    "       export HTTP_PROXY=http://your-proxy:port",
    "",
    "  3. As a last resort (insecure, disables TLS verification), re-run with",
    "     the --acceptSelfSigned flag, or set:",
    "       export NODE_TLS_REJECT_UNAUTHORIZED=0",
  ].join("\n");
}

export const __testing__ = {
  getAgent,
  resetCache: () => {
    _agent = undefined;
  },
};
