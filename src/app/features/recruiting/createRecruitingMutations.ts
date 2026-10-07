import type { CreateRecruitingParticipationInput, UpdateRecruitingParticipationInput } from '../../../domain/models/recruiting-participation.model';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { emptyInterviewForm, inputFromForm, interviewInputFromForm } from './recruitingParticipationViewSupport';
import type { useRecruitingParticipationState } from './useRecruitingParticipationState';

type MutationState = Pick<ReturnType<typeof useRecruitingParticipationState>,
  'form' | 'interviewForm' | 'selected' | 'setSaving' | 'setError' | 'setMessage' | 'setQuery' |
  'setStatusFilter' | 'creatingRef' | 'setCreateOpen' | 'setInterviewForm' | 'announce' | 'reload'>;
type RecruitingService = Window['gremiaSbv']['recruitingParticipations'];

export function createRecruitingMutations(
  state: MutationState,
  getService: () => Promise<RecruitingService | null> = async () => (await waitForBridge())?.recruitingParticipations ?? null,
) {
  async function run(operation: (service: RecruitingService) => Promise<void>, fallback: string) {
    state.setSaving(true);
    state.setError('');
    try {
      const service = await getService();
      if (!service) throw new Error('Stellenbesetzungsdienst ist nicht erreichbar.');
      await operation(service);
    } catch (saveError) {
      state.setError(saveError instanceof Error ? saveError.message : fallback);
    } finally {
      state.setSaving(false);
    }
  }

  return {
    createRecord: () => run(async (service) => {
      const created = await service.create(inputFromForm(state.form) as CreateRecruitingParticipationInput);
      state.setQuery('');
      state.setStatusFilter('all');
      state.creatingRef.current = false;
      state.setCreateOpen(false);
      state.setMessage('Stellenbesetzung wurde angelegt.');
      state.announce('Stellenbesetzung wurde angelegt.');
      await state.reload(created.id);
    }, 'Stellenbesetzung konnte nicht angelegt werden.'),

    updateRecord: async () => {
      const selected = state.selected;
      if (!selected) return;
      await run(async (service) => {
        await service.update(selected.id, inputFromForm(state.form) as UpdateRecruitingParticipationInput);
        state.setMessage('Stellenbesetzung wurde aktualisiert.');
        state.announce('Stellenbesetzung wurde aktualisiert.');
        await state.reload(selected.id);
      }, 'Stellenbesetzung konnte nicht aktualisiert werden.');
    },

    addInterview: async () => {
      const selected = state.selected;
      if (!selected) return;
      await run(async (service) => {
        await service.addInterview(interviewInputFromForm(selected.id, state.interviewForm));
        state.setInterviewForm(emptyInterviewForm());
        state.setMessage('Vorstellungsgespräch wurde als Beteiligungsereignis erfasst.');
        state.announce('Vorstellungsgespräch wurde erfasst.');
        await state.reload(selected.id);
      }, 'Vorstellungsgespräch konnte nicht erfasst werden.');
    },
  };
}
