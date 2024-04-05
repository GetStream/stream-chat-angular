const fs = require('fs');

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

      // Remove the thre prefix from the title
      const result = data.replace(/# Class:/g, '#').replace('<T\\>', '');

      fs.writeFile(`${sourcePath}/${file}`, result, 'utf8', (err: any) => {
        if (err) {
          throw err;
        }
        fs.copyFile(
          `${sourcePath}/${file}`,
          `${serviceDocsTargetPath}/${file}x`,
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
