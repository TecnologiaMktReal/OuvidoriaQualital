const fs = require('fs');
const file = './app/OuvidoriaQualital/.env.production';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  /^VITE_SUPABASE_PUBLISHABLE_KEY=.*$/m,
  'VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmZibGV0YXVyZG5jZG1hdW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODAxNTgsImV4cCI6MjA5MTA1NjE1OH0.FH-7zlZabDxN-JB5wQ86z8_DKpxwUwuMLdS6uJlhRFA"'
);
fs.writeFileSync(file, text);
console.log('Key updated successfully.');
