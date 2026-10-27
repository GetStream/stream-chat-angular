// typedoc-plugin-markdown splits generic types into multiple code spans with escaped angle brackets (`Promise`\<`void`\>)
// The docs site renders markdown as MDX, so these are merged into a single code span (`Promise<void>`)
const typeGroupStart = /^(`\w+`\\?<|\\<|\\\{)/;

const findEndOfTypeGroup = (line: string, start: number) => {
  let depth = 0;
  let i = start;
  while (i < line.length) {
    if (line.startsWith('=>', i)) {
      i += 2;
      continue;
    }
    if (line.startsWith('\\<', i) || line.startsWith('\\{', i)) {
      depth++;
      i += 2;
      continue;
    }
    if (line[i] === '<' || line[i] === '{') {
      depth++;
    } else if (
      line.startsWith('\\>', i) ||
      line[i] === '>' ||
      line[i] === '}'
    ) {
      depth--;
      const length = line[i] === '\\' ? 2 : 1;
      if (depth === 0) {
        return i + length;
      }
      i += length;
      continue;
    }
    i += line[i] === '\\' ? 2 : 1;
  }
  return -1;
};

const normalizeGenericTypes = (line: string) => {
  const isTableRow = line.trimStart().startsWith('|');
  let result = '';
  let i = 0;
  while (i < line.length) {
    const end = typeGroupStart.test(line.slice(i))
      ? findEndOfTypeGroup(line, i)
      : -1;
    if (end === -1) {
      result += line[i];
      i++;
      continue;
    }
    const type = line
      .slice(i, end)
      .replace(/`/g, '')
      .replace(/\\([<>{}])/g, '$1')
      .replace(/\\\|/g, isTableRow ? '\\|' : '|')
      .replace(/ {2,}/g, ' ');
    result += '`' + type + '`';
    i = end;
  }
  return (
    result
      // Merge intersection types into a single code span
      .replace(/`([^`]+)` & `([^`]+)`/g, '`$1 & $2`')
      .replace(/\\_/g, '_')
  );
};

const docsBaseUrl = '/chat/docs/sdk/angular/v8';

// Links in the source code point to the unversioned docs, generated docs link to the docs version they belong to
const normalizeLinks = (line: string) =>
  line
    .replace(/\]\(\/chat\/docs\/sdk\/angular\/(?!v\d)/g, `](${docsBaseUrl}/`)
    // Heading anchors don't contain $ (for example #querystate$)
    .replace(/(\]\([^)#\s]*#[\w-]+)\$\)/g, '$1)');

export const servicesDocsBaseUrl = `${docsBaseUrl}/services`;

export const normalizeGeneratedDocs = (content: string) =>
  content
    .split('\n')
    // typedoc emits a lone backslash as a line break in some class descriptions
    .filter((line) => line !== '\\')
    .map((line) => normalizeLinks(normalizeGenericTypes(line)))
    .join('\n');
