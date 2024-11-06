const fs = require('fs');
const writeFile = fs.writeFile;

const targetPathes = [
  'projects/sample-app/src/environments/environment.ts',
  'projects/customizations-example/src/environments/environment.ts',
];

require('dotenv').config();

const devEnvConfig = {
  production: false,
};

const prodEnvConfig = {
  production: true,
};

const envConfig: { [key: string]: any } =
  process.env.ANGULAR_ENV === 'production' ? prodEnvConfig : devEnvConfig;

// `environment.ts` file structure
const envConfigFile = `export const environment = {
    ${Object.keys(envConfig).map((k) => `${k}: ${envConfig[k]},`)}
    apiKey: '${process.env.STREAM_API_KEY}',
    userId1: '${process.env.STREAM_USER_ID1}',
    userToken1: '${process.env.STREAM_USER_TOKEN1}',
    userId2: '${process.env.STREAM_USER_ID2}',
    userToken2: '${process.env.STREAM_USER_TOKEN2}',
  };
  // I am a generated file, do not modify me directly, see set-env script
  `;

targetPathes.forEach((targetPath) => {
  writeFile(targetPath, envConfigFile, (err: any) => {
    if (err) {
      throw err;
    } else {
      console.log(
        `Angular environment.ts file generated correctly at ${targetPath} \n`
      );
    }
  });
});
