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
    userId: '${process.env.STREAM_USER_ID}',
    userToken: '${process.env.STREAM_USER_TOKEN}'
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
