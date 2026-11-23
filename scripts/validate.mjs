#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { parse as parseYaml } from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const fail = (message) => errors.push(message);
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));

const cursorManifest = readJson(".cursor-plugin/plugin.json");
const claudeManifest = readJson(".claude-plugin/plugin.json");
const claudeMarketplace = readJson(".claude-plugin/marketplace.json");
const mcpConfig = readJson("mcp.json");
const readme = read("README.md");
const changelog = read("CHANGELOG.md");

function validateCursorSchema() {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(readJson("schemas/cursor-plugin.schema.json"));
  if (validate(cursorManifest)) {
    return;
  }
  for (const err of validate.errors) {
    const detail = err.keyword === "additionalProperties" ? `${err.message}: "${err.params.additionalProperty}"` : err.message;
    fail(`.cursor-plugin/plugin.json${err.instancePath || "/"}: ${detail}`);
  }
}

function validateLockstep() {
  const entry = claudeMarketplace.plugins?.find((plugin) => plugin.name === cursorManifest.name);
  if (!entry) {
    fail(`.claude-plugin/marketplace.json has no entry named "${cursorManifest.name}"`);
    return;
  }
  if (entry.source !== "./") {
    fail(`.claude-plugin/marketplace.json entry source must be "./", got "${entry.source}"`);
  }
  const manifests = [
    [".cursor-plugin/plugin.json", cursorManifest],
    [".claude-plugin/plugin.json", claudeManifest],
    [".claude-plugin/marketplace.json#plugins", entry],
  ];
  for (const field of ["name", "version", "description"]) {
    const values = new Set(manifests.map(([, manifest]) => manifest[field]));
    if (values.size !== 1) {
      fail(`"${field}" differs across manifests: ${manifests.map(([file, manifest]) => `${file}=${JSON.stringify(manifest[field])}`).join(", ")}`);
    }
  }
}

function validatePaths() {
  const checks = [
    [".cursor-plugin/plugin.json", "logo", cursorManifest.logo],
    [".cursor-plugin/plugin.json", "mcpServers", cursorManifest.mcpServers],
    [".cursor-plugin/plugin.json", "skills", cursorManifest.skills],
    [".claude-plugin/plugin.json", "mcpServers", claudeManifest.mcpServers],
  ];
  for (const [file, field, value] of checks) {
    if (typeof value !== "string") {
      fail(`${file} "${field}" must be a relative path string`);
      continue;
    }
    const normalized = path.posix.normalize(value);
    if (path.isAbsolute(value) || normalized.startsWith("..") || /^https?:\/\//.test(value)) {
      fail(`${file} "${field}" must be a relative path inside the repo, got "${value}"`);
      continue;
    }
    if (!existsSync(path.join(root, normalized))) {
      fail(`${file} "${field}" points to missing file "${value}"`);
    }
  }
}

function validateMcpServer() {
  const servers = Object.entries(mcpConfig.mcpServers ?? {});
  if (servers.length !== 1) {
    fail(`mcp.json must define exactly one server, found ${servers.length}`);
    return null;
  }
  const [name, server] = servers[0];
  const keys = Object.keys(server).sort().join(",");
  if (keys !== "type,url") {
    fail(`mcp.json server "${name}" must have only "type" and "url" (OAuth via discovery), found: ${keys}`);
  }
  if (server.type !== "http") {
    fail(`mcp.json server "${name}" must be type "http", got "${server.type}"`);
  }
  if (!/^https:\/\/[^\s$]+$/.test(server.url ?? "")) {
    fail(`mcp.json server "${name}" url must be an https URL without placeholders, got "${server.url}"`);
  }
  return { name, server };
}

