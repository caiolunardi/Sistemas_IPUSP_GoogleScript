**Painel de Sistemas (servidores)** — versão 1.4, de 20/10/2026.

As planilhas saem do código e passam a ser achadas pelo `ID_INDEX`:

- as nove planilhas de dados (avisos dos cards, períodos dos formulários e Regras Curriculares) são abertas pela chave do `ID_INDEX`; o código guarda só o nome da chave (`CHAVE_PLANILHA_*`), nunca o ID;
- quatro chaves novas no `ID_INDEX`: `EMISSAO_DIPLOMAS`, `ABERTURA_HABILITACOES`, `SEGUNDA_VIA_BUSP` e `MATRICULA_INTERCAMBISTAS`; as outras cinco (`TRANCAMENTO_TOTAL_MATRICULA`, `TRANCAMENTO_PARCIAL_MATRICULA`, `EXCLUSAO_DISCIPLINAS`, `PERIODOS`, `REGRAS_CURRICULARES`) já existiam;
- o índice é lido uma vez por execução e guardado no cache do script por 10 minutos; uma chave recém-criada é encontrada na hora;
- novo `diagnosticarPlanilhasPainel` (editor, só administrador): confere as 13 chaves do painel e mostra o nome de cada planilha, sem IDs;
- a pasta `src/` do repositório vai ao Apps Script como está, pelo clasp ([desenvolvimento local](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/DEVELOPMENT_LOCAL.md)).

Nada muda para quem usa o painel.

**Implantação:** pendente. Esta Release marca o código do repositório; ela não atualiza o Apps Script.

Detalhes: [docs/sistemas/painel-servidores/README.md](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/painel-servidores/README.md).
