import { mkdirSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import * as tar from "tar";
import { safeFetch } from "./fetch";

export interface InstallSkillOptions {
  skillName: string;
  verbose?: boolean;
}

export async function runInstallSkill(
  options: InstallSkillOptions
): Promise<void> {
  const { skillName, verbose = false } = options;

  validateSkillName(skillName);

  const tarballUrl =
    "https://codeload.github.com/BuilderIO/builder-agent-skills/tar.gz/refs/heads/main";

  if (verbose) {
    console.log(`Downloading skill "${skillName}" from ${tarballUrl}`);
  }

  const response = await safeFetch(tarballUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download skills repository (HTTP ${response.status} ${response.statusText})`
    );
  }

  const destinationDir = path.join(
    process.cwd(),
    ".builder",
    "skills",
    skillName
  );
  mkdirSync(destinationDir, { recursive: true });

  const escapedSkillName = escapeRegExp(skillName);
  const skillPathPattern = new RegExp(`^[^/]+/${escapedSkillName}/`);

  let extractedFileCount = 0;

  await pipeline(
    Readable.from(Buffer.from(await response.arrayBuffer())),
    createGunzip(),
    tar.x({
      cwd: destinationDir,
      strict: true,
      preservePaths: false,
      strip: 2,
      filter: (entryPath, entry) => {
        assertSafeArchivePath(entryPath);

        if (!skillPathPattern.test(entryPath)) {
          return false;
        }

        const entryType = (entry as { type?: string }).type;
        if (entryType === "SymbolicLink" || entryType === "Link") {
          throw new Error(`Refusing to extract link entry: ${entryPath}`);
        }

        extractedFileCount += 1;
        return true;
      },
    })
  );

  if (extractedFileCount === 0) {
    throw new Error(
      `Skill "${skillName}" was not found in BuilderIO/builder-agent-skills`
    );
  }

  console.log(
    `Installed skill "${skillName}" into ${path.join(
      ".builder",
      "skills",
      skillName
    )}`
  );
}

function validateSkillName(skillName: string): void {
  if (!skillName || !/^[a-zA-Z0-9._-]+$/.test(skillName)) {
    throw new Error(
      "Invalid skill name. Use only letters, numbers, dots, underscores, and hyphens."
    );
  }
}

function assertSafeArchivePath(entryPath: string): void {
  if (entryPath.startsWith("/") || /^[a-zA-Z]:/.test(entryPath)) {
    throw new Error(`Unsafe archive path: ${entryPath}`);
  }

  const normalized = path.posix.normalize(entryPath);
  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(`Unsafe archive path: ${entryPath}`);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
