import {
  fetch as fetchPolyfill,
  type RequestInit,
  Agent,
  ProxyAgent,
  Dispatcher,
} from "undici";
import process from "node:process";
import { version as pkgVersion } from "../package.json";

let _agent: Dispatcher | undefined;

/**
 * Get a dispatcher (Agent or ProxyAgent) for fetch requests.
 * Respects HTTPS_PROXY, https_proxy, HTTP_PROXY, http_proxy.
 * When no proxy is set, uses a plain Agent with optional TLS verification control.
 */
async function getAgent(_url?: string): Promise<Dispatcher> {
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

export const __testing__ = {
  getAgent,
  resetCache: () => {
    _agent = undefined;
  },
};
