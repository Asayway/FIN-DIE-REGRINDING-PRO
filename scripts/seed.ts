// @ts-nocheck
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Data transformation functions
function parseMaxRegrind(value: string): number {
  if (!value || value.toLowerCase().includes('dispose')) return 0;
  // Extract the maximum number from a string like "12-13 time" or "15 time"
  const match = value.match(/(\d+)(?!.*\d)/); 
  return match ? parseInt(match[0], 10) : 0;
}

function parseQuantity(value: string): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function parseLife(value: string): number | null {
  const parsed = parseFloat(value);
  // Multiply by 1,000,000 as per requirements
  return isNaN(parsed) ? null : parsed * 1000000; 
}

async function main() {
  const results: any[] = [];
  const csvFilePath = path.join(process.cwd(), 'spare_parts.csv');

  if (!fs.existsSync(csvFilePath)) {
    console.error(`Error: Could not find ${csvFilePath}`);
    console.log('Please place your exported CSV file in the root directory named "spare_parts.csv"');
    process.exit(1);
  }

  console.log('Reading and transforming data...');

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (data) => {
      // 1. Install Quantity (E1, E2, E3, etc.) -> JSON object
      const installQuantity = {
        E1: parseQuantity(data['E1']),
        E2: parseQuantity(data['E2']),
        E3_1: parseQuantity(data['E3 (1)']),
        E3_2: parseQuantity(data['E3 (2)']),
        E3_3: parseQuantity(data['E3 (3)']),
        E4: parseQuantity(data['E4']),
        E5: parseQuantity(data['E5']),
        E6: parseQuantity(data['E6'])
      };

      // Ensure we have a valid part name before processing
      if (!data['Part Name']) return;

      results.push({
        part_code_name: data['Part Name'].trim(),
        stage_function: data['Stage/Function'] ? data['Stage/Function'].trim() : null,
        install_quantity: JSON.stringify(installQuantity),
        pcm_life_shots: parseLife(data['PCM']),
        gold_life_shots: parseLife(data['Gold']),
        bare_life_shots: parseLife(data['Bare']),
        max_regrind: parseMaxRegrind(data['Number of time'])
      });
    })
    .on('end', async () => {
      console.log(`Successfully parsed ${results.length} rows. Starting database insertion...`);
      
      let insertedCount = 0;
      for (const row of results) {
        try {
          await prisma.sparePartMaster.create({
            data: row
          });
          insertedCount++;
        } catch (err) {
          console.error(`Failed to insert ${row.part_code_name}:`, err);
        }
      }
      
      console.log(`\nSeed completed! Inserted ${insertedCount} records into the database.`);
      await prisma.$disconnect();
    });
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
