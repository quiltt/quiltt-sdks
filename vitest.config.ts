import { defineConfig, mergeConfig } from 'vitest/config'

import react from '@vitejs/plugin-react'
import reactNative from 'vitest-react-native'

export default defineConfig({
  test: {
    projects: [
      // core
      mergeConfig(
        { resolve: { tsconfigPaths: true } },
        {
          test: {
            extends: true,
            name: 'core',
            include: ['packages/core/**/*.test.{ts,tsx}'],
            environment: 'happy-dom',
          },
        }
      ),
      // react
      mergeConfig(
        { plugins: [react()], resolve: { tsconfigPaths: true } },
        {
          test: {
            extends: true,
            name: 'react',
            include: ['packages/react/**/*.test.{ts,tsx}'],
            setupFiles: ['packages/react/vitest.setup.tsx'],
            environment: 'happy-dom',
          },
        }
      ),
      // react-native
      mergeConfig(
        { plugins: [reactNative()], resolve: { tsconfigPaths: true } },
        {
          test: {
            extends: true,
            name: 'react-native',
            include: ['packages/react-native/**/*.test.{ts,tsx}'],
            setupFiles: ['packages/react-native/vitest.setup.tsx'],
            mockReset: true,
            clearMocks: true,
            restoreMocks: true,
            environment: 'node',
          },
        }
      ),
      // capacitor
      mergeConfig(
        { plugins: [react()], resolve: { tsconfigPaths: true } },
        {
          test: {
            extends: true,
            name: 'capacitor',
            include: ['packages/capacitor/**/*.test.{ts,tsx}'],
            environment: 'happy-dom',
          },
        }
      ),
      // vue
      mergeConfig(
        { resolve: { tsconfigPaths: true } },
        {
          test: {
            extends: true,
            name: 'vue',
            include: ['packages/vue/**/*.test.{ts,tsx}'],
            environment: 'happy-dom',
          },
        }
      ),
    ],

    // Shared configurations
    pool: 'threads',
    maxWorkers: 1,
    isolate: true,
    environment: 'node',
    includeTaskLocation: true,
    globals: true,
    chaiConfig: {
      truncateThreshold: 80,
    },
    server: {
      deps: {
        inline: ['react-native-url-polyfill'],
      },
    },

    coverage: {
      provider: 'istanbul',
      reporter: ['json', 'lcov'],
      include: ['**/src/**/*.ts', '**/src/**/*.tsx'],
      exclude: [
        '**/src/**/index.ts',
        '**/node_modules/**',
        '**/test/**',
        '**/dist/**',
        '**/coverage/**',
        '**/*.config.js',
        '**/*.config.ts',
        '**/*.workspace.ts',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/example/**/*',
        '**/examples/**/*',
        '**/browser.ts',
      ],
    },
  },
})
