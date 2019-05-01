#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const SVGO = require('svgo');
const del = require('del');
const walkSync = require('walk-sync');

let icons = walkSync('src', { globs: ['**/*.svg'] });
let css = walkSync('src', { globs: ['**/*.css'] });
let svgo = new SVGO({
  plugins: [
    {
      removeViewBox: false,
    },
    {
      removeDimensions: true,
    },
  ],
});
let svgs = [];

let readIcon = async filePath => {
  let icon = await fs.readFile(path.join(process.cwd(), 'src', filePath));
  return icon;
};

let cleanDist = async () => {
  await del('dist/**');
  await fs.mkdir('dist');
};

let writeFileToDist = async (filePath, fileData) => {
  let data = fileData || (await readIcon(filePath));
  await fs.writeFile(path.join(process.cwd(), 'dist', filePath), data);
};

let processSVG = async svgFile => {
  let inputData = await readIcon(svgFile);
  console.log(`${svgFile}: optimizing SVG file`);
  let output = await svgo.optimize(inputData);
  console.log(`${svgFile}: writing optimized SVG to dist`);
  // keep the string to write an HTML file with embbeded SVGs
  svgs.push({name: svgFile, svg: output.data});
  await writeFileToDist(svgFile, output.data);
};

let emojiMeter = (emoji, len) => {
  return new Array(len).fill(emoji).join('');
};


let writeJS = async () => {
  let list= icons.map(path => {
    // we want the filename w/o the extension
    return path.replace(/\.svg$/, '');
  });

  console.log(`writing index.js with ${icons.length} SVG filenames`);
  await writeFileToDist('index.js', `export default ${JSON.stringify(list, null, 2)};`);
};

let writeHTML = async () => {
  let svgsString = svgs.map(icon => {
    return `<figure>${icon.svg}<figcaption>${icon.name}</figcaption></figure>`;
  }).join('');

  let doc = `
  <!DOCTYPE html>
  <style>
    body { display: flex; flex-direction: row; flex-wrap: wrap; }
    figure { flex: 1; }
    figure svg { height: 24px; width: 24px; }
  </style>
  ${svgsString}
  `;
  console.log('writing preview HTML to index.html');
  await writeFileToDist('index.html', doc);
  svgs = [];
};

async function main() {
  await cleanDist();
  await Promise.all([...css.map(writeFileToDist), ...icons.map(processSVG)]);
  await writeHTML();
  await writeJS();
  console.log(`
    🚀 All finished! 
    Copied ${css.length} CSS files: ${emojiMeter('✨', css.length)}
    Processed ${icons.length} SVG files: ${emojiMeter('💅', icons.length)}
    Preview them by opening the dist/index.html file.
    `);
}

main();
