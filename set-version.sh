#!/bin/bash

VERSION="export const version = '$1';"

echo -n "" > ./projects/stream-chat-angular/src/assets/version.ts
echo $VERSION > ./projects/stream-chat-angular/src/assets/version.ts
npm run build:prod
