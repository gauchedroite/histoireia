import fs from 'fs';
import path from 'path';

const dir = './dist';

fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.js')) {
    const oldPath = path.join(dir, file);
    const newPath = path.join(dir, file.replace('.js', '.cjs'));
    fs.renameSync(oldPath, newPath);
  }
});

console.log('Renamed .js files to .cjs');
