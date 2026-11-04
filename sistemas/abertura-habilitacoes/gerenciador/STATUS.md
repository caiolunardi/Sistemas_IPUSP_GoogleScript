# Gerenciador de Abertura de Habilitações — STATUS

- **Sistema:** `abertura-habilitacoes-gerenciador`
- **Protocolo:** `context/v1`
- **Corte:** `2026-11-04`
- **Código-base referenciado:** `5b6aba0ccd4ef7036bc294df769f61fd41994553`
- **Estado editorial:** `PARCIAL`
- **Última rodada reconhecida:** `AHG-ROD-20261104-001`
- **Estado de produção:** `NAO_VERIFICADO` (a versão hoje servida pelo `/exec` não foi inspecionada)
- **Adoção:** `PROPOSTA` — exige revisão, CI, teste a frio e decisão humana para ser adotado.

## Objeto e fronteira

Web App autônomo da equipe: pendentes, concluídos, histórico, relatórios, observações, concluir/reabrir e aviso por e-mail. O **Google Forms dos alunos é externo**, sem contexto neste PR. O Painel dos servidores consome parte da planilha, mas é outro app e deploy.

## Estado em camadas

| Camada | Estado documentado/observado | Limite |
| --- | --- | --- |
| Código Git | `VERSAO_GERENCIADOR = "2.1"` em [configuração](src/Configuracao.gs), `appsscript.json` com `USER_DEPLOYING/DOMAIN`; `main@5b6aba0`, [CI principal](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/actions/runs/41896788922) 26/26 | Git não comprova implantação |
| Histórico de operação | [homologação](../../../docs/sistemas/abertura-habilitacoes/HOMOLOGACAO.md) registra v2.0, versão 6 (21/10), e v2.1, versão 7 (22/10, código `8a3aa63`) com G1–G4 `ok`; PRs [#20](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/20), [#21](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/21) | Relato do responsável/documento Git; não inspeção independente do Google |
| Editor, configuração, `/exec` atuais | `NAO_VERIFICADO` | Este trabalho não acessou Google |
| Contexto local | Marco Zero prospectivo em PR | Não houve aceite de adoção |

## Invariantes

Autorização server-side por `GERENCIADOR_HABILITACOES` na planilha de permissões; `AMBIENTE=homologacao` escolhe coluna própria do `ID_INDEX`. Histórico `2021 - 2022` é somente leitura. J = observações e K = situação, sujeitos a alterações do Forms. K vazia conta no gerenciador, mas não no Painel.

`doGet` não migra dados; IDs/Versão têm plano e confirmação; envio de e-mail usa reserva própria, e `ENVIADO_SEM_REGISTRO` não autoriza reenvio. Auditoria recusa escrita se indisponível antes da operação; não reverte escrita quando falha evento final. Observações e buscas na auditoria podem conter dados pessoais. [Testes históricos](testes/README.md) relatam 105 servidor, 27 equivalência e 314 navegador em 22/10, com dados sintéticos; não foram reexecutados nesta rodada.

## Gates e divergências

- G1–G4 de v2.1 foram registrados na homologação; G5–G8 não constam como executados naquela rodada. Isso não significa que foram reprovados.
- Conservam-se riscos J/K após mudança no Forms, contagem divergente no Painel, envio de e-mail incerto, rollback da 1.0, auditoria não atômica, retenção e base legal `A VALIDAR`.
- **Documentação preexistente conflitante:** [README pai](../README.md) diz v2.0 não implantada; [arquitetura](../../../docs/sistemas/abertura-habilitacoes/ARQUITETURA.md) diz 2.1 só no Git; o topo do [guia de instalação](../../../docs/sistemas/abertura-habilitacoes/INSTALACAO_E_ATUALIZACAO.md) descreve a fase inicial. O registro posterior da [homologação](../../../docs/sistemas/abertura-habilitacoes/HOMOLOGACAO.md) documenta a implantação, sem provar versão atual. Errata editorial é trabalho separado.
- O corte de autoridade já feito na Estrutura Curricular não é aceite deste gerenciador, cujo estado permanece `PROPOSTA`.

**Próxima ação possível:** auditar os documentos e a proveniência, validar estrutura/CI, testar retomada a frio com só o Git público, decidir adoção em ato humano. Nenhum merge ou operação Google é autorizado por este STATUS.

[continuidade](contexto/CONTINUIDADE.md) · [pendências](contexto/PENDENCIAS.md) · [marco zero](contexto/MARCO_ZERO.md) · [histórico](contexto/HISTORICO_E_PROVENIENCIA.md).
