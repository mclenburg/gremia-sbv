export type Setter<T> = (updater: (current: T | null) => T | null) => void;

export function isPrefilled(
  draft: { prefilledFields?: string[] } | null | undefined,
  field: string,
): boolean {
  return Boolean(draft?.prefilledFields?.includes(field));
}

export function PrefillIndicator({ active }: { active: boolean }) {
  return active ? (
    <span
      className="prefill-marker"
      aria-label="automatisch vorbelegt"
      title="automatisch vorbelegt"
    >
      ◇
    </span>
  ) : null;
}

export function FieldCaption({
  children,
  draft,
  field,
}: {
  children: string;
  draft: { prefilledFields?: string[] };
  field: string;
}) {
  return (
    <span>
      {children}
      <PrefillIndicator active={isPrefilled(draft, field)} />
    </span>
  );
}
