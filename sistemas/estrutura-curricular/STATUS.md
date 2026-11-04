# Estrutura Curricular e Grade Horária — STATUS

- **Sistema:** `estrutura-curricular`
- **Protocolo:** `context/v1`
- **Corte:** `2026-11-04`
- **Código-base referenciado:** `a8af8e4b49519640d23ded7f99cbe87749162fbf`
- **Estado editorial:** `PARCIAL`
- **Última rodada reconhecida:** `EC-ROD-20261104-001`
- **Estado de produção:** `NAO_VERIFICADO`
- **Marco Zero prospectivo:** [registro local](contexto/MARCO_ZERO.md), preparado para revisão em PR próprio, **sem aceite ou ativação formal de contexto por aplicativo**.

## Missão e fronteira de responsabilidade

A aplicação importa relatórios curriculares do Júpiter (CSV e PDF, com OCR quando necessário), prepara informações de disciplinas e a grade horária, envia o conteúdo para a planilha de preenchimento pelas secretarias e possibilita auditoria. A [planilha das secretarias](planilha-grade/README.md) tem scripts vinculados próprios; o [Painel dos servidores](../../docs/sistemas/painel-servidores/README.md) e a [Grade Horária visual](../../docs/sistemas/grade-horaria-visual/README.md) são consumidores/integrações, não um único deploy.

## Capacidades presentes e evidência no Git

| Capacidade | Fonte | Prova e limite |
| --- | --- | --- |
| Web App e acesso por perfis | [src/](src/), [DADOS_E_SEGURANCA](../../docs/sistemas/estrutura-curricular/DADOS_E_SEGURANCA.md) | Código em `main` examinado, acesso no servidor documentado; **não** inspeção da configuração Google atual |
| Importação e base curricular | [Leitor CSV/PDF](src/), [arquitetura](../../docs/sistemas/estrutura-curricular/ARQUITETURA.md) | Caminhos CSV/PDF/OCR e gravação com manifesto descritos; testes sintéticos não são comprovação de todos os relatórios reais |
| Proteção OCR B2 | [PROTECAO_B2_OCR](../../docs/sistemas/estrutura-curricular/PROTECAO_B2_OCR.md) | `VERSAO_SISTEMA='1.13.0'` em `Codigo.gs` do HEAD e testes B2 incluídos em CI por PR #30; F3/F4/F7 **não detectados** |
| Preparação e envio da grade | [CONTRATOS_E_FLUXOS](../../docs/sistemas/estrutura-curricular/CONTRATOS_E_FLUXOS.md), [MODELO_DE_DADOS](../../docs/sistemas/estrutura-curricular/MODELO_DE_DADOS.md) | Regras e testes versionados; conferir persistência/recuperação e dependências antes de mudança |
| Proteção/validação da planilha vinculada | [planilha-grade/](planilha-grade/README.md) | Fonte no Git, **implantação independente e não verificada neste corte** |

## Gates e bloqueios atuais

- **Versão no Git:** `1.13.0`, confirmada no `src/Codigo.gs` e em [notas de versão](../../notas-de-versao/estrutura-curricular-v1.13.0.md). **Homologação Google e publicação dessa versão não comprovadas**; documentos atuais afirmam pendência. Não tratar `main` como `/exec`.
- **CI do HEAD observado:** [run 40395963163](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/actions/runs/40395963163), `success` no push do `main` de 26/10/2026. O checker de contexto deste aplicativo **ainda não foi ativado**, e essa CI não testou os novos documentos.
- **OCR:** B2 detecta parte das linhas acadêmicas ilegíveis; F3 (disciplina vira outro código válido), F4 (requisito vira código válido distinto) e F7 (perda do "ou") seguem sem detecção. Evidência só sintética; comportamento em PDF real e HtmlService requer homologação específica. [Limites](../../docs/sistemas/estrutura-curricular/PROTECAO_B2_OCR.md).
- **PR pendente:** [#32](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/32), manifesto `appsscript.json` do editor, **aberto** no corte, risco crítico; não incorporado à `main`.
- **Risco documental:** [MANUTENCAO_E_CONTINUIDADE](../../docs/sistemas/estrutura-curricular/MANUTENCAO_E_CONTINUIDADE.md) ainda se intitula 1.10.0; [INSTALACAO_E_ATUALIZACAO](../../docs/sistemas/estrutura-curricular/INSTALACAO_E_ATUALIZACAO.md) 1.11.3; [README vigente](../../docs/sistemas/estrutura-curricular/README.md) e [VERSOES_E_DECISOES](../../docs/sistemas/estrutura-curricular/VERSOES_E_DECISOES.md) descrevem 1.13.0. Esses guias antigos mantêm **alcance histórico** e não devem ser atualizados silenciosamente por este PR.
- **Adoção de contexto:** este é um **Marco Zero em PR**, condicionado à aprovação documental, à entrada geral em [PR #33](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/33), à instalação posterior do manifesto verificável e à validação a frio. Não declarar `ADOTADO` por existir STATUS proposto.

## Próxima ação possível (não autorizada por este texto)

Revisar o Marco Zero, mapear as evidências públicas de cada decisão do histórico e verificar o PR #33. Após integração formal da entrada geral e deste contexto individual, preparar `context.config.json` com **somente aplicações reais**, validar com checker local e uma IA independente sem conversa anterior. Em paralelo, homologação 1.13.0, PR #32 e riscos OCR permanecem ações **separadas**, cada uma sujeita a seu mandato.

## Fontes e continuidade

[CONTINUIDADE](contexto/CONTINUIDADE.md) · [MARCO_ZERO](contexto/MARCO_ZERO.md) · [PENDENCIAS](contexto/PENDENCIAS.md) · [RODADAS](contexto/RODADAS.md) · [HISTORICO_E_PROVENIENCIA](contexto/HISTORICO_E_PROVENIENCIA.md) · [regras gerais](../../CLAUDE.md).

**Âncora Git:** a rodada inicial é identificada pelo trailer `Gradip-Round: EC-ROD-20261104-001` do commit que introduzir estes documentos. Não usar o SHA autorreferente do próprio commit dentro do STATUS. Revalidar o objeto vivo antes de prosseguir.
