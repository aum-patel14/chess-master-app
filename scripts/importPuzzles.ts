import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { Readable } from 'stream';

// Load environment variables from .env manually to avoid extra dependencies
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.warn('.env file not found in root directory.');
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Supabase URL or Service Role Key is missing!');
  console.error('Please define VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const LICHESS_PUZZLE_URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst';
const BATCH_SIZE = 500;
const TARGET_IMPORT_COUNT = 500000;

async function main() {
  console.log('Starting Lichess Puzzle Import Script...');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Source URL: ${LICHESS_PUZZLE_URL}`);
  console.log(`Target import limit: ${TARGET_IMPORT_COUNT} puzzles`);

  // Try to reload the system Path environment variable on Windows to ensure zstd is found
  if (process.platform === 'win32') {
    try {
      const execSync = require('child_process').execSync;
      const sysPath = execSync('[System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")', { shell: 'powershell.exe', encoding: 'utf8' });
      if (sysPath) {
        process.env.PATH = sysPath.trim();
      }
    } catch (e) {
      // Fallback
    }
  }

  // Fetch the compressed puzzle database stream
  console.log('Downloading Lichess puzzle database...');
  const response = await fetch(LICHESS_PUZZLE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Lichess database: ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error('Response body is null.');
  }

  console.log('Decompressing database using native zstd process...');
  // Spawn zstd to decompress stream to stdout
  const zstd = spawn('zstd', ['-d', '-c']);

  zstd.on('error', (err) => {
    console.error('ERROR: Failed to spawn zstd process. Make sure it is installed and available on your PATH.', err);
    process.exit(1);
  });

  zstd.stderr.on('data', (data) => {
    // zstd progress logs are written to stderr, optionally print them
    // console.log(`[zstd]: ${data.toString().trim()}`);
  });

  // Convert Web ReadableStream to Node ReadableStream and pipe to zstd stdin
  const nodeDownloadStream = Readable.fromWeb(response.body as any);
  nodeDownloadStream.pipe(zstd.stdin);

  const rl = readline.createInterface({
    input: zstd.stdout,
    crlfDelay: Infinity
  });

  let processedCount = 0;
  let importedCount = 0;
  let batch: any[] = [];
  let isHeader = true;

  console.log('Reading database stream line-by-line...');

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue; // Skip the CSV header line
    }

    processedCount++;
    
    // Parse Lichess CSV line (split by comma)
    const columns = line.split(',');
    if (columns.length < 8) continue;

    const rating = parseInt(columns[3], 10);
    const deviation = parseInt(columns[4], 10);
    const popularity = parseInt(columns[5], 10);
    const nbPlays = parseInt(columns[6], 10);

    // Apply filtering: Rating 600-2800, Popularity > 50, NbPlays > 100
    if (rating >= 600 && rating <= 2800 && popularity > 50 && nbPlays > 100) {
      const themes = columns[7] ? columns[7].trim().split(' ') : [];
      const puzzle = {
        id: columns[0].trim(),
        fen: columns[1].trim(),
        moves: columns[2].trim(),
        rating,
        rating_deviation: isNaN(deviation) ? null : deviation,
        popularity: isNaN(popularity) ? null : popularity,
        nb_plays: isNaN(nbPlays) ? null : nbPlays,
        themes,
        game_url: columns[8] ? columns[8].trim() : null,
        opening_tags: columns[9] ? columns[9].trim() : null
      };

      batch.push(puzzle);
      importedCount++;

      // Batch insert into Supabase
      if (batch.length === BATCH_SIZE) {
        await insertBatch(batch);
        batch = [];
      }

      // Progress logging every 10,000 rows
      if (importedCount % 10000 === 0) {
        console.log(`Progress: Imported ${importedCount} puzzles (Processed ${processedCount} rows total)`);
      }

      // Exit early if target import limit reached
      if (importedCount >= TARGET_IMPORT_COUNT) {
        console.log(`Reached target import limit of ${TARGET_IMPORT_COUNT} puzzles.`);
        break;
      }
    }
  }

  // Insert any remaining puzzles in the last batch
  if (batch.length > 0 && importedCount < TARGET_IMPORT_COUNT) {
    await insertBatch(batch);
  }

  console.log('Import completed successfully!');
  console.log(`Total rows processed: ${processedCount}`);
  console.log(`Total puzzles imported: ${importedCount}`);
  process.exit(0);
}

async function insertBatch(items: any[]) {
  let retries = 3;
  while (retries > 0) {
    try {
      const { error } = await supabase.from('puzzles').insert(items);
      if (error) throw error;
      return;
    } catch (e: any) {
      console.error(`Supabase batch insert error: ${e.message}. Retrying in 2 seconds...`);
      retries--;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.error('Failed to insert batch after 3 attempts.');
}

main().catch(err => {
  console.error('Fatal error during import execution:', err);
  process.exit(1);
});
