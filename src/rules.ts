import { existsSync, readdirSync, statSync } from "fs";
import { basename, join } from "path";
import { parseCursorRules as readRuleFile, RuleFile } from "./rule-parse";

const MAX_LINES = 500; // Maximum acceptable lines in rules
const WARN_LINES = 150; // Lines at which to warn
const MAX_TOTAL_LINES = 500; // Maximum total lines in all rules

export interface RulesOptions {
  verbose: boolean;
}

interface RulesResult {
  hasBuilderRulesFile: boolean;
  hasAgentsMd: boolean;
  rules: RuleFile[];
  rootRuleFile?: RuleFile;
}

export async function checkRules(options: RulesOptions): Promise<void> {
  const result: RulesResult = {
    hasAgentsMd: hasAgentsMd(),
    hasBuilderRulesFile: hasBuilderRulesFile(),
    rules: await getRuleFiles(),
    rootRuleFile: getRootRuleFile(),
  };
  if (options.verbose) {
    console.log("Rules Check Result:", JSON.stringify(result, null, 2));
  }
  commentOn(result);
  
}

function commentOn(result: RulesResult): void {
  const problems: string[] = [];
  const warnings: string[] = [];
  const infos: string[] = [];

  if (!result.hasAgentsMd && !result.hasBuilderRulesFile) {
    if (existsSync("agent.md")) {
      problem("Found agent.md file. Did you mean agents.md?");
    }
    if (existsSync("builderrules")) {
      problem("Found builderrules file. Did you mean .builderrules?");
    }
    if (existsSync(".builderules")) {
      problem("Found .builderules file. Did you mean .builderrules?");
    }
    return;
  }

  if (existsSync(".agents/rules")) {
    infos.push(
      "Found .agents/rules folder. This folder will not be found by Fusion for rules. Use .builder/rules instead."
    );
  }

  if (!result.rootRuleFile) {
    problems.push("Error with rules file.");
    outputMessages(problems, warnings, infos);
    return;
  }
  const rootFileLines = result.rootRuleFile.lines || 0;
  let lines = rootFileLines;
  let alwaysCount = 0;
  let alwaysList: string[] = [];
  for (const r of result.rules) {
    if (r.alwaysApply) {
      alwaysCount++;
      alwaysList.push(basename(r.filename));
      lines += r.lines;
    }
    const hasCorrectExtension = r.filename.toLowerCase().endsWith(".mdc");

    if (!hasCorrectExtension) {
      warnings.push(
        `${basename(
          r.filename
        )} does not have a .mdc file extension. Is this file intended to be in the rules folder?`
      );
    }
    if (!r.alwaysApply) {
      if (
        hasCorrectExtension &&
        (!r.description || r.description.trim().length === 0)
      ) {
        warnings.push(
          `${basename(
            r.filename
          )} is missing a description in the frontmatter. Consider adding a description so that this rule can conditionally apply.`
        );
      }
    }
    if (r.alwaysApply && !r.globs) {
      infos.push(
        `${basename(
          r.filename
        )} is marked as alwaysApply but is missing globs in the frontmatter. Consider adding globs to specify which files this rule should apply to, or removing alwaysApply.`
      );
    }
    if (r.lines > MAX_LINES && hasCorrectExtension) {
      problems.push(
        `${basename(r.filename)} has ${
          r.lines
        } lines. Reduce to below ${MAX_LINES} lines to avoid the AI ignoring some rules.`
      );
    } else if (r.lines > WARN_LINES && hasCorrectExtension) {
      warnings.push(
        `${basename(r.filename)} has ${
          r.lines
        } lines. Consider reducing below ${WARN_LINES} to avoid the AI ignoring some rules.`
      );
    }
  }

  if (alwaysCount > 5) {
    warnings.push(
      `You have ${alwaysCount} rules files marked as alwaysApply. This is the same as adding to ${result.rootRuleFile.filename} but with unsorted precendence. Consider limiting use of alwaysApply.`
    );
  }
  if (rootFileLines > MAX_LINES) {
    problems.push(
      `${result.rootRuleFile.filename} has ${rootFileLines} lines. Consider reducing below ${MAX_LINES} to avoid the AI ignoring some rules.`
    );
  }
  if (lines > MAX_TOTAL_LINES) {
    if (alwaysCount > 0) {
      problems.push(
        `Your rules files have a total of ${lines} lines that are always applied. Consider removing alwaysApply from ${alwaysList.join(
          ", "
        )} to reduce the line count below ${MAX_TOTAL_LINES} lines to avoid the AI ignoring some rules.`
      );
    } else {
      problems.push(
        `Your rules files have a total of ${lines} lines that are always applied. Consider reducing this below ${MAX_TOTAL_LINES} lines to avoid the AI ignoring some rules.`
      );
    }
  }

  if (problems.length === 0 && warnings.length === 0 && infos.length === 0) {
    console.log(
      `${green}✓${reset} ${result.rootRuleFile.filename} (${result.rules.length} rules files. ${lines} lines).`
    );
  } else {
    console.log();
    console.log(
      `The following recommendations were found with your rules (${result.rootRuleFile.filename}):`
    );
    outputMessages(problems, warnings, infos);
  }
}

function outputMessages(
  problems: string[],
  warnings: string[],
  infos: string[]
): void {
  problems.forEach((msg) => console.log(`${red}✗${reset} ${msg}`));
  warnings.forEach((msg) => console.log(`${orange}⚠${reset} ${msg}`));
  infos.forEach((msg) => console.log(`${blue}ℹ${reset} ${msg}`));
}

