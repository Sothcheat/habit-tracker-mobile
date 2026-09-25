// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
  {
    // Two porting rules from PORTING.md, enforced rather than trusted. Both
    // failures are silent at runtime, which is exactly why they need a linter.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // Hermes has no `crypto` global, so this throws on every task create
          // and every habit tap.
          selector:
            "MemberExpression[object.name='crypto'][property.name='randomUUID']",
          message:
            'Hermes has no crypto global. Use newId() from @/lib/uuid instead.',
        },
        {
          // Reaching for the global couples the caller to the side-effect import
          // in @/lib/storage having already run; an import sorter can break that
          // without any error.
          selector: "Identifier[name='localStorage']",
          message:
            'Import { storage } from "@/lib/storage" rather than using the localStorage global.',
        },
        {
          // Confirmed missing on Hermes (Android, SDK 57). The web build uses it
          // in TrackerPage, TaskEditDialog and cards.tsx; each becomes
          // [...arr].sort(). Copying one of those across verbatim would throw at
          // runtime, not at build time.
          selector:
            "MemberExpression[property.name=/^(toSorted|toReversed|toSpliced)$/]",
          message:
            'Hermes does not ship the ES2023 change-array-by-copy methods. Use [...arr].sort() instead.',
        },
      ],
    },
  },
  {
    // The in-memory double implements the Storage interface it replaces.
    files: ['src/lib/storage.ts', 'src/lib/__mocks__/storage.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // The smoke screen's whole job is probing for these on device.
    files: ['src/app/index.tsx'],
    rules: { 'no-restricted-syntax': 'off' },
  },
]);
