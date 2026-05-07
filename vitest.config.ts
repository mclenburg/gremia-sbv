import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-electron/**',
      '**/release/**',
      'e2e/**'
    ],
    coverage: {
      provider: 'v8',
      enabled: false,
      reportsDirectory: './coverage',
      include: ['services/**/*.ts'],
      exclude: [
        'services/**/*.test.ts',
        'services/generated/**',
        'electron/**',
        'src/app/features/**',
        'src/app/shared/**',
        'src/**/*.d.ts',
        '**/*.test.ts',
        'tests/**',
        'e2e/**'
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70
      }
    }
  }
});
