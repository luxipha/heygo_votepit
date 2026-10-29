# heyGo Voice

HeyGo’s community feedback and roadmap service, adapted from [Votepit Community Edition](https://github.com/silvio-l/Votepit).

Riders and drivers can share ideas, vote on suggestions and follow product updates.

**Public service:** [ideas.heygo.ng](https://ideas.heygo.ng/)

**HeyGo:** [heygo.ng](https://heygo.ng/)

## What this repository contains

- HeyGo-branded community board and roadmap pages.
- Responsive React interface with English as the default language.
- Idea submissions, voting, comments and moderation inherited from Votepit.
- Email magic-link authentication.
- Server-rendered page metadata, canonical URLs and social sharing previews.
- PHP API, database migrations and shared-host release tooling.

This is the feedback service. The HeyGo landing website, Rider and Driver apps, and ride-hailing backend are maintained separately.

## Technology

React 19, TypeScript and Vite power the frontend. The backend uses PHP 8.2+, Slim and MySQL/MariaDB. JavaScript packages are managed with pnpm; PHP dependencies use Composer.

## Repository structure

| Directory | Purpose |
| --- | --- |
| `app/` | React application and HeyGo branding |
| `packages/ui/` | Shared interface components |
| `src/` | PHP application and API |
| `public/` | PHP web entry point and public assets |
| `config/` | Configuration templates; real configuration stays private |
| `migrations/` | Database migrations |
| `tests/` | PHP tests |
| `bin/` | Development and release commands |
| `documentation/` | Setup, configuration and API documentation |

## Local development

Install PHP 8.2+ with the extensions listed in `composer.json`, Composer, Node.js compatible with Vite 8, pnpm and MySQL/MariaDB.

```sh
composer install
pnpm install --frozen-lockfile
cp config/config.example.php config/config.php
```

Configure a local database and application URL in `config/config.php`. Follow the [installation guide](documentation/installation.md) for database initialization and the [configuration documentation](documentation/configuration.md) for application and mail settings. Use local credentials rather than production credentials.

Start the PHP development server:

```sh
php -S 127.0.0.1:8095 -t public bin/dev-router.php
```

In another terminal, start the frontend:

```sh
VOTEPIT_DEV_API_URL=http://127.0.0.1:8095 pnpm -C app exec vite --host 127.0.0.1 --port 5173
```

Open the Vite URL and use the board configured in your local database. Email sign-in requires a working mail configuration.

## Validation

```sh
pnpm -C app build
pnpm -C app test
composer test
```

The project also provides linting and PHP analysis commands in `package.json` and `composer.json`.

## Deployment

The service supports PHP/MySQL shared hosting. Build releases with:

```sh
bash bin/build-release.sh
```

Only the intended public entry point and compiled assets belong in the web document root. Keep application configuration, credentials, database backups, logs and release archives private. Configure the application cron and mail transport for the target environment. Consult the [installation guide](documentation/installation.md) before deploying.

Production access details and environment-specific deployment records are deliberately excluded from this repository.

## Upstream and licence

This repository contains HeyGo customizations of Votepit Community Edition. Original source: [silvio-l/Votepit](https://github.com/silvio-l/Votepit). Original copyright and MIT licence notices are retained in [LICENSE](LICENSE).

`origin` is the HeyGo repository; `upstream` is the original Votepit repository. Existing Votepit package names and PHP namespaces are retained for compatibility.
