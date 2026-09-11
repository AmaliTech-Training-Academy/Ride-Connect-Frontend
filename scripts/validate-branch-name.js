import { execSync } from 'node:child_process'
import process from 'node:process'

const PATTERN = /^(feat|fix|chore|test)\/.+/
const EXEMPT = ['main', 'develop']

function currentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    console.error(
      'validate-branch-name: could not read the current branch. Is this a git repository?',
    )
    process.exit(1)
  }
}

const branch = currentBranch()

// Detached HEAD (rebase, bisect, CI checkout of a commit) has no branch name to check.
if (branch === 'HEAD') {
  process.exit(0)
}

if (EXEMPT.includes(branch)) {
  process.exit(0)
}

if (!PATTERN.test(branch)) {
  console.error(`
✖ Invalid branch name: "${branch}"

  Branches must start with feat/, fix/, chore/ or test/ followed by a description.

    feat/register-screen
    fix/stale-auth-error
    chore/add-prettier-config

  Rename this branch with:  git branch -m <new-name>
`)
  process.exit(1)
}

process.exit(0)
