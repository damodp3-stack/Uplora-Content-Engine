# Command Execution Permissions Rule

Scope: Workspace `Content Creation Engine`

## Auto-Approved Development Commands:
- `npm` / `npx` / `pnpm` / `yarn` commands
- `turbo build`, `turbo test`, `turbo lint`, `turbo typecheck`
- `jest` / project unit tests / integration tests
- `node` / `ts-node` scripts and execution
- Read-only Git commands: `git status`, `git diff`, `git log`, `git branch`, `git remote -v`
- Read-only Docker commands: `docker info`, `docker ps`, `docker compose config`
- Read-only filesystem inspection and local development servers

## Commands Requiring User Approval:
- `git commit`, `git push`, `git reset --hard`, `git clean`
- File/directory deletion or modifying `.env` / secrets
- Docker container/image deletion
- Database `DROP` / `TRUNCATE` / destructive migrations
- Installing global software or changing system settings
- Production deployments or external paid API operations
