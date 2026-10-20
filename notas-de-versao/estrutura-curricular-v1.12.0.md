**Estrutura Curricular e Grade Horária** — versão 1.12.0, no `main` em 20/10/2026 (sobre a 1.11.3).

Primeira etapa da **base única de disciplinas**: no editor do Apps Script, `simularMigracaoDisciplinas` mostra o que seria copiado, e `migrarDisciplinasParaBaseUnica` copia todas as disciplinas, com os ajustes do painel, para a planilha da chave `DISCIPLINAS` do `ID_INDEX`. Cada disciplina ganha um identificador próprio, universo, oferta por habilitação e histórico. Rodar de novo não duplica nem apaga campos que só existem na base. O painel e o envio da grade não mudam.

**No Apps Script:** criar `BaseDisciplinas.gs` e trocar `Codigo.gs` (só o número da versão muda nele). Passo a passo em [BASE_DISCIPLINAS.md](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/estrutura-curricular/BASE_DISCIPLINAS.md).

**Implantação:** ainda não implantada. Esta Release marca o código do repositório; ela não atualiza o Apps Script. Quando a versão for publicada no Google, edite esta Release e registre a data.

Detalhes e histórico: [docs/sistemas/estrutura-curricular/README.md](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/estrutura-curricular/README.md).
