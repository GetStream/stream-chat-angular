const fs = require('fs');

const sourcePath = 'temp-docs/classes';
const targetPath = 'docusaurus/docs/Angular/services';

fs.readdir(targetPath, (err: any, files: string[]) => {
  if (err) {
    throw err;
  }
  files.forEach((file) => {
    if (file !== '_category_.json') {
      try {
        fs.unlinkSync(`${targetPath}/${file}`);
      } catch (err: any) {
        throw err;
      }
    }
  });
});

fs.readdir(sourcePath, (err: any, files: string[]) => {
  if (err) {
    throw err;
  }
  files.forEach((file) => {
    fs.readFile(`${sourcePath}/${file}`, 'utf8', (err: any, data: string) => {
      if (err) {
        throw err;
      }
      const result = data.replace(/# Class:/g, '#');

      fs.writeFile(`${sourcePath}/${file}`, result, 'utf8', (err: any) => {
        if (err) {
          throw err;
        }
        fs.copyFile(
          `${sourcePath}/${file}`,
          `${targetPath}/${file}x`,
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