function problem(message: string): void {
  console.log(`${red}✗${reset} ${message}`);
}

function warn(message: string): void {
  console.log(`${orange}⚠${reset} ${message}`);
}

function info(message: string): void {
  console.log(`${blue}ℹ${reset} ${message}`);
}

function hasAgentsMd(): boolean {
  return existsSync("agents.md");
}

function hasBuilderRulesFile(): boolean {
  return existsSync(".builderrules");
}

const IGNORE_FILES = [".gitignore", ".builderignore"];
const IGNORE_PATTERNS = [
  "**/*.snap",
  "**/*.liquid",
  "**/.git",
  "**/dist",
  "**/*.pyc",
  "**/.DS_Store",
  "**/.vscode",
  "**/__pycache__",
  "**/coverage",
  "**/.next",
  "**/coverage",
  "**/example",
  "**/__snapshots__",
  "**/.gradle",
  "**/xcuserdata",
  "**/.build",
  "**/*.zip",

  // Private keys and certificates
  "**/*.pem",
  "**/*.key",
  "**/*.p12",
  "**/*.pfx",
  "**/*.cer",
  "**/*.crt",
  "**/*.der",
  "**/*.p7b",
  "**/*.p7c",
  "**/*.jks",
  "**/*.keystore",

  // SSH keys
  "**/id_rsa",
  "**/id_rsa.*",
  "**/id_dsa",
  "**/id_dsa.*",
  "**/id_ecdsa",
  "**/id_ecdsa.*",
  "**/id_ed25519",
  "**/id_ed25519.*",
  "**/.ssh/**",
  "**/known_hosts",
  "**/authorized_keys",

  // Cloud provider credentials
  "**/.aws/**",
  "**/credentials",
  "**/.gcp/**",
  "**/.azure/**",
  "**/gcloud/**",
  "**/google-credentials.json",
  "**/gcp-key.json",
  "**/service-account*.json",

  // API keys and tokens
  "**/.pypirc",
  "**/.dockercfg",
  "**/.docker/config.json",
  "**/token.json",
  "**/tokens.json",
  "**/secrets.json",
  "**/secret.json",
  "**/api-keys.json",
  "**/apikeys.json",

  // Database files and dumps
  "**/*.sql",
  "**/*.sqlite",
  "**/*.sqlite3",
  "**/*.db",
  "**/*.dump",
  "**/*.bak",

  // Password files
  "**/passwd",
  "**/password",
  "**/passwords",
  "**/.htpasswd",
  "**/shadow",

  // Git credentials
  "**/.git-credentials",
  "**/.gitconfig",
  "**/.netrc",

  // Kubernetes secrets
  "**/kubeconfig",
  "**/.kube/**",
  "**/k8s-secrets.yaml",
  "**/k8s-secrets.yml",

  // Terraform state
  "**/*.tfstate",
  "**/*.tfstate.*",
  "**/.terraform/**",

  // Other sensitive files
  "**/.history",
  "**/.bash_history",
  "**/.zsh_history",
  "**/wallet.dat",
  "**/.gnupg/**",
  "**/private.xml",
  "**/signing.properties",
  "**/*.ovpn",
  "**/wp-config.php",
  "**/config.inc.php",
  "**/local_settings.py",
  "**/database.yml",
  "**/secrets.yml",
  "**/.tox/**",
  "**/firebase-adminsdk*.json",
  "**/firebaseConfig.json",
  "**/google-services.json",
  "**/GoogleService-Info.plist",
];

async function getRuleFiles(): Promise<RuleFile[]> {
  const currentDir = process.cwd();
  const rulesFolders = [".cursor/rules", ".builder/rules"];
  const rulesFiles = [
    ".cursorrules",
    ".builderrules",
    ".windsurfrules",
    ".github/copilot-instructions.md",
  ];
  let files: RuleFile[] = [];
  try {
    for (const rulesFolder of rulesFolders) {
      const projectRulesDir = join(currentDir, rulesFolder);
      if (existsSync(projectRulesDir)) {
        files = [
          ...findRulesFilesRecursively(projectRulesDir, projectRulesDir),
        ];
      }
    }
    return files;
  } catch (error) {
    console.debug(`Error reading ${currentDir}:`, error);
  }

  return [];
}

function findRulesFilesRecursively(
  dir: string,
  rulesFolderRoot: string,
  ruleRelativePath: string = ""
): RuleFile[] {
  try {
    if (!existsSync(dir)) {
      return [];
    }
    const entries = readdirSync(dir);
    let rules: RuleFile[] = [];
    for (const entry of entries) {
      const entryPath = join(dir, entry);
      const stat = statSync(entryPath);

      if (!stat) continue;

      if (stat.isDirectory()) {
        const newRulePath = ruleRelativePath
          ? `${ruleRelativePath}/${entry}`
          : entry;
        rules = [
          ...findRulesFilesRecursively(entryPath, rulesFolderRoot, newRulePath),
        ];
      } else {
        rules.push(readRuleFile(entryPath));
      }
    }
    return rules;
  } catch (error) {
    // ignore directory read errors
    console.warn(`ignoring error reading rules from ${dir}:`, error);
    return [];
  }
}

function getRootRuleFile(): RuleFile | undefined {
  if (hasAgentsMd()) {
    return readRuleFile("agents.md");
  } else if (hasBuilderRulesFile()) {
    return readRuleFile(".builderrules");
  }
  return undefined;
}

const red = "\x1b[31m";
const orange = "\x1b[33m";
const blue = "\x1b[34m";
const green = "\x1b[32m";
const reset = "\x1b[0m";
