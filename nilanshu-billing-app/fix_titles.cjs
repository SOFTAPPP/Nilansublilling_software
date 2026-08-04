const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/ARITRA/Desktop/Nilansublilling_software/nilanshu-billing-app/src';

function walkDir(d) {
  let results = [];
  const list = fs.readdirSync(d);
  list.forEach(function(file) {
    file = path.join(d, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walkDir(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walkDir(dir);
let replacements = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(/title:\s*'([^']+)'/g, (match, title) => {
    if (title === 'Success' || title === 'Delete Confirmation' || title === 'Clear Data' || title === 'Restore Data' || title === 'SMS Sent') {
      return match;
    }
    
    // For anything that sounds like an error, replace with 'Notice'
    return `title: 'Notice'`;
  });
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    replacements++;
    console.log('Updated ' + path.basename(file));
  }
});
console.log('Files updated: ' + replacements);
