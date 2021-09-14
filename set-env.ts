const fs = require('fs');
const writeFile = fs.writeFile;

const targetPath = 'projects/sample-app/src/environments/environment.ts';

require('dotenv').config();

// `environment.ts` file structure
const envConfigFile = `export const environment = {
  production: false,
  apiKey: '${process.env.API_KEY}',
  userId: '${process.env.USER_ID}',
  userToken: '${process.env.USER_TOKEN}'
};
`;

writeFile(targetPath, envConfigFile, (err: any) => {
  if (err) {
    throw console.error(err);
  } else {
    console.log(
      `Angular environment.ts file generated correctly at ${targetPath} \n`
    );
  }
});
