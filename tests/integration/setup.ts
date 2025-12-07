import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Validate required test environment variables
const requiredVars = [
  'BABTEC_ENDPOINT_URL',
  'BABTEC_USERNAME',
  'BABTEC_PASSWORD',
];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.warn(
      `Warning: ${varName} not set. Integration tests may fail.`
    );
  }
}

