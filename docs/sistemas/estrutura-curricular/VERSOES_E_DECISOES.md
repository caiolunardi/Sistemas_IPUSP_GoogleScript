# Versões e decisões — Estrutura Curricular e Grade Horária

Fonte atual **1.12.1** (PDF.js 6.4.299 no leitor de PDF), sobre a 1.12.0 (migração para a base única de disciplinas), a 1.11.3 (auditoria com submenu, Panorama, atalho para as edições da aba e edições novas), a 1.10.0 e a baseline **1.9.3 auditada**. Verificação local registrada; implantação/homologação no Google pendentes. A cronologia completa recebida está no [README](README.md), na seção de histórico.

| Versão | Data | Marco |
|---|---|---|
| 1.0.0 | 27/09/2026 | importação CSV/PDF, base, painel e GRADIP |
| 1.1.0 | 27/09/2026 | gravação com preparação/ativação/recuperação e revisão humana |
| 1.2.0–1.2.4 | 27/09/2026 | recuperação reforçada, revisão paginada, leitura consistente e UX |
| 1.3.0 | 28/09/2026 | ajustes manuais, exclusão, outros cursos e preparação |
| 1.3.1–1.3.2 | 29/09/2026 | seleção em lote; período ideal × semestre de oferecimento |
| 1.4.0–1.4.3 | 30/09/2026 | lista da grade, prévia, nova grade e CSV+PDF juntos |
| 1.5.0–1.5.1 | 01/10/2026 | envio para secretarias, backup e autorização Drive |
| 1.6.0 | 02/10/2026 | auditoria, horário de fim e `Validacoes.gs` mínimo |
| 1.6.1–1.6.4 | 03/10/2026 | correções de lista, Tabela tipada, locale e horários auditados |
| 1.7.0 | 04/10/2026 | painel de auditoria e acesso centralizado |
| 1.8.0 | 04/10/2026 | gráficos, não oferecidas e retirada do link cru da auditoria |
| 1.8.1–1.8.15 | 04–07/10/2026, conforme registros recebidos | correções de identidade, CSV por unidade, assincronia, salvamento/lotes, oferta, trava, confirmação do conteúdo e executor; evidências históricas no pacote |
| 1.9.0–1.9.2 | 07/10/2026, conforme pacote | Central de Ajuda, foco e correções de orientação sobre resultados parciais/envio |
| 1.9.3 | 11/10/2026 | correção editorial: nem todas as etapas do envio foram concluídas; auditada localmente |
| 1.10.0 | 11/10/2026 | sidebar padrão, alternância para abas, ícones de catálogo, glow/elevação e documentação completa; algoritmos preservados |
| 1.11.0 | 14/10/2026 | auditoria da grade mostra nome, vínculo (setor, Docente, Aluno(a)) e e-mail de quem edita ou abre a planilha, pelos cadastros `SERVIDORES` → `PLANILHA_DOCENTES` → `PLANILHA_ALUNOS`; fora deles, "Pessoa não cadastrada com acesso". Correção: "Cadastrar nova grade" travava na última aba e o painel não abria (abas comparadas por objeto; agora pelo ID) |
| 1.11.1 | 19/10/2026 | auditoria: "Pessoa não cadastrada com acesso" não fica mais em cache (um setor recém-incluído em `SERVIDORES` continuava desconhecido por até 10 min); só o nome achado fica em cache, com prefixo novo `pessoaAud2:`; e-mails comparados sem espaços, espaço não separável e caracteres invisíveis |
| 1.11.2 | 19/10/2026 | auditoria: submenu de seções (Preenchimento, Não serão oferecidas com a contagem, Quem abre e edita, Edições) abaixo de "Auditoria da grade" no menu lateral; só a seção escolhida fica visível e continua escolhida ao atualizar, trocar de grade ou de modo; "ver edições" abre Edições já filtrada. Pedido do responsável funcional em 19/10/2026; abrir em Preenchimento foi decisão técnica |
| 1.11.3 | 19/10/2026 | auditoria: seção Panorama (Mapa da semana, Ritmo, Por departamento, Sem movimento; vinda do rascunho 1.12.0, agora com um detalhe por vez); "Ver as edições da aba" no Preenchimento (Edições filtrada pela aba e pelas secretarias; o clique no cartão continua mostrando a tabela da aba); "Edições (N novas)" e selo "Nova": edições das secretarias depois da última vez que a pessoa abriu Edições neste navegador (`localStorage["estrutura-auditoria-visto"]`, só data e hora por semestre; primeira visita não conta nada). Pedido do responsável funcional em 19/10/2026 |
| 1.12.0 | 20/10/2026 (preparada em 15/10, sobre a 1.11.3) | `BaseDisciplinas.gs`: `simularMigracaoDisciplinas` e `migrarDisciplinasParaBaseUnica` copiam as disciplinas da estrutura (com os ajustes) para a planilha `DISCIPLINAS` (chave primária `disc_` + UUID, universo, oferta por habilitação, histórico). Painel e envio inalterados. Ver [BASE_DISCIPLINAS.md](BASE_DISCIPLINAS.md) |
| 1.12.1 | 22/10/2026 (preparada; PR da Etapa 4) | `LeitorPdfFontes.html`: PDF.js 3.11.174 → 6.4.299 `legacy`; biblioteca e worker baixados com `fetch`, conferidos por SHA-384 e executados de `blob:` (`import()` e Worker de módulo); um worker por página; `blob:` liberados; documento liberado ao fim de cada leitura; nova tentativa depois de falha. JavaScript de documento não é executado (o leitor não usa camada de anotações, visualizador nem sandbox). Testes: equivalência com o 3.11.174 em PDF sintético, integridade, scripting e controles negativos. Ver [ETAPA4_PDFJS_MIGRACAO.md](ETAPA4_PDFJS_MIGRACAO.md) |

## Decisões estruturais

- Júpiter permanece fonte oficial; ajustes ficam separados.
- CSV define e PDF complementa.
- OCR no navegador.
- gravação multiaba usa manifesto como ponto único de ativação.
- planilha das secretarias permanece fixa; a cópia é o backup.
- auditoria fica em planilha separada, fora do alcance das secretarias.
- horário de fim é calculado, não digitado.
- acesso migrou para `PERMISSOES_DE_ACESSO`.
- painel de auditoria apresenta informação processada e não fornece link para dados crus.
- justificativa de não oferecimento permanece fora do sistema nesta versão.
- (1.11.0) a auditoria continua gravando só o e-mail; o nome é procurado na hora de exibir, nesta ordem: servidores (A e-mail, B nome, C setor), docentes (D e-mail, B nome) e alunos (D ou a coluna "eMail Secundario", achada pelo título; B nome), sempre na primeira aba e com títulos na linha 1. Nome e e-mail ficam visíveis juntos. Cadastro que não abre não vira "não cadastrado": a pessoa aparece como "nome não verificado" e o painel avisa. Decisões do responsável funcional em 14/10/2026.
- sidebar é o modo em cada abertura; layout não é persistido. Tema continua com preferência local independente.
- mesmo DOM/controladores nos dois layouts; sem duplicar formulários ou reconstruir o estado ao alternar.
- glow/elevação limitados à navegação como exceção explícita solicitada, com movimento reduzido e toque respeitados.
