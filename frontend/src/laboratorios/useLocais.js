import { useLaboratorios } from './useLaboratorios';

// Deriva a lista de localizações reais a partir dos laboratórios:
// "{lab} · {armário}" por armário; lab sem armários → "{lab}".
export function useLocais() {
  const { data: labs = [], isPending, isError } = useLaboratorios();
  const locais = labs.flatMap(lab =>
    (lab.armarios?.length ? lab.armarios.map(a => `${lab.nome} · ${a}`) : [lab.nome])
  );
  return { locais, isPending, isError };
}
