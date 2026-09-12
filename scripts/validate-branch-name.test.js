import { describe, expect, it } from 'vitest'
import {
  ALLOWED_TYPES,
  PROTECTED_BRANCHES,
  checkBranchName,
} from './validate-branch-name.js'

describe('checkBranchName', () => {
  describe('accepts branches that follow the convention', () => {
    it.each([
      'feat/RID-1-login-page',
      'feat/RID-24-user-profile',
      'feat/RID-105-dashboard-ui',
      'fix/RID-24-login-validation',
      'refactor/RID-31-auth-service',
      'test/RID-45-login-tests',
      'chore/RID-50-update-dependencies',
      'docs/RID-72-frontend-documentation',
      'perf/RID-80-ride-list',
      'style/RID-90-prettier',
    ])('%s', (branch) => {
      expect(checkBranchName(branch)).toBeNull()
    })

    it('accepts a single word description', () => {
      expect(checkBranchName('feat/RID-7-login')).toBeNull()
    })

    it('accepts digits in the description', () => {
      expect(checkBranchName('feat/RID-7-oauth2-login')).toBeNull()
    })
  })

  describe('rejects branches that do not', () => {
    it('rejects a missing RID ticket', () => {
      expect(checkBranchName('feat/login-screen')).toMatch(
        /missing its RID ticket/,
      )
    })

    it('rejects a missing type prefix', () => {
      expect(checkBranchName('RID-1-login-page')).toMatch(
        /missing a type prefix/,
      )
    })

    it('rejects an unknown type', () => {
      expect(checkBranchName('feature/RID-1-login-page')).toMatch(
        /not an allowed type/,
      )
    })

    it('rejects ci, build and revert, which the rules do not list', () => {
      expect(checkBranchName('ci/RID-1-pipeline')).toMatch(
        /not an allowed type/,
      )
      expect(checkBranchName('build/RID-1-bundler')).toMatch(
        /not an allowed type/,
      )
      expect(checkBranchName('revert/RID-1-undo')).toMatch(
        /not an allowed type/,
      )
    })

    it('rejects RID without a number', () => {
      expect(checkBranchName('feat/RID-login-page')).toMatch(
        /missing its RID ticket/,
      )
    })

    it('rejects RID without a hyphen before the number', () => {
      expect(checkBranchName('feat/RID24-login-page')).toMatch(
        /missing its RID ticket/,
      )
    })

    it('rejects a ticket with no description', () => {
      expect(checkBranchName('feat/RID-24')).toMatch(/missing its RID ticket/)
      expect(checkBranchName('feat/RID-24-')).not.toBeNull()
    })

    it('rejects uppercase in the description', () => {
      expect(checkBranchName('feat/RID-1-Login-Page')).toMatch(/lowercase/)
    })

    it('rejects underscores and spaces in the description', () => {
      expect(checkBranchName('feat/RID-1-login_page')).toMatch(/lowercase/)
      expect(checkBranchName('feat/RID-1-login page')).toMatch(/lowercase/)
    })

    it('rejects the vague names the rules call out', () => {
      expect(checkBranchName('my-branch')).not.toBeNull()
      expect(checkBranchName('changes')).not.toBeNull()
      expect(checkBranchName('testing-stuff')).not.toBeNull()
    })

    it('rejects the branch names used before these rules applied', () => {
      expect(checkBranchName('feat/login-screen')).not.toBeNull()
      expect(checkBranchName('feat/register-screen')).not.toBeNull()
      expect(checkBranchName('post-ride')).not.toBeNull()
    })
  })

  describe('long-lived branches', () => {
    it.each(PROTECTED_BRANCHES)('allows %s through', (branch) => {
      expect(checkBranchName(branch)).toBeNull()
    })

    it('does not allow a protected name as a substring', () => {
      expect(checkBranchName('developer')).not.toBeNull()
    })
  })

  describe('edge cases', () => {
    it('allows a detached HEAD', () => {
      expect(checkBranchName('HEAD')).toBeNull()
    })

    it('allows an empty branch name rather than failing a rebase', () => {
      expect(checkBranchName('')).toBeNull()
    })
  })

  it('covers every allowed type from the rules', () => {
    expect(ALLOWED_TYPES).toEqual([
      'feat',
      'fix',
      'refactor',
      'test',
      'chore',
      'docs',
      'perf',
      'style',
    ])

    for (const type of ALLOWED_TYPES) {
      expect(checkBranchName(`${type}/RID-1-some-work`)).toBeNull()
    }
  })
})
