import * as https from "https";
import * as http from "http";
import { IncomingHttpHeaders } from "http2";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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

export async function get(url: string): Promise<Response> {
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

export async function check(options: CheckOptions): Promise<void> {
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

      const { stdout, stderr } = await execAsync(pingCommand);

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