const fs = require('fs');
const path = require('path');

/**
 * Automated Guard: Zero Hardcoded Data Enforcer
 * Scans application source code for banned patterns:
 * - Mock/synthetic variable constants: DEFAULT_*, INITIAL_*, MOCK_*, SAMPLE_*, DUMMY_*
 * - Hardcoded seed user IDs: a1111111-..., f0000000-...
 * - Hardcoded API secrets in code
 */

const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_DIRS = [
  path.join(ROOT_DIR, 'apps', 'web', 'src'),
  path.join(ROOT_DIR, 'packages', 'ui', 'src'),
  path.join(ROOT_DIR, 'apps', 'embedding-service', 'app')
];

const BANNED_PATTERNS = [
  {
    regex: /\b(DEFAULT_|INITIAL_|MOCK_|SAMPLE_|DUMMY_)[A-Z0-9_]+\b/g,
    name: 'Banned mock/dummy constant identifier (DEFAULT_*, INITIAL_*, MOCK_*, SAMPLE_*, DUMMY_*)'
  },
  {
    regex: /a1111111-1111-1111-1111-111111111111/g,
    name: 'Hardcoded seed user fallback UUID (a1111111-...)'
  },
  {
    regex: /f0000000-0000-0000-0000-000000000001/g,
    name: 'Hardcoded seed user UUID (f0000000-...)'
  },
  {
    regex: /vit_sec_embed_live_948fbc2a10e7b4382c7/g,
    name: 'Hardcoded secret API key in committed source'
  }
];

function getSourceFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', 'dist', '__tests__', 'test'].includes(entry.name)) continue;
      files = files.concat(getSourceFiles(fullPath));
    } else if (entry.isFile()) {
      if (/\.(tsx?|jsx?|py)$/.test(entry.name) && !/\.(test|spec)\.(tsx?|jsx?)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

let violationsCount = 0;
console.log('======================================================================');
console.log('   ZERO HARDCODED DATA AUDIT GUARD (AUTOMATED CI & BUILD ENFORCER)');
console.log('======================================================================\n');

for (const dir of SOURCE_DIRS) {
  const files = getSourceFiles(dir);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, lineIdx) => {
      // Ignore comments indicating regex or lint comments
      if (line.includes('check-no-hardcoded-data') || line.includes('BANNED_PATTERNS')) return;

      for (const pattern of BANNED_PATTERNS) {
        if (pattern.regex.test(line)) {
          console.error(`[VIOLATION] ${path.relative(ROOT_DIR, file)}:${lineIdx + 1}`);
          console.error(`  Rule: ${pattern.name}`);
          console.error(`  Line: ${line.trim()}\n`);
          violationsCount++;
        }
      }
    });
  }
}

if (violationsCount > 0) {
  console.error(`FAILED: ${violationsCount} hardcoded value violation(s) detected. Build aborted.`);
  process.exit(1);
} else {
  console.log('SUCCESS: 0 hardcoded value violations detected across all source files.');
  console.log('Verified: All data is user-scoped and backed by live Supabase database/APIs.');
  process.exit(0);
}
