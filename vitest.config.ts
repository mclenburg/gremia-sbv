import { defineConfig } from 'vitest/config';

const rcCriticalServiceCoverage = [
  'services/securityService.ts',
  'services/backupService.ts',
  'services/terminationWorkflowPolicy.ts',
  'services/preventionWorkflowPolicy.ts',
  'services/retentionPolicy.ts',
  'services/reportPrivacyPolicy.ts',
  'services/exportGuardPolicy.ts',
  'services/textCommandPolicy.ts',
  'services/backupPolicy.ts',
  'services/documentStoragePolicy.ts',
  'services/templatePolicy.ts',
  'services/templateContextPolicy.ts',
  'services/knowledgePolicy.ts',
  'services/activityReportService.ts',
  'services/caseProcessPolicy.ts',
  'services/equalizationWorkflowPolicy.ts',
  'services/equalizationGuidancePolicy.ts',
  'services/terminationPrivacyPolicy.ts',
  'services/terminationHearingService.ts',
  'services/terminationWorkflowPolicy.ts',
  'services/bemWorkflowPolicy.ts',
  'services/bemGuidancePolicy.ts'
];

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
      reportsDirectory: './coverage',
      include: rcCriticalServiceCoverage,
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
