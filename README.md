# StreamChatAngular

![tests workflow](https://github.com/GetStream/stream-chat-angular/actions/workflows/tests.yml/badge.svg)

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 12.2.4.

Stream Chat Angular SDK + sample app

## Run sample app

Run `npm install` before first start

Set Stream credentials, see below

Run `npm start` and navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the sample app source files.

## Library development

Set Stream credentials, see below

Run `npm run start:dev` it will start the sample app and watch for changes in the sample app or library source files.

## Stream credentials

Create a file named `.env` in the root directory with the following content:

```
STREAM_API_KEY=<Your API key>
STREAM_USER_ID=<Your user ID>
STREAM_USER_TOKEN=<Your user token>
```

## Environment settings

Use the `set-env` script and `.env` file to set environment config for development

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Lint

Run `npm run lint`

## Build

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `npm run test` to execute the unit tests of the library via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `npm run e2e` to execute the end-to-end tests of the sample app via Cypress.
