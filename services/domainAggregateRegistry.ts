export type DomainAggregateName =
  | 'case_measure'
  | 'termination_hearing'
  | 'bem_process'
  | 'prevention_process'
  | 'equalization_process'
  | 'recruiting_participation';

export interface DomainAggregateDefinition {
  name: DomainAggregateName;
  rootTable: string;
  idColumn: string;
  caseColumn?: string;
  lifecycleType: string;
  extensions: readonly {
    table: string;
    foreignKey: string;
    discriminatorColumn?: string;
    discriminatorValue?: string;
  }[];
  reportSource: 'lifecycle' | 'specialized';
  deleteRule: 'root_cascade';
}

export const DOMAIN_AGGREGATES: readonly DomainAggregateDefinition[] = [
  {
    name: 'case_measure',
    rootTable: 'case_measures',
    idColumn: 'id',
    caseColumn: 'case_id',
    lifecycleType: 'dynamic_from_type',
    extensions: [
      { table: 'case_measure_participation', foreignKey: 'measure_id', discriminatorColumn: 'type', discriminatorValue: 'sbv_participation' },
      { table: 'case_measure_workplace_accommodation', foreignKey: 'measure_id', discriminatorColumn: 'type', discriminatorValue: 'workplace_accommodation' },
    ],
    reportSource: 'lifecycle',
    deleteRule: 'root_cascade',
  },
  { name: 'termination_hearing', rootTable: 'termination_hearings', idColumn: 'id', caseColumn: 'case_id', lifecycleType: 'termination_hearing', extensions: [], reportSource: 'lifecycle', deleteRule: 'root_cascade' },
  { name: 'bem_process', rootTable: 'bem_processes', idColumn: 'id', caseColumn: 'case_id', lifecycleType: 'bem', extensions: [], reportSource: 'lifecycle', deleteRule: 'root_cascade' },
  { name: 'prevention_process', rootTable: 'prevention_processes', idColumn: 'id', caseColumn: 'case_id', lifecycleType: 'prevention', extensions: [], reportSource: 'lifecycle', deleteRule: 'root_cascade' },
  { name: 'equalization_process', rootTable: 'equalization_processes', idColumn: 'id', caseColumn: 'case_id', lifecycleType: 'equalization_gdb', extensions: [], reportSource: 'lifecycle', deleteRule: 'root_cascade' },
  { name: 'recruiting_participation', rootTable: 'recruiting_participations', idColumn: 'id', lifecycleType: 'recruiting', extensions: [], reportSource: 'lifecycle', deleteRule: 'root_cascade' },
] as const;
