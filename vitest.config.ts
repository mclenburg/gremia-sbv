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
  'services/documentStoragePolicy.ts',
  'services/templatePolicy.ts',
  'services/templateContextPolicy.ts',
  'services/knowledgePolicy.ts',
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
  'services/auditLogService.ts',
  'services/auditIntegrityAnchor.ts',
  'services/caseHandoverCrypto.ts',
  'services/targetBoundTransferCrypto.ts',
  'services/secureFileOperations.ts',
  'services/documentContainerService.ts',
  'services/gremiaBr/gremiaBrPolicy.ts',
  'electron/security/rendererSecurityPolicy.ts',
  'electron/security/mainSessionLock.ts',
  'services/recruitingParticipationValidation.ts',
  'services/personCaseLinkService.ts',
  'services/employerQuotaSettingsService.ts',
  'src/domain/persons/employmentQuota.ts',
  'services/tempFileService.ts',
  'services/demoMode.ts'
];

const coverageReportsDirectory = process.env.GREMIA_SBV_COVERAGE_DIR || './coverage';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@database': fileURLToPath(new URL('./database', import.meta.url))
    }
  },
  test: {
    maxWorkers: 4,
    testTimeout: 120000,
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
      reportsDirectory: coverageReportsDirectory,
      include: rcCriticalServiceCoverage,
      exclude: [
        'services/**/*.test.ts',
        'services/generated/**',
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
