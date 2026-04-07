import fs from 'fs';

function extractText(xmlPath) {
  if (!fs.existsSync(xmlPath)) return "File not found: " + xmlPath;
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const regex = /<w:t[^>]*>(.*?)<\/w:t>/g;
  let match;
  let textArr = [];
  while ((match = regex.exec(xml)) !== null) {
    textArr.push(match[1]);
  }
  return textArr.join(' ');
}

// Extract first file (Normal)
console.log("EXTRACTING NORMAL:");
console.log(extractText('word/document.xml'));


