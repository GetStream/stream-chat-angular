#!/bin/bash

VERSION=$1
VERSION_VAR="export const version = '$VERSION';"

echo -n "" > ./projects/stream-chat-angular/src/assets/version.ts
echo $VERSION_VAR > ./projects/stream-chat-angular/src/assets/version.ts
sed -i -E "s/\"version\": \".+\"/\"version\": \"${VERSION}\"/" ./projects/stream-chat-angular/package.json
npm run build:prod
