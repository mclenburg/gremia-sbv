import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export const vitestExcludedSuites = ['e2e/**', 'e2e-product/**'];

const rcCriticalServiceCoverage = [
  'services/securityService.ts',
  'services/security/**/*.ts',
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
  'services/caseProcessPolicy.ts',
  'services/equalizationWorkflowPolicy.ts',
  'services/equalizationGuidancePolicy.ts',
  'services/terminationPrivacyPolicy.ts',
  'services/terminationWorkflowPolicy.ts',
  'services/bemWorkflowPolicy.ts',
  'services/bemGuidancePolicy.ts',
  'services/personCaseBindingPolicy.ts',
  'services/personAnonymizationPolicy.ts',
  'services/privacyReviewPolicy.ts',
  'services/icalPrivacyPolicy.ts',
  'services/deadlineIcalExportService.ts',
  'services/auditHashChain.ts',
  'services/recruitingParticipationValidation.ts',
  'services/personCaseLinkService.ts',
  'services/tempFileService.ts',
  'services/demoMode.ts',
  'services/portableProfileService.ts'
];

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@services': fileURLToPath(new URL('./services', import.meta.url)),
      '@database': fileURLToPath(new URL('./database', import.meta.url))
    }
  },
  test: {
    testTimeout: 20000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-electron/**',
      '**/release/**',
      ...vitestExcludedSuites
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
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
        ...vitestExcludedSuites
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