function validateLogo() {
  if (typeof cursorManifest.logo !== "string" || !existsSync(path.join(root, cursorManifest.logo))) {
    return;
  }
  const svg = read(cursorManifest.logo);
  const viewBox = svg.match(/viewBox="\s*([\d.-]+)\s+([\d.-]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
  if (!viewBox) {
    fail(`${cursorManifest.logo} must declare a viewBox`);
    return;
  }
  if (viewBox[3] !== viewBox[4]) {
    fail(`${cursorManifest.logo} must be square, viewBox is ${viewBox[3]}x${viewBox[4]}`);
  }
  if (/<svg[^>]*\s(width|height)=/.test(svg)) {
    fail(`${cursorManifest.logo} must not set a fixed width or height`);
  }
}

function validateReadme(mcp) {
  const { name, server } = mcp;
  const expected = [
    `claude mcp add --transport http ${name} ${server.url}`,
    `codex mcp add ${name} --url ${server.url}`,
    `codex mcp login ${name}`,
    `npx add-mcp ${server.url} -n ${name}`,
    `/plugin install ${cursorManifest.name}@${claudeMarketplace.name}`,
    `codex plugin add ${cursorManifest.name}@${claudeMarketplace.name}`,
  ];
  for (const snippet of expected) {
    if (!readme.includes(snippet)) {
      fail(`README.md is missing the install command: ${snippet}`);
    }
  }

  const deeplinks = [...readme.matchAll(/(?:cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install|https:\/\/cursor\.com\/install-mcp)\?name=([^&\s)`]+)&config=([A-Za-z0-9+/=]+)/g)];
  if (deeplinks.length < 2) {
    fail("README.md must contain both the https and the cursor:// install links");
  }
  for (const [link, linkName, config] of deeplinks) {
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(config, "base64").toString("utf8"));
    } catch {
      fail(`README.md install link has an undecodable config: ${link}`);
      continue;
    }
    if (linkName !== name || JSON.stringify(decoded) !== JSON.stringify(server)) {
      fail(`README.md install link does not match mcp.json: ${link}`);
    }
  }

  const urls = new Set(readme.match(/https:\/\/api\.rigsecurity\.io\/[^\s"`)]*/g) ?? []);
  for (const url of urls) {
    if (url !== server.url) {
      fail(`README.md references "${url}", expected the mcp.json url "${server.url}"`);
    }
  }
}

function validateSkills() {
  const skillsDir = path.join(root, "skills");
  const dirs = existsSync(skillsDir) ? readdirSync(skillsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()) : [];
  if (dirs.length === 0) {
    fail("skills/ must contain at least one skill directory");
  }
  for (const dir of dirs) {
    const file = `skills/${dir.name}/SKILL.md`;
    if (!existsSync(path.join(root, file))) {
      fail(`${file} is missing`);
      continue;
    }
    const frontmatter = read(file).match(/^---\n([\s\S]*?)\n---\n/);
    if (!frontmatter) {
      fail(`${file} must start with a --- frontmatter block`);
      continue;
    }
    let meta;
    try {
      meta = parseYaml(frontmatter[1]);
    } catch (err) {
      fail(`${file} frontmatter is not valid YAML: ${err.message}`);
      continue;
    }
    if (meta?.name !== dir.name) {
      fail(`${file} frontmatter "name" must be "${dir.name}", got ${JSON.stringify(meta?.name)}`);
    }
    if (typeof meta?.description !== "string" || meta.description.trim() === "") {
      fail(`${file} frontmatter must have a non-empty "description"`);
    }
  }
}

function validateChangelog() {
  if (!new RegExp(`^## ${cursorManifest.version.replaceAll(".", "\\.")}$`, "m").test(changelog)) {
    fail(`CHANGELOG.md has no "## ${cursorManifest.version}" section`);
  }
}

validateCursorSchema();
validateLockstep();
validatePaths();
const mcp = validateMcpServer();
validateLogo();
validateSkills();
if (mcp) {
  validateReadme(mcp);
}
validateChangelog();

if (errors.length > 0) {
  console.error(errors.map((message) => `ERROR: ${message}`).join("\n"));
  console.error(`\nValidation failed with ${errors.length} error(s).`);
  process.exit(1);
}
console.log("Plugin validated successfully.");
