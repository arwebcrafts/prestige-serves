require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_P8aH3JElyXBw@ep-gentle-frog-a4yzwn3w-pooler.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
const sql = neon(DATABASE_URL);

console.log('Testing SQL update...');

// First check what's in the DB
sql`SELECT email, email_sent, created_at FROM service_requests ORDER BY created_at DESC LIMIT 3`
  .then(r => {
    console.log('Current records:');
    r.forEach(row => console.log(' -', row.email, 'email_sent:', row.email_sent));
    
    // Try updating one record
    return sql`UPDATE service_requests SET email_sent = 1 WHERE email_sent = -1 ORDER BY created_at DESC LIMIT 1 RETURNING email, email_sent`;
  })
  .then(r => {
    console.log('Update result:', r);
    process.exit(0);
  })
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
