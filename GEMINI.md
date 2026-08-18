# Workspace Command Execution Rules & Security Permissions

For this workspace (`Content Creation Engine`), the following command execution permissions, autonomous workflow directives, and approval requirements are strictly enforced.

## Autonomous Execution Directive

The agent must execute routine development, testing, inspection, building, debugging, and verification tasks autonomously without asking for user confirmation between standard steps.

---

## 1. Auto-Approved Commands (No User Confirmation Prompt Needed)

The agent is authorized and expected to run the following command patterns autonomously:

### Package Managers & Development Execution:
- `npm *` (e.g., `npm test`, `npm run build`, `npm run dev`, `npm run start:dev`)
- `npx *` (e.g., `npx turbo`, `npx jest`, `npx ts-node`)
- `pnpm *` / `yarn *`
- `node *`
- `npx ts-node *`
- `npm --prefix apps/api *`
- `npm --prefix apps/web *`

### Testing, QA & Build Verification:
- `jest *`
- `npm test` / `npm run test`
- `npm run lint` / `npm run typecheck`
- `turbo *` / `npx turbo *`
- Workspace build commands (`npm run build`, `turbo build`)
- Workspace lint & typecheck commands
- Acceptance tests & integration test runners
- Existing & new project verification scripts (`real-*.ts` / `real-*.js`)

### Read-Only Git Operations:
- `git status`
- `git diff`
- `git log`
- `git branch`
- `git remote -v`
- `git show`
- `git ls-files`

### Read-Only Docker Operations:
- `docker info`
- `docker ps`
- `docker images`
- `docker compose config`
- `docker version`

### Read-Only System & Media Inspection:
- `dir` / `ls` / `Get-ChildItem` / `Test-Path` / `Get-Command` / `where.exe`
- `ffmpeg -version` / `ffprobe -version`
- Local `ffmpeg.exe` / `ffprobe.exe` file execution
- `python --version` / `node --version` / `npm --version`
- Media file probe / frame analysis commands (`ffprobe *`)

### Local Development & Verification Servers:
- `npm run dev`
- `npm run start:dev`
- Local verification servers & background test execution

### Verification Scripts:
- `real-*.ts`
- `phase*-acceptance.spec.ts`
- Provider verification scripts
- Integration & smoke test scripts

---

## 2. Autonomous Autonomous Development & Error Recovery Workflow

### Autonomous Phase Execution Policy:
When executing feature phases (such as Phase 6 Voice/TTS), the agent shall autonomously:
1. Inspect the codebase and existing providers/modules.
2. Implement approved architecture, interfaces, and providers.
3. Run unit tests (`npm test`, `jest`).
4. Run integration and acceptance tests (`phase*-acceptance.spec.ts`).
5. Execute real hardware/service verification scripts (`real-*.ts`).
6. Run full workspace build (`npm run build`, `turbo build`).
7. Inspect generated media files using `ffprobe` / media inspection tools.
8. Identify and analyze test/build failures cleanly.
9. Automatically repair source code or configuration errors responsible for failures.
10. Rerun failed tests and verification scripts autonomously.
11. Continue iterating until all acceptance criteria and test suites pass.

**DO NOT** ask for confirmation between these individual iteration steps.

### Automatic Error Recovery Rule:
If a standard build, test, lint, or verification command fails:
- Immediately inspect the failure traceback or error logs.
- Identify the root cause in the source code, type declarations, or configuration.
- Edit the necessary code or config to fix the issue.
- Re-run the verification command without requesting user confirmation.

---

## 3. Required Approval Commands (Always Request Confirmation First)

The agent **MUST** explicitly request user approval before initiating any of the following restricted or high-risk actions:

1. `git commit`
2. `git push`
3. `git reset --hard`
4. `git clean`
5. Deleting project source files or important workspace files
6. Deleting directories or folder trees recursively (`rm -rf`, `Remove-Item -Recurse`, `del /s`)
7. Modifying `.env` files or secret environment configurations
8. Modifying API keys, tokens, or credential files
9. Exposing secret credentials in logs or output
10. Installing global software packages (`npm install -g`, `choco`, `winget`, `pip install`)
11. Modifying OS or Windows system settings
12. Destructive database operations (`DROP`, `TRUNCATE`, destructive migrations)
13. Production deployments or external service provisioning
14. External paid API operations that incur direct charges
15. Purchasing credits or subscriptions
16. Destructive Docker cleanup (`docker rm`, `docker rmi`, `docker system prune`)
17. Any operation that can permanently destroy or alter user data

---

## 4. Security Directives & Secret Handling

- Security protections must **NEVER** be weakened to bypass an approval prompt.
- The agent must **NEVER** print, output, or expose secret values in command logs or chat responses, including:
  - `GEMINI_API_KEY`
  - API tokens & OAuth credentials
  - Passwords & private keys
  - Secret values & raw `.env` contents
- When an operation genuinely requires manual user approval:
  - Stop strictly before executing that specific operation.
  - Clearly state: (1) exact command/action, (2) why approval is required, and (3) whether it can incur cost or risk data loss/mutation.

