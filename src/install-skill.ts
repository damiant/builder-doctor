import { mkdirSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import * as tar from "tar";
import { safeFetch } from "./fetch";

const skillsRepoTarballUrl =
  "https://codeload.github.com/BuilderIO/builder-agent-skills/tar.gz/refs/heads/main";

export interface InstallSkillOptions {
  skillName: string;
  verbose?: boolean;
}

export interface SkillSummary {
  name: string;
  description: string;
}

export async function runInstallSkill(
  options: InstallSkillOptions
): Promise<void> {
  const { skillName, verbose = false } = options;

  validateSkillName(skillName);

  if (verbose) {
    console.log(`Downloading skill "${skillName}" from ${skillsRepoTarballUrl}`);
  }

  const response = await safeFetch(skillsRepoTarballUrl);
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

export async function listAvailableSkills(options?: {
  verbose?: boolean;
}): Promise<SkillSummary[]> {
  const verbose = options?.verbose ?? false;

  if (verbose) {
    console.log(`Downloading available skills from ${skillsRepoTarballUrl}`);
  }

  const response = await safeFetch(skillsRepoTarballUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download skills repository (HTTP ${response.status} ${response.statusText})`
    );
  }

  const skillDescriptions = new Map<string, string>();

  await pipeline(
    Readable.from(Buffer.from(await response.arrayBuffer())),
    createGunzip(),
    tar.t({
      strict: true,
      onentry: (entry) => {
        const entryPath = entry.path;
        assertSafeArchivePath(entryPath);

        const match = entryPath.match(/^[^/]+\/([^/]+)\/SKILL\.md$/);
        if (!match) {
          entry.resume();
          return;
        }

        const skillName = match[1];
        const chunks: Buffer[] = [];

        entry.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        entry.on("end", () => {
          const markdown = Buffer.concat(chunks).toString("utf8");
          skillDescriptions.set(
            skillName,
            extractDescriptionFromSkillMarkdown(markdown)
          );
        });
      },
    })
  );

  return Array.from(skillDescriptions.entries())
    .map(([name, description]) => ({ name, description }))
    .sort((a, b) => a.name.localeCompare(b.name));
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

function extractDescriptionFromSkillMarkdown(markdown: string): string {
  const lines = removeFrontmatter(markdown.replace(/\r\n/g, "\n")).split("\n");

  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];
  let inCodeFence = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (inCodeFence) {
      continue;
    }

    if (!trimmed) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(" "));
        currentParagraph = [];
      }
      continue;
    }

    if (trimmed.startsWith("#")) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(" "));
        currentParagraph = [];
      }
      continue;
    }

    currentParagraph.push(trimmed);
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(" "));
  }

  if (paragraphs.length === 0) {
    return "No description available.";
  }

  return paragraphs[0]
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function removeFrontmatter(content: string): string {
  if (!content.startsWith("---\n")) {
    return content;
  }

  const endMarkerIndex = content.indexOf("\n---\n", 4);
  if (endMarkerIndex === -1) {
    return content;
  }

  return content.slice(endMarkerIndex + 5);
}
