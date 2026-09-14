import { execSync } from 'node:child_process'
import process from 'node:process'

// Enforces the team convention: <type>/RID-<ticket>-short-description
// e.g. feat/RID-1-login-page
export const ALLOWED_TYPES = [
  'feat',
  'fix',
  'refactor',
  'test',
  'chore',
  'docs',
  'perf',
  'style',
]

// Long-lived branches are named by the workflow, not by a ticket.
export const PROTECTED_BRANCHES = ['develop', 'testing', 'production', 'main']

export const BRANCH_PATTERN = new RegExp(
  `^(${ALLOWED_TYPES.join('|')})\\/RID-\\d+-[a-z0-9]+(-[a-z0-9]+)*$`,
)

/**
 * Returns null when the branch name is acceptable, or a reason why it is not.
 * Exported so the rules can be tested without spawning git.
 */
export function checkBranchName(branch) {
  // Detached HEAD (rebase, bisect, CI checkout of a commit) has no name to check.
  if (!branch || branch === 'HEAD') {
    return null
  }

  if (PROTECTED_BRANCHES.includes(branch)) {
    return null
  }

  if (BRANCH_PATTERN.test(branch)) {
    return null
  }

  const [type] = branch.split('/')

  if (!branch.includes('/')) {
    return `"${branch}" is missing a type prefix`
  }

  if (!ALLOWED_TYPES.includes(type)) {
    return `"${type}" is not an allowed type`
  }

  if (!/\/RID-\d+-/.test(branch)) {
    return `"${branch}" is missing its RID ticket`
  }

  return `"${branch}" must use lowercase words separated by hyphens`
}

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

function main() {
  const branch = currentBranch()
  const problem = checkBranchName(branch)

  if (!problem) {
    process.exit(0)
  }

  console.error(`
✖ Invalid branch name: ${problem}

  Branches must be named  <type>/RID-<ticket>-short-description

    feat/RID-1-login-page
    fix/RID-24-login-validation
    refactor/RID-31-auth-service
    test/RID-45-login-tests

  Allowed types: ${ALLOWED_TYPES.join(', ')}
  Use lowercase words separated by hyphens, and keep the RID ticket.

  Rename this branch with:  git branch -m <new-name>
`)
  process.exit(1)
}

// Only run when invoked directly, so the rules above can be imported by tests.
if (process.argv[1] && process.argv[1].endsWith('validate-branch-name.js')) {
  main()
}
