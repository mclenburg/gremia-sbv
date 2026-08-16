import { INCLUSION_AGREEMENT_TOPIC_KEYS, type InclusionAgreementTopicKey } from '../src/app/core/models/sbv-office-workflow.model.js';
export const REQUIRED_INCLUSION_TOPICS: readonly InclusionAgreementTopicKey[] = INCLUSION_AGREEMENT_TOPIC_KEYS;
export function missingInclusionTopics(existing: readonly InclusionAgreementTopicKey[]): InclusionAgreementTopicKey[] {
  const set = new Set(existing); return REQUIRED_INCLUSION_TOPICS.filter((key) => !set.has(key));
}
export function inclusionAgreementClosureState(input:{signedAt?:string; sentAgencyAt?:string; sentIntegrationOfficeAt?:string}) {
  return { agreementComplete: Boolean(input.signedAt), transmissionComplete: Boolean(input.sentAgencyAt && input.sentIntegrationOfficeAt), canClose: Boolean(input.signedAt && input.sentAgencyAt && input.sentIntegrationOfficeAt) };
}
