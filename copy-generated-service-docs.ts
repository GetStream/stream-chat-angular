const fs = require('fs');
const {
  normalizeGeneratedDocs,
  servicesDocsBaseUrl,
} = require('./normalize-generated-docs');

const sourcePath = 'temp-service-docs/classes';
const serviceDocsTargetPath = process.argv[2];

// remove docs from the source folder
fs.readdir(serviceDocsTargetPath, (err: any, files: string[]) => {
  if (err) {
    throw err;
  }
  files.forEach((file) => {
    if (file !== '_category_.json') {
      try {
        fs.unlinkSync(`${serviceDocsTargetPath}/${file}`);
      } catch (err: any) {
        throw err;
      }
    }
  });
});

// copy generated files
fs.readdir(sourcePath, (err: any, files: string[]) => {
  if (err) {
    throw err;
  }
  files.forEach((file) => {
    fs.readFile(`${sourcePath}/${file}`, 'utf8', (err: any, data: string) => {
      if (err) {
        throw err;
      }

      // Title and slug come from the sidebar config, so no frontmatter is added
      const result = normalizeGeneratedDocs(
        data
          .replace(`# Class: ${file.replace('.md', '')}`, '')
          .replace(/\b(?!README)(\w+)\.md\b/g, `${servicesDocsBaseUrl}/$1/`)
          .replace(/•\s/g, '')
          .replace(/▸\s/g, '')
          .replace('<T\\>', '')
      );

      fs.writeFile(`${sourcePath}/${file}`, result, 'utf8', (err: any) => {
        if (err) {
          throw err;
        }
        fs.copyFile(
          `${sourcePath}/${file}`,
          `${serviceDocsTargetPath}/${file}`,
          (err: any) => {
            if (err) {
              throw err;
            }
          }
        );
      });
    });
  });
});
