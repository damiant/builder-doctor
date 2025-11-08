import { readFileSync, statSync } from "fs";

export interface RuleFile {
  filename: string;
  description?: string;
  globs?: string;
  alwaysApply?: boolean;
  body: string;
  lines: number;
}

export interface MdcFrontmatterData {
  description?: string;
  glob?: string;
  type: "agent-mode" | "always";
}

export interface MdcParseResult {
  frontmatter: MdcFrontmatterData;
  body: string;
}

/**
 * Detects if a file is an MDC file based on filename and content
 * @param fileName - The name or path of the file
 * @param content - The content of the file
 * @returns true if the file appears to be an MDC file
 */
export function isMdcFile(
  fileName: string | undefined,
  content: string | undefined
): boolean {
  if (!fileName || !content) {
    return false;
  }

  // Check file extension
  const hasCorrectExtension = fileName.toLowerCase().endsWith(".mdc");

  // Check content structure - should have frontmatter delimiters
  const hasValidStructure =
    typeof content === "string" &&
    content.trim().startsWith("---") &&
    content.indexOf("---", 3) > 3; // Second --- should exist after the first one

  return hasCorrectExtension && hasValidStructure;
}

/**
 * Parses .mdc file content with frontmatter format.
 * Expected format:
 * ```
 * ---
 * description: Some description
 * globs: *.ts,*.js
 * alwaysApply: true
 * ---
 * Main content body here
 * ```
 *
 * @param fileContent - The raw file content to parse
 * @returns Parsed frontmatter data and body content
 * @throws Error if the file format is invalid
 */
export function parseMdcFile(fileContent: string): MdcParseResult {
  // Handle invalid input gracefully
  if (!fileContent || typeof fileContent !== "string") {
    return {
      frontmatter: {
        description: "",
        glob: "",
        type: "agent-mode",
      },
      body: "",
    };
  }

  try {
    // Preprocess content by converting JSON string representation and replacing \\n with \n
    // This matches the original logic exactly
    const preprocessedContent = JSON.stringify(fileContent).replace(
      /\\n/g,
      "\n"
    );

    // Split by frontmatter delimiters
    const parts = preprocessedContent.split("---");

    // Handle missing frontmatter delimiters gracefully
    if (parts.length < 3) {
      return {
        frontmatter: {
          description: "",
          glob: "",
          type: "agent-mode",
        },
        body: fileContent.trim(),
      };
    }

    // Extract frontmatter and body, filtering out empty parts - this matches the original logic
    const filteredParts = parts.map((s) => s.trim()).filter(Boolean);

    // Handle insufficient parts gracefully
    if (filteredParts.length < 2) {
      return {
        frontmatter: {
          description: "",
          glob: "",
          type: "agent-mode",
        },
        body: "",
      };
    }

    // The original logic assumes filtered parts [0] is the quote, [1] is frontmatter, [2] is body
    // We need to handle this correctly based on the actual structure
    let frontmatterContent = "";
    let body = "";

    if (filteredParts.length >= 3) {
      // Standard case: ['"', 'frontmatter', 'body...', 'more body...']
      frontmatterContent = filteredParts[1];
      // Join all remaining parts in case body contains additional ---
      body = filteredParts.slice(2).join(" --- ");

      // Remove trailing quote from body if present
      if (body.endsWith('"')) {
        body = body.slice(0, -1);
      }
    } else if (filteredParts.length === 2) {
      // Edge case: just frontmatter and body combined
      frontmatterContent = filteredParts[0];
      body = filteredParts[1];

      if (body.endsWith('"')) {
        body = body.slice(0, -1);
      }
    }

    body = body.trim();

    // Parse frontmatter
    const frontmatterLines = frontmatterContent
      .split("\n")
      .filter((line) => line.trim());

    let description = "";
    let glob = "";
    let type: "agent-mode" | "always" = "agent-mode";

    for (const line of frontmatterLines) {
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      switch (key) {
        case "description":
          description = value || "";
          break;
        case "globs":
          glob = value || "";
          break;
        case "alwaysApply":
          type = value === "true" ? "always" : "agent-mode";
          break;
      }
    }

    return {
      frontmatter: {
        description,
        glob,
        type,
      },
      body,
    };
  } catch (error) {
    // If any error occurs during parsing, return graceful defaults
    return {
      frontmatter: {
        description: "",
        glob: "",
        type: "agent-mode",
      },
      body: fileContent.trim(),
    };
  }
}

  export function parseCursorRules(absolutePath: string): RuleFile {
    let exists = false;
    try {
      const stat = statSync(absolutePath);
      exists = stat.isFile();
    } catch {
      exists = false;
    }
    try {
      if (exists) {
        const fileContent = readFileSync(absolutePath, 'utf-8');
        const lines = fileContent.split('\n').length;
        const result = parseMdcFile(fileContent);
        return {
            filename: absolutePath,
            description: result.frontmatter.description,
            globs: result.frontmatter.glob,
            alwaysApply: result.frontmatter.type ? result.frontmatter.type === "always" : undefined,
            lines,
            body: fileContent
        }
      } else {
        throw new Error(`File not found at path: ${absolutePath}`);
      }
    } catch (error) {
      throw new Error(`Error parsing MDC file at ${absolutePath}: ${error}`);
    }
  }