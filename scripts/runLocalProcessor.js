require('dotenv').config();
const LocalDataProcessor = require('../utils/localDataProcessor');

async function main() {
  const processor = new LocalDataProcessor();
  
  try {
    await processor.processSampleFiles();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
