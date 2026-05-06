type CasesViewHeaderProps = {
  title: string;
  description: string;
};

export function CasesViewHeader({ title, description }: CasesViewHeaderProps) {
  return (
    <header className="module-header compact">
      <div>
        <p className="eyebrow">Fallakten</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </header>
  );
}
