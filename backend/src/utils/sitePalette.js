import { readFileSync } from 'node:fs';
const defaults = JSON.parse(readFileSync(new URL('../../../shared/sitePalette.json', import.meta.url), 'utf8'));
export function validateSitePalette(value) {
 if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) return 'Bảng màu không đúng định dạng.';
 if (Object.keys(value).some(key => !['version','light','dark'].includes(key))) return 'Bảng màu chứa thuộc tính không được hỗ trợ.';
 for (const theme of ['light','dark']) {
  const colors = value[theme];
  if (!colors || typeof colors !== 'object' || Array.isArray(colors)) return 'Cần đủ bảng màu sáng và tối.';
  if (Object.keys(colors).length !== Object.keys(defaults[theme]).length) return 'Bảng màu bị thiếu hoặc thừa màu.';
  for (const [key,color] of Object.entries(colors)) {
   if (!Object.hasOwn(defaults[theme],key) || typeof color !== 'string' || !/^#[a-f\d]{6}$/i.test(color)) return 'Chỉ nhận các màu HEX sáu chữ số trong bảng màu cho phép.';
  }
 }
 return null;
}
export function publicSitePalette(value) { return validateSitePalette(value) ? defaults : value; }
