import { describe, expect, it, vi } from 'vitest';
import { DeferredTextInput, DeferredDateTimeInput, DeferredTextareaInput } from '../../src/app/shared/components/IndustrialForm';
import { ProcessDetailHeader } from '../../src/app/shared/process/ProcessDetailHeader';
import { EqualizationProcessDetail } from '../../src/app/features/equalization/EqualizationProcessDetail';
import type { EqualizationProcessRecord } from '../../src/domain/models/equalization.model';
import { descendants, renderComponent, visibleText } from '../helpers/renderedMarkup';

const process: EqualizationProcessRecord = {
  id: 'synthetic-equalization', caseId: 'synthetic-case', applicationStatus: 'beratung',
  createdAt: '2030-01-01T12:00:00Z', updatedAt: '2030-01-01T12:00:00Z',
};

describe('Process field behavior', () => {
  it.each([
    { name: 'text', tag: 'input', value: 'Geschäftszeichen', render: (onCommit: (value: string) => void) => renderComponent(DeferredTextInput, { label: 'Feld', value: 'Geschäftszeichen', onCommit }) },
    { name: 'date', tag: 'input', value: '2030-03-12T09:30', render: (onCommit: (value: string) => void) => renderComponent(DeferredDateTimeInput, { label: 'Feld', value: '2030-03-12T09:30', onCommit }) },
    { name: 'textarea', tag: 'textarea', value: 'Ergebnis dokumentiert', render: (onCommit: (value: string) => void) => renderComponent(DeferredTextareaInput, { label: 'Feld', value: 'Ergebnis dokumentiert', onCommit }) },
  ])('renders a labeled %s field with the stored value without committing', (testCase) => {
    const onCommit = vi.fn();
    const { tree, markup } = testCase.render(onCommit);
    const nodes = descendants(tree);
    const control = nodes.find((node) => node.tag === testCase.tag)!;
    expect(control).toBeDefined();
    expect(nodes.some((node) => node.tag === 'label' && node.attrs.for === control.attrs.id)).toBe(true);
    if (testCase.tag === 'textarea') expect(visibleText(markup)).toContain(testCase.value);
    else expect(control.attrs.value).toBe(testCase.value);
    if (testCase.name === 'date') expect(control.attrs.type).toBe('datetime-local');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it.each([false, true])('offers the document action only when provided: %s', (available) => {
    const documentAction = vi.fn();
    const { tree } = renderComponent(ProcessDetailHeader, {
      title: 'Fachverfahren', description: 'Unterlagen bearbeiten', badges: [],
      documentAction: available ? documentAction : undefined,
    });
    expect(descendants(tree).filter((node) => node.tag === 'button')).toHaveLength(available ? 1 : 0);
    expect(documentAction).not.toHaveBeenCalled();
  });

  it('starts equalization notes empty and disables explicit storage until a draft exists', () => {
    const onCreateSecureNote = vi.fn().mockResolvedValue(true);
    const { tree, markup } = renderComponent(EqualizationProcessDetail, { process, onUpdate: vi.fn(), onCreateSecureNote });
    const nodes = descendants(tree);
    const textarea = nodes.find((node) => node.tag === 'textarea' && nodes.some((label) => label.tag === 'label' && label.attrs.for === node.attrs.id));
    expect(textarea).toBeDefined();
    expect(nodes.some((node) => node.tag === 'button' && Object.hasOwn(node.attrs, 'disabled'))).toBe(true);
    expect(visibleText(markup)).toContain('Verlassen des Feldes legt keine neue verschlüsselte Notiz mehr an');
    expect(onCreateSecureNote).not.toHaveBeenCalled();
  });
});
