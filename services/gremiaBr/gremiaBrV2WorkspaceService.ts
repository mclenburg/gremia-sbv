import { GremiaBrAuthService } from './gremiaBrAuthService.js';
import type { GremiaBrWorkspaceBody } from '../../src/domain/models/gremia-br.model.js';

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalText(value: unknown): string | undefined {
  const normalized = text(value);
  return normalized || undefined;
}

function isEligibleSbvBody(value: unknown): boolean {
  const item = record(value);
  if (!item) return false;
  return item.bodyType === 'SEVERELY_DISABLED_REPRESENTATION' && item.holdsSeat === true;
}

function bodyFromSummaryAndDetail(summary: Record<string, unknown>, detail?: Record<string, unknown>): GremiaBrWorkspaceBody | null {
  const bodyId = text(summary.bodyId);
  const bodyName = text(summary.bodyName);
  const organizationId = text(summary.organizationId);
  if (!bodyId || !bodyName || !organizationId) return null;
  return {
    bodyId,
    bodyName,
    bodyType: text(summary.bodyType) || 'SEVERELY_DISABLED_REPRESENTATION',
    organizationId,
    securityDomain: optionalText(detail?.securityDomain),
    contentProtectionClass: optionalText(detail?.contentProtectionClass),
    termValidUntil: optionalText(summary.termValidUntil),
  };
}

export class GremiaBrV2WorkspaceService {
  constructor(private readonly auth: GremiaBrAuthService) {}

  async listSbvWorkspaceBodies(): Promise<GremiaBrWorkspaceBody[]> {
    const summaries = await this.auth.get<unknown[]>('/api/v1/me/bodies');
    const eligibleSummaries = summaries
      .map((item) => record(item))
      .filter((item): item is Record<string, unknown> => Boolean(item && isEligibleSbvBody(item)));
    const bodies: GremiaBrWorkspaceBody[] = [];
    for (const summary of eligibleSummaries) {
      const bodyId = text(summary.bodyId);
      const detail = bodyId ? record(await this.auth.get<unknown>(`/api/v1/bodies/${encodeURIComponent(bodyId)}`)) : undefined;
      const body = bodyFromSummaryAndDetail(summary, detail);
      if (body) bodies.push(body);
    }
    return bodies;
  }
}
