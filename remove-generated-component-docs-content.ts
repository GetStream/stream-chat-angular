const fs = require('fs');

const componentDocsPath = 'docusaurus/docs/Angular/components';
const startOfGeneratedContentMark = '[//]: # "Start of generated content"';
const endOfGeneratedContentMark = '[//]: # "End of generated content"';

const removeGeneratedParts = (fileContent: string, file: string) => {
  const lines: string[] = fileContent.split('\n');
  const startOfGeneratedContentLineNumber = lines.indexOf(
    startOfGeneratedContentMark
  );
  const endOfGeneratedContentLineNumber = lines.indexOf(
    endOfGeneratedContentMark
  );
  if (
    startOfGeneratedContentLineNumber === -1 ||
    endOfGeneratedContentLineNumber === -1
  ) {
    throw new Error(`Generated content markers are missing from ${file}`);
  }
  return lines
    .filter(
      (_: string, lineNr: number) =>
        lineNr <= startOfGeneratedContentLineNumber ||
        lineNr >= endOfGeneratedContentLineNumber
    )
    .join('\n');
};

fs.readdir(componentDocsPath, (err: any, files: string[]) => {
  if (err) {
    throw err;
  }
  files.forEach((file) => {
    fs.readFile(
      `${componentDocsPath}/${file}`,
      'utf8',
      (err: any, content: string) => {
        if (err) {
          throw err;
        }

        if (file !== '_category_.json') {
          const contentWithoutGeneratedParts = removeGeneratedParts(
            content,
            `${componentDocsPath}/${file}`
          );

          fs.writeFile(
            `${componentDocsPath}/${file}`,
            contentWithoutGeneratedParts,
            'utf8',
            (err: any) => {
              if (err) throw err;
            }
          );
        }
      }
    );
  });
});
