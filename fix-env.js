const fs = require('fs');
const { spawnSync } = require('child_process');

const env = fs.readFileSync('.env', 'utf8');
const lines = env.split(/\r?\n/);

for (const line of lines) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) {
    const key = match[1];
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    
    console.log(`Fixing ${key}...`);
    
    spawnSync('vercel', ['env', 'rm', key, 'production', '-y'], { shell: true });
    
    const result = spawnSync('vercel', ['env', 'add', key, 'production'], { 
      input: value,
      shell: true 
    });
    
    if (result.status === 0) {
      console.log(`Successfully added ${key}`);
    } else {
      console.error(`Failed to add ${key}: ${result.stderr}`);
    }
  }
}
console.log('Done fixing envs.');
