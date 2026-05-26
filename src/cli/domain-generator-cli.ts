/**
 * CLI entry: reuses the same Gemini generation and availability logic as the web app.
 * Does not import any Next.js or React code.
 *
 * Usage:
 *   npm run cli "idea for a coffee finder app"
 *   npm run cli   # interactive prompt; loads .env.local / .env if present
 */

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline/promises';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const MIN_AVAILABLE_DOMAINS = 12;
const MAX_GENERATION_ROUNDS = 8;

/** Parse --env-file before other env loading so keys are available. */
function parseEnvFileFlag(argv: string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--env-file' || a === '-e') {
      return argv[i + 1];
    }
    if (a.startsWith('--env-file=')) {
      return a.slice('--env-file='.length);
    }
  }
  return undefined;
}

function loadProjectEnv() {
  const roots = [projectRoot, process.cwd()];
  const names = [
    '.env.local',
    '.env',
    '.env.development.local',
    '.env.development',
    '.env.production.local',
  ];
  const candidates: string[] = [];
  for (const root of roots) {
    for (const name of names) {
      candidates.push(resolve(root, name));
    }
  }

  const tried = new Set<string>();
  for (const p of candidates) {
    const key = resolve(p);
    if (tried.has(key)) continue;
    tried.add(key);
    if (existsSync(p)) {
      loadEnv({ path: p });
    }
  }
}

const extraEnvPath = parseEnvFileFlag(process.argv.slice(2));
if (extraEnvPath) {
  const abs = resolve(process.cwd(), extraEnvPath);
  if (existsSync(abs)) {
    loadEnv({ path: abs });
  } else {
    console.error(`--env-file not found: ${abs}`);
    process.exit(1);
  }
}
loadProjectEnv();

function parseArgs(argv: string[]) {
  let prompt: string | undefined;
  let goal = MIN_AVAILABLE_DOMAINS;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--prompt' || a === '-p') {
      const parts: string[] = [];
      while (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        i++;
        parts.push(argv[i]);
      }
      prompt = parts.join(' ') || undefined;
    } else if (a === '--goal' || a === '--max-check' || a === '-n') {
      goal = Math.max(1, parseInt(argv[++i] || String(MIN_AVAILABLE_DOMAINS), 10) || MIN_AVAILABLE_DOMAINS);
    } else if (a === '--env-file' || a === '-e') {
      i++; // value already applied at startup
    } else if (a.startsWith('--env-file=')) {
      // already applied at startup
    } else if (a === '--help' || a === '-h') {
      console.log(`domain-generator-cli

  "<prompt>"            Project / domain idea (positional, quote multi-word prompts)
  --prompt, -p <text>   Same as passing the prompt as a positional argument
  --goal, -n <n>        Target number of available domains (default: 12)
  --max-check, -n <n>   Alias for --goal
  --env-file, -e <path> Load GEMINI_API_KEY from this file (in addition to .env*)
  --help, -h            This message

Examples:
  npm run cli "habit tracker for remote teams"
  npm run cli -- --goal 6 "coffee finder app"

Loads GEMINI_API_KEY from the environment first, then (if present) these files under the project root and cwd:
  .env.local, .env, .env.development.local, .env.development, .env.production.local

Create credentials (same as Next.js):

  cp .env.example .env.local
  # edit .env.local and set GEMINI_API_KEY=...
`);
      process.exit(0);
    } else if (!a.startsWith('-')) {
      positional.push(a);
    }
  }

  if (!prompt && positional.length > 0) {
    prompt = positional.join(' ');
  }

  return { prompt, goal };
}

async function askPrompt(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const line = (await rl.question('Describe your project or domain idea: ')).trim();
    return line;
  } finally {
    rl.close();
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printHeader(description: string, goal: number) {
  console.log('');
  console.log('Domain Generator CLI');
  console.log('─'.repeat(40));
  console.log(`Prompt : ${description}`);
  console.log(`Target : ${goal} available domains`);
  console.log('─'.repeat(40));
  console.log('');
}

async function main() {
  const { prompt: flagPrompt, goal } = parseArgs(process.argv.slice(2));

  if (!process.env.GEMINI_API_KEY?.trim()) {
    const names = [
      '.env.local',
      '.env',
      '.env.development.local',
      '.env.development',
      '.env.production.local',
    ];
    const paths: string[] = [];
    for (const root of [projectRoot, process.cwd()]) {
      for (const name of names) {
        paths.push(resolve(root, name));
      }
    }
    const unique = [...new Set(paths.map((p) => resolve(p)))];
    console.error('Missing GEMINI_API_KEY.');
    console.error('Fix one of:');
    console.error(`  1) export GEMINI_API_KEY=...   (or prefix the command)`);
    console.error(`  2) cp .env.example .env.local && edit GEMINI_API_KEY`);
    console.error(`  3) npm run cli -- --env-file /path/to/.env`);
    console.error(`Project root: ${projectRoot}`);
    console.error('Env files (found vs missing):');
    for (const p of unique) {
      console.error(`  ${existsSync(p) ? '✓' : '✗'} ${p}`);
    }
    process.exit(1);
  }

  const description =
    flagPrompt && flagPrompt.length > 0 ? flagPrompt : await askPrompt();

  if (!description) {
    console.error('No description provided.');
    process.exit(1);
  }

  process.env.DOMAIN_CHECK_QUIET = '1';
  const { generateDomainSuggestions } = await import('../lib/gemini-domains');
  const { checkDomainAvailability, setAvailabilityCheckQuiet } = await import('../lib/namecheap');
  setAvailabilityCheckQuiet(true);

  printHeader(description, goal);

  const available: string[] = [];
  const alreadyCheckedDomains = new Set<string>();
  let generationRound = 0;

  console.log('Finding available domains…\n');

  while (available.length < goal && generationRound < MAX_GENERATION_ROUNDS) {
    generationRound++;

    if (generationRound > 1) {
      console.log(`Generating more suggestions (${available.length}/${goal} found)…\n`);
    }

    const roundOptions = {
      attempt: generationRound,
      previousDomains: Array.from(alreadyCheckedDomains),
      quiet: true,
    };

    const domains = await generateDomainSuggestions(description, roundOptions, generationRound);

    if (domains.length === 0) {
      if (generationRound >= MAX_GENERATION_ROUNDS) break;
      continue;
    }

    for (const domain of domains) {
      if (available.length >= goal) break;

      const key = domain.toLowerCase();
      if (alreadyCheckedDomains.has(key)) continue;
      alreadyCheckedDomains.add(key);

      try {
        const result = await checkDomainAvailability(domain);
        if (result.available) {
          available.push(domain);
          const source =
            'source' in result && result.source ? ` (${String(result.source)})` : '';
          console.log(`  ✓ ${domain}${source}`.padEnd(44) + `${available.length}/${goal}`);
        }
      } catch {
        // Skip failed checks silently, same as frontend
      }

      await sleep(100);
    }
  }

  console.log('');
  console.log('─'.repeat(40));

  if (available.length === 0) {
    console.log('No available domains found. Try a different prompt.');
  } else if (available.length < goal) {
    console.log(`Found ${available.length}/${goal} available domains:\n`);
    available.forEach((domain, index) => {
      console.log(`  ${String(index + 1).padStart(2, ' ')}. ${domain}`);
    });
    console.log('\nTry a different prompt to find more.');
  } else {
    console.log(`${available.length} available domains:\n`);
    available.forEach((domain, index) => {
      console.log(`  ${String(index + 1).padStart(2, ' ')}. ${domain}`);
    });
  }

  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
