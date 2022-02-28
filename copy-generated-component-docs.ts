const fs = require('fs');

const generatedDocsPath = 'temp-component-docs/classes';
const componentDocsPath = 'docusaurus/docs/Angular/components';
const startOfGeneratedContentMark = '[//]: # "Start of generated content"';
const endOfGeneratedContentMark = '[//]: # "End of generated content"';

const extractProperties = (content: string) => {
  const lines: string[] = content.split('\n');
  const startOfPropertiesMark = '## Properties';
  const endOfPropertiesMark = '## '; // End of properties: next heading
  const startOfPropertiesLineNumber = lines.indexOf(startOfPropertiesMark);
  const endOfPropertiesLineNumber = lines.findIndex(
    (line, index) =>
      line.startsWith(endOfPropertiesMark) &&
      index > startOfPropertiesLineNumber
  );

  if (startOfPropertiesLineNumber === -1) {
    return [];
  }

  return lines.filter(
    (_, lineNumber) =>
      lineNumber > startOfPropertiesLineNumber &&
      (endOfPropertiesLineNumber === -1 ||
        lineNumber < endOfPropertiesLineNumber)
  );
};

const insertGeneratedParts = (
  fileContent: string,
  generatedContent: string[]
) => {
  const lines: string[] = fileContent.split('\n');
  const startOfGeneratedContentLineNumber = lines.indexOf(
    startOfGeneratedContentMark
  );
  const result = [
    ...lines.splice(0, startOfGeneratedContentLineNumber + 1),
    generatedContent.length ? '## Inputs and outputs \n' : '\n',
    ...generatedContent,
    ...lines.splice(0),
  ];

  return result.join('\n');
};

fs.readdir(generatedDocsPath, (err: any, files: string[]) => {
  if (err) {
    throw err;
  }
  files.forEach((file) => {
    fs.readFile(
      `${generatedDocsPath}/${file}`,
      'utf8',
      (err: any, generatedFileContent: string) => {
        if (err) {
          throw err;
        }

        const propertiesContent = extractProperties(generatedFileContent);

        fs.readFile(
          `${componentDocsPath}/${file}x`,
          'utf8',
          (err: any, docFile: any) => {
            if (err)
              throw new Error(
                `${componentDocsPath}/${file}x couldn't be opened, error: ${err}, make sure that this file exists`
              );

            if (file !== '_category_.json') {
              const result = insertGeneratedParts(docFile, propertiesContent);

              fs.writeFile(
                `${componentDocsPath}/${file}x`,
                result,
                'utf8',
                (err: any) => {
                  if (err) throw err;
                }
              );
            }
          }
        );
      }
    );
  });
});
