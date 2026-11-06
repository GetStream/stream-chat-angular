---
name: run-e2e
description: Run the manual end-to-end test plan for the stream-chat-angular sample app (SDK features, WS events, performance vs master) using the internal "Angular testing" doc. Use when asked to run e2e tests, QA the sample app, test the stream-chat v10 migration, or work through the Angular testing doc.
---

# run-e2e

The test plan lives in the **Angular testing** doc:
https://claude.ai/artifact/AJ7avSbHUizPhMpBfSSsrF

**Internal to Stream.** The doc is a private Claude Docs artifact for Stream employees. Do not copy its contents into public places (GitHub issues, PRs, public docs, this repo).

**The doc contains the Stream credentials needed to run the tests.** These are the test app's API key, its token endpoint and the **API secret**. Read them from the doc's Setup tab when you need them. Never commit them, paste them into the sample app's `.env` (it is compiled into the browser bundle), or echo the secret in chat or logs.

## What the doc contains

Read it through the Claude Docs connector (`read` with the project id from the link), not with a web fetch. It has four tabs:

| Tab             | Contents                                                                                                                                                                                                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup           | `.env` for the sample app: dynamic users via `?user_id=`, a token URL with a `user_id` placeholder, and a members channel filter. It also has the node SDK client with the API secret, the test users `angular-test-alice`/`bob`/`carol`, the scratch channel `messaging:angular-test-scratch` and the performance channel `messaging:sample-app-channel-10`. |
| 1. SDK features | Test cases per feature area. Each case has UI steps, the expected UI result, a backend check with `@stream-io/node-sdk` and a Result dropdown. Some areas include test-only harness snippets for the sample app (drafts, log out / log in); never commit those.                                                                                               |
| 2. WS events    | Events the Angular SDK handles itself (section A) and events it reads through stream-chat state (section B). Each case has a trigger (node SDK or a second user), the expected reaction and a backend check. There is also a list of excluded events.                                                                                                         |
| 3. Performance  | Scrolling the performance channel through its latest 1,000 messages on this branch vs master. It covers production builds, a master worktree, a repeatable console scroll script, a Chrome DevTools recording procedure and results tables.                                                                                                                   |

## How to run

1. Read the doc first (Setup tab, then the tab for the step being run). It is the source of truth; the summary above may be out of date.
2. Set up the sample app as the Setup tab describes (`npm run config:dev`, build the lib, `npm start`). Open `localhost:4200/?user_id=angular-test-alice`.
3. For backend checks and triggers, use `@stream-io/node-sdk` server-side with the key and secret from the doc. For example, run a script with Node from a project that has the SDK installed (`~/Stream/stream-node-client-reporduction`).
4. Run destructive cases (truncate, hide, delete, freeze, ban, user delete) only on the scratch channel or throwaway users, as each case says. Never run them on `sample-app-channel-*` or the performance channel.
5. Report outcomes to the user in chat (Pass / Fail / Blocked per case, with what happened for failures and blocks). **Do not post results to the doc:** don't set the Result dropdowns, fill in the performance results tables, or add comments. The doc is a shared test plan template and must stay clean.
6. Revert any test-only changes afterwards: harness snippets, `&exp=60` on the token URL, `openMessageListAt` and channel-type permission changes.
