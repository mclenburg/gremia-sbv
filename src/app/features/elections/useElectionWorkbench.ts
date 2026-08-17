import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConfigureElectionSetupInput, CreateElectionInput, ElectionPreparationOverview, ElectionRecord } from '../../../domain/models/election-workflow.model';
import type { ElectionExecutionOverview } from '../../../domain/models/election-execution.model';
export function useElectionWorkbench(){
 const [elections,setElections]=useState<ElectionRecord[]>([]),[selectedId,setSelectedId]=useState(''),[overview,setOverview]=useState<ElectionPreparationOverview|null>(null),[execution,setExecution]=useState<ElectionExecutionOverview|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const selectedIdRef=useRef('');
 const selectId=useCallback((id:string)=>{selectedIdRef.current=id;setSelectedId(id);},[]);
 const refresh=useCallback(async(preferId?:string)=>{const list=await window.gremiaSbv.elections.list();setElections(list);const id=preferId||selectedIdRef.current||list[0]?.id||'';selectId(id);setOverview(id?await window.gremiaSbv.elections.overview(id):null);setExecution(id?await window.gremiaSbv.elections.executionOverview(id):null);},[selectId]);
 useEffect(()=>{void refresh().catch(e=>setError(e instanceof Error?e.message:'Wahlbereich konnte nicht geladen werden.'));},[refresh]);
 async function run<T>(op:()=>Promise<T>,message:string):Promise<T|undefined>{setError('');setNotice('');try{const result=await op();await refresh(selectedId);setNotice(message);return result;}catch(e){setError(e instanceof Error?e.message:'Aktion fehlgeschlagen.');return undefined;}}
 return{elections,selectedId,overview,execution,error,notice,refresh,select:async(id:string)=>{selectId(id);setOverview(id?await window.gremiaSbv.elections.overview(id):null);setExecution(id?await window.gremiaSbv.elections.executionOverview(id):null);},create:async(input:CreateElectionInput)=>{const e=await window.gremiaSbv.elections.create(input);await refresh(e.id);setNotice('Wahlvorgang angelegt.');},configure:(input:ConfigureElectionSetupInput)=>run(async()=>window.gremiaSbv.elections.configureSetup(selectedId,input),'Verfahrensprüfung gespeichert.'),run};
}
