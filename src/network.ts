import * as https from "https";
import * as http from "http";
import { IncomingHttpHeaders } from "http2";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function runNetwork(options: NetworkOptions): Promise<void> {
  const { verbose } = options;

  console.log(`Checking connectivity to Builder.io services...`);

  await check({
    host: "firestore.googleapis.com",
    url: "https://firestore.googleapis.com/",
    verbose,
    expectedStatus: 404,
    expectedContent: "<span id=logo aria-label=Google>",
  });

  await check({
    host: "firebasestorage.googleapis.com",
    url: "https://firebasestorage.googleapis.com/",
    verbose,
    expectedStatus: 404,
    expectedContent: "<span id=logo aria-label=Google>",
  });

  await check({
    host: "identitytoolkit.googleapis.com",
    url: "http://identitytoolkit.googleapis.com/",
    verbose,
    expectedStatus: 404,
    expectedContent: "<span id=logo aria-label=Google>",
  });

  await check({
    host: "builder.io",
    url: "https://www.builder.io/",
    verbose,
    expectedStatus: 200,
    expectedContent: "<body>",
    message: " (Builder website)"
  });

    await check({
    host: "api.builder.io",
    url: "https://api.builder.io/",
    verbose,
    expectedStatus: 404,
  });

  await check({
    host: "builder.io app",
    url: "https://builder.io/content",
    verbose,
    expectedStatus: 200,
    expectedContent: "<body>",
    message: " (Builder web application)"
  });

  await check({
    host: "cdn.builder.io",
    url: "https://cdn.builder.io/static/media/builder-logo.bff0faae.png",
    verbose,
    expectedStatus: 200,
    expectedHeader: "content-type",
    expectedHeaderValue: "image/png",
    message: " (Builder Content Network)",
  });

  await check({
    host: "*.builder.codes",
    url: "https://stuff.builder.codes/",
    verbose,
    expectedStatus: 404,
    expectedHeader: "server",
    expectedHeaderValue: "Google Frontend",
  });

  await check({
    host: "*.builder.my",
    url: "https://www.builder.my/",
    verbose,
    expectedStatus: 200,
    expectedHeader: "x-powered-by",
    expectedHeaderValue: "Next.js",
  });

  await check({
    host: "*.fly.dev",
    url: "https://status.flyio.net/",
    verbose,
    expectedStatus: 200,
    message: " (Unknown status)",
  });

  await check({
    host: "builderio.xyz",
    url: "https://builderio.xyz/",
    verbose,
    expectedStatus: 404,
    message: " (Cloud Containers)"
  });

  await check({
    host: "34.136.119.149",
    verbose,
    message: " (ping)",
    additionalErrorInfo: "This is the Static IP address that Builder.io uses",
    ping: true,
  });
}

export interface Response {
  statusCode?: number;
  statusMessage?: string;
  body: string;
  headers: IncomingHttpHeaders;
}

interface CheckOptions {
  host: string;
  url?: string;
  verbose: boolean;
  expectedStatus?: number;
  expectedContent?: string;
  expectedHeader?: string;
  expectedHeaderValue?: string;
  message?: string;
  additionalErrorInfo?: string;
  ping?: boolean;
}

async function get(url: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === "https:" ? https : http;

    client
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 0,
            body: data,
            statusMessage: res.statusMessage || "",
            headers: res.headers,
          });
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

const red = "\x1b[31m";
const green = "\x1b[32m";
const reset = "\x1b[0m";

interface CheckResult {
  reason: string;
  details: string;
}

async function check(options: CheckOptions): Promise<void> {
  let result: CheckResult = { reason: "", details: "" };
  try {
    if (options.ping) {
      result = await checkPing(options);
    } else {
      result = await checkHttp(options);
    }

    if (result.reason == "") {
      console.log(`${green}✓${reset} ${options.host}${options.message ?? ""}`);
    }
  } catch (err) {
    let msg = `${err}`;
    // Eg turn off Wifi
    if (msg.includes(`Error: getaddrinfo`)) {
      result.reason = `You may not have internet connectivity or the domain ${options.host} is not accessible.`;
    }

    // Not a known error then report back the actual error
    if (result.reason == "") {
      result.reason = msg;
    }
  }
  if (result.reason !== "") {
    console.log(
      `${red}✗ ${options.host} ${red}Failed${reset}: ${result.reason}`
    );
    if (options.additionalErrorInfo) {
      console.log(options.additionalErrorInfo);
    }
  }
  if (result.details !== "") {
    console.log(result.details);
  }
}

async function checkHttp(options: CheckOptions): Promise<CheckResult> {
  let reason = "";
  let details = "";
  if (!options.url) throw new Error("URL is required for HTTP checks");
  const response = await get(options.url);
  if (response.statusCode !== options.expectedStatus) {
    reason = `The domain ${options.host} appears to be blocked. An unexpected status code was reported ${response.statusCode}. Check your network settings (eg VPN connection, network status, Wifi).`;
  } else if (
    options.expectedContent &&
    response.body.indexOf(options.expectedContent) === -1
  ) {
    reason = `The domain ${options.host} appears to be blocked. An unexpected response was found. Check your network settings (eg VPN connection, network status, Wifi).`;
    if (options.verbose) {
      details = "Body" + response.body;
    }
  } else if (
    options.expectedHeader &&
    response.headers[options.expectedHeader] !== options.expectedHeaderValue
  ) {
    reason = `The domain ${options.host} appears to be blocked. An unexpected response header for "${options.expectedHeader}" was found. Check your network settings (eg VPN connection, network status, Wifi).`;
    if (options.verbose) {
      details = `Headers: ${JSON.stringify(response.headers)}`;
    }
  }
  return { reason, details };
}

function checkPing(options: CheckOptions): Promise<CheckResult> {
  return new Promise(async (resolve) => {
    try {
      const isWindows = process.platform === "win32";
      const pingCommand = isWindows
        ? `ping -n 1 ${options.host}`
        : `ping -c 1 ${options.host}`;

      const { stderr } = await execAsync(pingCommand);

      if (stderr) {
        resolve({
          reason: `Ping to ${options.host} failed: ${stderr}`,
          details: "",
        });
      } else {
        resolve({ reason: "", details: "" });
      }
    } catch (error) {
      resolve({
        reason: `Unable to ping ${options.host}. The host may be unreachable or blocking ICMP requests. ${error}`,
        details: options.verbose ? `${error}` : "",
      });
    }
  });
}

interface NetworkOptions {
  verbose: boolean;
}
