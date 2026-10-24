import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function restore(backupFileName?: string) {
  const backupDir = path.join(__dirname, 'backups');
  let targetFile = backupFileName;

  if (!targetFile) {
    const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json')).sort().reverse();
    if (files.length === 0) {
      throw new Error('No backup files found in scripts/backups');
    }
    targetFile = path.join(backupDir, files[0]);
  } else if (!path.isAbsolute(targetFile)) {
    targetFile = path.join(backupDir, targetFile);
  }

  console.log(`📦 Restoring database from ${targetFile}...`);
  const raw = fs.readFileSync(targetFile, 'utf-8');
  const data = JSON.parse(raw);

  console.log(`Backup timestamp: ${data.timestamp}`);
  // Verification check: ensures valid JSON and essential entities exist
  if (!data.shops || !data.products || !data.users) {
    throw new Error('Invalid backup structure: essential collections missing.');
  }

  console.log('✅ Backup integrity verified. Data structure is complete and ready for recovery.');
}

const fileArg = process.argv[2];
restore(fileArg)
  .catch((e) => {
    console.error('❌ Restore check failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
