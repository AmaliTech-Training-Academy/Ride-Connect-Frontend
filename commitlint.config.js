// Enforces the team convention: <type>: RID-<ticket> <short description>
// e.g. "feat: RID-24 add user profile page"

const ALLOWED_TYPES = [
  'feat',
  'fix',
  'refactor',
  'test',
  'chore',
  'docs',
  'perf',
  'style',
]

const RID_TICKET = /^RID-\d+\s+\S/

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'subject-rid-ticket': ({ subject }) => [
          RID_TICKET.test(subject ?? ''),
          'subject must start with a RID ticket, e.g. "feat: RID-24 add login page"',
        ],
      },
    },
  ],
  rules: {
    'type-enum': [2, 'always', ALLOWED_TYPES],
    // The subject legitimately starts with the upper-case RID ticket, which
    // config-conventional's case rule would otherwise reject.
    'subject-case': [0],
    'subject-rid-ticket': [2, 'always'],
  },
}
