// Generated CSS is a fallback for first visits; edit shared/sitePalette.json.
const fs = require('node:fs');
const path = require('node:path');
const palette = require('../../shared/sitePalette.json');
const css = ['/* Generated from shared/sitePalette.json. Do not edit. */', ...['light', 'dark'].map(theme => `${theme === 'light' ? ':root' : 'html.dark-theme'} {\n${Object.entries(palette[theme]).map(([key,value]) => `  ${key}: ${value};`).join('\n')}\n}`)].join('\n');
fs.writeFileSync(path.resolve(__dirname, '../src/styles/palette-defaults.css'), css + '\n');
