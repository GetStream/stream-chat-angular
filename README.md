# Official Angular SDK for [Stream Chat](https://getstream.io/chat/sdk/react/)

> The official Angular components for Stream Chat, a service for building chat applications.

![tests and release workflow](https://github.com/GetStream/stream-chat-angular/actions/workflows/workflow.yml/badge.svg)

<img align="right" src="https://getstream.imgix.net/images/chat/chattutorialart@3x.png?auto=format,enhance" width="50%" />

**Quick Links**

- [Register](https://getstream.io/chat/trial/) to get an API key for Stream Chat
- [Angular Chat Tutorial](https://getstream.io/chat/angular/tutorial/)
- [Demo Apps](https://getstream.io/chat/demos/)
- [Docs](https://getstream.io/chat/docs/sdk/angular/)
- [Chat UI Kit](https://getstream.io/chat/ui-kit/)

With our component library, you can build a variety of chat use cases, including:

- In-game chat like Overwatch or Fortnite
- Team-style chat like Slack
- Messaging-style chat like WhatsApp or Facebook's Messenger
- Customer support chat like Drift or Intercom

## Angular Chat Tutorial

The best way to get started is to follow the [Angular Chat Tutorial](https://getstream.io/chat/angular/tutorial/). It shows you how to use this SDK to build a fully functional chat application and includes common customizations.

## Free for Makers

Stream is free for most side and hobby projects. To qualify, your project/company must have no more than 5 team members and earn less than $10k in monthly revenue.
For complete pricing and details visit our [Chat Pricing Page](https://getstream.io/chat/pricing/).

## Docs

The [docs](https://getstream.io/chat/docs/sdk/angular/) provide a brief description about the components and services in the library.

The Angular library is created using the [stream-chat-js](https://github.com/getstream/stream-chat-js) library. For the most common use cases our services should give a nice abstraction over this library, however you might need it for more advanced customization, the [documentation](https://getstream.io/chat/docs/js/) is on our website.

## Contributing

We welcome code changes that improve this library or fix a problem. Please make sure to follow all best practices and add tests, if applicable, before submitting a pull request on GitHub. We are pleased to merge your code into the official repository if it meets a need. Make sure to sign our [Contributor License Agreement (CLA)](https://docs.google.com/forms/d/e/1FAIpQLScFKsKkAJI7mhCr7K9rEIOpqIDThrWxuvxnwUq2XkHyG154vQ/viewform) first. See our license file for more details.

## We are hiring.

We recently closed a [$38 million Series B funding round](https://techcrunch.com/2021/03/04/stream-raises-38m-as-its-chat-and-activity-feed-apis-power-communications-for-1b-users/) and are actively growing.
Our APIs are used by more than a billion end-users, and by working at Stream, you have the chance to make a huge impact on a team of very strong engineers.

Check out our current openings and apply via [Stream's website](https://getstream.io/team/#jobs).

## Installation

### Install with NPM

Run the following command if you are using **Angular 17**

```shell
npm install stream-chat-angular stream-chat @ngx-translate/core
```

Run the following command if you are using **Angular 16**:

```shell
npm install stream-chat-angular stream-chat @ngx-translate/core
```

Run the following command if you are using **Angular 15**:

```shell
npm install stream-chat-angular stream-chat @ngx-translate/core@14 ngx-popperjs@15
```

Run the following command if you are using **Angular 14**:

```shell
npm install stream-chat-angular stream-chat @ngx-translate/core@14 ngx-popperjs@14
```

Run the following command if you are using **Angular 13**:

```shell
npm install stream-chat-angular stream-chat @ngx-translate/core@14 angular-mentions@1.4.0 ngx-popperjs@13 --legacy-peer-deps
```

Run this command if you are using **Angular 12**:

```shell
npm install stream-chat-angular stream-chat @ngx-translate/core@14 angular-mentions@1.4.0 ngx-popperjs@12 --legacy-peer-deps
```

## Sample App

This repository includes a sample app to test our library.

To test the app:

Create a file named `.env` in the root directory with the following content:

```
STREAM_API_KEY=<Your API key>
STREAM_USER_ID=<Your user ID>
STREAM_USER_TOKEN=<Your user token>
```

The easiest way to generate a token for testing purposes is to use our [token generator](https://getstream.io/chat/docs/react/token_generator/).

Run `npm install` to install dependencies.

Run `npm start` and navigate to `http://localhost:4200/`.

Preferred Node version: v16.

## Customization examples

This repository includes a sample app that showcases how you can provide your own template for different components within the SDK:

To run the app:

Create a file named `.env` in the root directory with the following content:

```
STREAM_API_KEY=<Your API key>
STREAM_USER_ID=<Your user ID>
STREAM_USER_TOKEN=<Your user token>
```

Run `npm install` to install dependencies.

Run `npm run start:customizations-example` and navigate to `http://localhost:4200/`.

Preferred Node version: v16.

## Local development

This repository includes a sample app to test our library.

To test the app:

Create a file named `.env` in the root directory with the following content:

```
STREAM_API_KEY=<Your API key>
STREAM_USER_ID=<Your user ID>
STREAM_USER_TOKEN=<Your user token>
```

Run `npm install` in the root of the project. You can use the `npm run start:dev` command to start the SampleApp with automatic reloading.

A note about the documentation:

- Documentations for Angular services are generated from doc comments in the source files (not under source control)
- Documentations for inputs and outputs of Angular components are generated from doc comments in the source files (not under source control)
- Everything else in the documentation is written in `mdx` files located in the `docusaurus` folder

Preferred Node version: v16.
