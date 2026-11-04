# Estrutura Curricular e Grade Horária — STATUS

- **Sistema:** `estrutura-curricular`
- **Protocolo:** `context/v1`
- **Corte:** `2026-11-04`
- **Código-base referenciado:** `16fdaf75336c84391e7b7400583095b265cc06f1` (`main` depois dos PRs #33, #34 e #35, que só mudaram documentação; o código da Estrutura é o mesmo de `a8af8e4`; o PR #32 aberto foi lido no mesmo corte, HEAD `a84c370c8ed9431b75afd5bd228ffa0d5e57f26c`)
- **Estado editorial:** `PARCIAL`
- **Última rodada reconhecida:** `EC-ROD-20261104-005`
- **Estado de produção:** `NAO_VERIFICADO` (versão do `/exec` sem prova direta; o editor de produção tem um relato, ver "Estado em camadas")
- **Marco Zero prospectivo:** [registro local](contexto/MARCO_ZERO.md), no `main` desde 04/11/2026 (PR #34); manifesto `context.config.json` criado na rodada 005; **sem teste a frio nem aceite**. Estado da adoção: `PROPOSTA`.

## Missão e fronteira de responsabilidade

A aplicação importa relatórios curriculares do Júpiter (CSV e PDF, com OCR quando necessário), prepara informações de disciplinas e a grade horária, envia o conteúdo para a planilha de preenchimento pelas secretarias e possibilita auditoria. A [planilha das secretarias](planilha-grade/README.md) tem scripts vinculados próprios; o [Painel dos servidores](../../docs/sistemas/painel-servidores/README.md) e a [Grade Horária visual](../../docs/sistemas/grade-horaria-visual/README.md) são consumidores/integrações, não um único deploy.

## Estado em camadas (cada uma com prova própria)

| Camada | Estado no corte | Fonte e grau de prova |
| --- | --- | --- |
| Código no Git (`main`) | `VERSAO_SISTEMA = '1.13.0'` em `src/Codigo.gs`; [notas da 1.13.0](../../notas-de-versao/estrutura-curricular-v1.13.0.md) | Observado no Git; [CI do `main` 41857267782](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/actions/runs/41857267782) `success` em `16fdaf7` na segunda tentativa (a primeira falhou numa checagem do teste de tela do Painel dos servidores, sem relação com a Estrutura) |
| Editor de produção (`GRADIP · Grade Horaria - Config · PRODUÇÃO`) | Código da 1.12.0 (`32a077c`) com o rótulo `VERSAO_SISTEMA = '1.11.3'`; a 1.12.1 (PDF.js 6.4.299), a B2 e a 1.13.0 **nunca foram enviadas** | Leitura A1 de 26/10/2026 **relatada pelo executor** no [PR #32](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/32) (seção "Estado atual da produção"); **não** observada de forma independente pelo revisor nem por este contexto |
| Implantação ativa (`/exec`) | Versão e configuração (executar como, acesso) **não verificadas** | `NAO_VERIFICADO`; só a tela "Gerenciar implantações" prova ([dados e segurança](../../docs/sistemas/estrutura-curricular/DADOS_E_SEGURANCA.md), §4 no PR #32) |
| Homologação | Em andamento pelo PR #32: projeto `GRADIP · Grade Horaria - Config · HOMOLOGAÇÃO` criado (A3a) e HEAD `a84c370` enviado (A3b) em 27/10/2026, com **não conformidade de processo** registrada (o envio foi retomado depois de uma parada explícita, sem esperar a decisão) | Comentários de 27/10/2026 no [PR #32](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/32) (relato do executor + parecer de revisão automatizada; não é observação independente do Google) |
| Homologação funcional (A4) | Ver "Gates e bloqueios": **PARCIAL/BLOQUEADA** | Registro mínimo autorizado pelo responsável em 04/11/2026; evidências fora do Git |

A futura publicação é um **salto acumulado** (editor atual → PDF.js 6.4.299 + B2 + 1.13.0), não "acrescentar a B2". O rollback exato depende da cópia dos 36 arquivos da A1, guardada fora do Git (corpo do PR #32, requisito 8).

## Capacidades presentes e evidência no Git

| Capacidade | Fonte | Prova e limite |
| --- | --- | --- |
| Web App e acesso por perfis | [src/](src/), [dados e segurança](../../docs/sistemas/estrutura-curricular/DADOS_E_SEGURANCA.md) | Código no `main` examinado, acesso no servidor documentado; **não** inspeção da configuração Google atual |
| Importação e base curricular | [src/](src/), [arquitetura](../../docs/sistemas/estrutura-curricular/ARQUITETURA.md) | Caminhos CSV/PDF/OCR e gravação pelo manifesto da versão ativa (ARQUITETURA §7); testes sintéticos não comprovam todos os relatórios reais |
| Proteção OCR B2 | [proteção B2](../../docs/sistemas/estrutura-curricular/PROTECAO_B2_OCR.md) | Suítes B2 na CI exigida desde o PR #30; limites em "Gates e bloqueios" |
| Preparação e envio da grade | [contratos e fluxos](../../docs/sistemas/estrutura-curricular/CONTRATOS_E_FLUXOS.md), [modelo de dados](../../docs/sistemas/estrutura-curricular/MODELO_DE_DADOS.md) | Regras e testes versionados; conferir persistência/recuperação e consumidores antes de mudar |
| Proteção/validação da planilha vinculada | [planilha-grade/](planilha-grade/README.md) | Fonte no Git, **implantação independente e não verificada neste corte** |

## Gates e bloqueios atuais

- **Homologação 1.13.0 (A4):** executada em parte em 27/10/2026 no projeto `GRADIP · Grade Horaria - Config · HOMOLOGAÇÃO`, sobre o HEAD congelado `a84c370` do PR #32. Resultado: **PARCIAL/BLOQUEADA**. H13 (acesso com o papel LEITOR) e M2 (conta sem autorização) aguardam uma segunda conta institucional de teste. Os relatórios e as evidências ficam fora do Git e não contêm dado do PDF real. O roteiro H0–H14 da 1.13.0 também fica fora do Git, com o responsável: peça a ele antes de retomar a A4.
- **Decisões do responsável em 27/10/2026:** manter o gate H13/M2; para os nomes de disciplinas lidos por OCR, o CSV tem prioridade e há revisão humana; aceitar o limite residual da B2 observado com PDF real (uma disciplina perdida sinalizada só pelo aviso de contas que não fecham), sem mudança de código nesta versão. **O aceite desse limite não é aprovação da homologação**, que continua bloqueada.
- **Isolamento da homologação:** a Estrutura **não lê** a propriedade `AMBIENTE` nem a coluna "Homologação" do `ID_INDEX` (`src/Configuracao.gs`, comentário do cabeçalho: "A coluna D (Homologação) nunca é usada"). O padrão geral do [ambiente de homologação](../../docs/sistemas/AMBIENTE_DE_HOMOLOGACAO.md) **não se aplica**: homologar só em projeto Apps Script separado cuja Script Property `ID_INDEX_SPREADSHEET_ID` aponte para um `ID_INDEX` fictício e isolado. Apontar uma cópia para o `ID_INDEX` de produção leria e gravaria dados reais.
- **PR #32 (risco crítico, aberto):** versiona o manifesto real `appsscript.json` do editor de produção **e** é o veículo do roteiro de homologação da 1.13.0 (etapa A2). O HEAD `a84c370` está congelado para a homologação; qualquer mudança nele exige reavaliar as evidências afetadas. O merge depende dos requisitos listados no corpo do PR (H0–H14, H13, M1, M2, PDFs reais, `/exec`, rollback; "uma divergência acadêmica silenciosa reprova a homologação") e de autorização escrita do responsável. Fica separado dos PRs de contexto, mas **não** é independente da homologação.
- **OCR (limites conhecidos, [proteção B2](../../docs/sistemas/estrutura-curricular/PROTECAO_B2_OCR.md) §7 e §9):** F3 (disciplina lida como outro código válido), F4 (requisito lido como outro código válido) e F7 ("ou" perdido) sem detecção; a detecção roda **só no navegador** e não protege contra requisição manipulada; o servidor (`validarPacote_` em `Importacao.gs`) lê só os **100 primeiros avisos**, e o responsável decidiu em 04/11/2026 corrigir isso em PR próprio **depois da publicação da 1.13.0**, sem mexer no PR #32; D5 pode avisar em documento correto; H1–H3 não validadas; o limite residual observado com PDF real (acima) ficou aceito. A B2 **não** é garantia universal de integridade acadêmica: a prévia continua exigindo conferência humana.
- **CI:** "CI concluída" é o único gate obrigatório. O workflow `diagnostico-fontes.yml` ("Diagnóstico de fontes (não bloqueante)", [integração contínua](../../docs/CI.md)) lê o PDF misto sintético com as fontes naturais do executor e fica vermelho no `main` desde o PR #26 (DIVERGÊNCIA ACADÊMICA preexistente; com a B2, as divergências viram erro e bloqueiam a importação). O vermelho não é aprovação nem é causado por mudanças só de documentação; mudança no resultado é achado a analisar. Uma investigação de 04/11/2026 (relatório fora do Git) atribuiu o vermelho às fontes e ao hinting do executor, comportamento já registrado nos testes da [Etapa 4](../../docs/sistemas/estrutura-curricular/ETAPA4_PDFJS_MIGRACAO.md) (§6), e não a uma regressão. As opções de tratamento aguardam decisão do responsável.
- **Documentos históricos:** desde o [PR #35](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/35), os guias antigos ([homologação histórica](../../docs/sistemas/estrutura-curricular/HOMOLOGACAO.md), 1.9.3/1.10.0; [manutenção e continuidade](../../docs/sistemas/estrutura-curricular/MANUTENCAO_E_CONTINUIDADE.md), 1.10.0; [instalação e atualização](../../docs/sistemas/estrutura-curricular/INSTALACAO_E_ATUALIZACAO.md), 1.11.3) têm um aviso no topo dizendo que são registro histórico. O conteúdo deles não foi reescrito: siga o aviso. No mesmo PR, a nota da 1.13.0, a PROTECAO_B2_OCR, o [catálogo](../../docs/SISTEMAS.md) e o [guia geral de homologação](../../docs/sistemas/AMBIENTE_DE_HOMOLOGACAO.md), que agora cita a exceção da Estrutura, foram corrigidos.
- **Versão servida em produção:** o responsável decidiu em 04/11/2026 conferir em "Gerenciar implantações" a versão e a data do app da Web ativo. Até essa resposta, o `/exec` segue `NAO_VERIFICADO`.
- **Adoção de contexto:** `PROPOSTA`. A entrada geral (PR #33) e este contexto (PR #34) estão no `main` desde 04/11/2026, e o manifesto `context.config.json` foi criado na rodada 005. A adoção segue condicionada a um teste a frio independente e à decisão humana de corte de autoridade, que o responsável decidiu tomar depois do teste a frio. Não declarar `ADOTADO` por existir STATUS proposto.

## Próxima ação possível (não autorizada por este texto)

- **Estrutura:** concluir a A4 quando houver a segunda conta de teste (H13 e M2), que o responsável vai providenciar, sobre o HEAD congelado do PR #32; só então decidir o merge do #32, e depois, com ordens próprias, tag/Release, publicação e supervisão da primeira importação real.
- **Contexto:** teste a frio independente, por outra IA que receba só o repositório; depois, a decisão do responsável sobre o corte de autoridade do acervo anterior.

## Fontes e continuidade

[Continuidade](contexto/CONTINUIDADE.md) · [Marco Zero](contexto/MARCO_ZERO.md) · [Pendências](contexto/PENDENCIAS.md) · [Rodadas](contexto/RODADAS.md) · [histórico e proveniência](contexto/HISTORICO_E_PROVENIENCIA.md) · [regras gerais](../../CLAUDE.md).

**Âncora Git:** cada rodada é identificada pelo trailer do commit que a introduz: `EC-Round: <ID>` a partir da rodada 002; a rodada 001 usou `Gradip-Round: EC-ROD-20261104-001`, preservado sem reescrever o histórico. Não usar o SHA autorreferente do próprio commit dentro do STATUS. Revalidar o objeto vivo antes de prosseguir.
