import { mkdirSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import * as tar from "tar";
import { safeFetch } from "./fetch";

const DEFAULT_SKILLS_SOURCE = "BuilderIO/builder-agent-skills";
const DEFAULT_PLUGINS_SOURCE = "BuilderIO/builder-agent-skills";
const GITHUB_TARBALL_BASE_URL = "https://codeload.github.com";

export interface InstallSkillOptions {
  skillName: string;
  source?: string;
  verbose?: boolean;
}

export interface InstallPluginOptions {
  pluginName: string;
  source?: string;
  verbose?: boolean;
}

export async function runInstallSkill(
  options: InstallSkillOptions
): Promise<void> {
  const { skillName, source, verbose = false } = options;
  const sourceRepo = resolveSourceRepository(source);

  if (skillName === "skills") {
    await runListSkills({ sourceRepo, verbose });
    return;
  }

  validateInstallItemName(skillName, "skill");

  const escapedSkillName = escapeRegExp(skillName);
  const destinationPath = path.join(".builder", "skills", skillName);

  await runInstallFromTarball({
    itemType: "Skill",
    itemName: skillName,
    tarballUrl: createTarballUrl(sourceRepo),
    destinationDir: path.join(process.cwd(), destinationPath),
    archivePathPattern: new RegExp(`^[^/]+/${escapedSkillName}/`),
    strip: 2,
    missingItemSource: sourceRepo,
    installedPathDisplay: destinationPath,
    verbose,
  });
}

export async function runInstallPlugin(
  options: InstallPluginOptions
): Promise<void> {
  const { pluginName, source, verbose = false } = options;
  const sourceRepo = resolveSourceRepository(source, DEFAULT_PLUGINS_SOURCE);

  validateInstallItemName(pluginName, "plugin");

  const escapedPluginName = escapeRegExp(pluginName);

  await runInstallFromTarball({
    itemType: "Plugin",
    itemName: pluginName,
    tarballUrl: createTarballUrl(sourceRepo),
    destinationDir: path.join(process.cwd(), ".builder"),
    archivePathPattern: new RegExp(`^[^/]+/${escapedPluginName}/`),
    strip: 2,
    missingItemSource: sourceRepo,
    installedPathDisplay: ".builder",
    verbose,
  });
}

interface ListSkillsOptions {
  sourceRepo: string;
  verbose: boolean;
}

interface InstallFromTarballOptions {
  itemType: "Skill" | "Plugin";
  itemName: string;
  tarballUrl: string;
  destinationDir: string;
  archivePathPattern: RegExp;
  strip: number;
  missingItemSource: string;
  installedPathDisplay: string;
  verbose: boolean;
}

async function runListSkills(options: ListSkillsOptions): Promise<void> {
  const { sourceRepo, verbose } = options;
  const tarballUrl = createTarballUrl(sourceRepo);

  if (verbose) {
    console.log(`Downloading skills catalog from ${tarballUrl}`);
  }

  const response = await safeFetch(tarballUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download skills repository from ${sourceRepo} (HTTP ${response.status} ${response.statusText})`
    );
  }

  const skillsWithSkillFile = new Set<string>();

  await pipeline(
    Readable.from(Buffer.from(await response.arrayBuffer())),
    createGunzip(),
    tar.t({
      strict: true,
      onentry: (entry) => {
        const entryPath = entry.path;
        assertSafeArchivePath(entryPath);

        const match = entryPath.match(/^[^/]+\/([^/]+)\/SKILL\.md$/);
        if (match) {
          skillsWithSkillFile.add(match[1]);
        }
      },
    })
  );

  const sortedSkills = Array.from(skillsWithSkillFile).sort();

  if (sortedSkills.length === 0) {
    console.log("No skills were found.");
    return;
  }

  console.log(sortedSkills.join("\n"));
}

async function runInstallFromTarball(
  options: InstallFromTarballOptions
): Promise<void> {
  const {
    itemType,
    itemName,
    tarballUrl,
    destinationDir,
    archivePathPattern,
    strip,
    missingItemSource,
    installedPathDisplay,
    verbose,
  } = options;

  if (verbose) {
    console.log(`Downloading ${itemType.toLowerCase()} "${itemName}" from ${tarballUrl}`);
  }

  const response = await safeFetch(tarballUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download ${itemType.toLowerCase()}s repository (HTTP ${response.status} ${response.statusText})`
    );
  }

  mkdirSync(destinationDir, { recursive: true });

  let extractedFileCount = 0;

  await pipeline(
    Readable.from(Buffer.from(await response.arrayBuffer())),
    createGunzip(),
    tar.x({
      cwd: destinationDir,
      strict: true,
      preservePaths: false,
      strip,
      filter: (entryPath, entry) => {
        assertSafeArchivePath(entryPath);

        if (!archivePathPattern.test(entryPath)) {
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
      `${itemType} "${itemName}" was not found in ${missingItemSource}`
    );
  }

  console.log(
    `Installed ${itemType.toLowerCase()} "${itemName}" into ${installedPathDisplay}`
  );
}

function validateInstallItemName(name: string, label: "skill" | "plugin"): void {
  if (!name || !/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new Error(
      `Invalid ${label} name. Use only letters, numbers, dots, underscores, and hyphens.`
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

function resolveSourceRepository(
  source: string | undefined,
  fallback = DEFAULT_SKILLS_SOURCE
): string {
  if (!source) {
    return fallback;
  }

  if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(source)) {
    throw new Error(
      "Invalid source format. Use GitHub owner/repository, for example: BuilderIO/builder-agent-skills"
    );
  }

  return source;
}

function createTarballUrl(sourceRepo: string): string {
  return `${GITHUB_TARBALL_BASE_URL}/${sourceRepo}/tar.gz/refs/heads/main`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
