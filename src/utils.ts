import * as https from "https";
import * as http from "http";
import { IncomingHttpHeaders } from "http2";

export interface Response {
  statusCode?: number;
  statusMessage?: string;
  body: string;
  headers: IncomingHttpHeaders
}

interface CheckOptions {
  host: string;
  url: string;
  verbose: boolean;
  expectedStatus: number;
  expectedContent?: string;
  expectedHeader?: string;
  expectedHeaderValue?: string;
  message?: string
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
            headers: res.headers
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

export async function check(options: CheckOptions  
): Promise<void> {
  let reason = '';
  let details = '';
  try {
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

    if (reason == "") {
      console.log(`${green}✓${reset} ${options.host}${options.message ?? ''}`);
    }
  } catch (err) {
    let msg = `${err}`;
    // Eg turn off Wifi
    if (msg.includes(`Error: getaddrinfo`)) {
      reason = `You may not have internet connectivity or the domain ${options.host} is not accessible.`;
    }

    // Not a known error then report back the actual error
    if (reason == "") {
      reason = msg;
    }
  }
  if (reason !== "") {
    console.log(`${options.host} ${red}Failed${reset}: ${reason}`);
  }
  if (details !== '') {
    console.log(details);
  }
}
