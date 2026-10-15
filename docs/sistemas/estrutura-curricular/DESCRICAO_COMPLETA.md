> **Status no repositório central**

> Registro histórico do pacote 1.8.0. A fonte atual é 1.10.0, sobre baseline 1.9.3 auditada. Use o [índice atual](README.md), [manual](MANUAL_OPERACAO.md) e [contratos](CONTRATOS_E_FLUXOS.md) para manutenção; este documento não descreve sozinho as correções posteriores.
>
> Documento incorporado em 04/10/2026 a partir do descritivo entregue com o snapshot **1.8.0**. Nesta etapa ele é fonte documental. A auditoria independente do código será feita separadamente antes de o snapshot ser promovido como baseline canônica em `sistemas/estrutura-curricular/src/`.

# Sistema Estrutura Curricular e Grade Horária — descrição completa (versão 1.8.0)

Documento de referência do Serviço de Graduação do Instituto de Psicologia da USP (IPUSP). Ele descreve, do começo ao fim, como o sistema funciona: o que entra, como cada etapa é feita, que regras foram escolhidas e por quê, o que foi aprendido com os problemas reais e o que ainda está em aberto. Foi escrito para ser lido por quem vai **auditar e documentar** o sistema sem ter participado da construção.

> **Convenções deste documento**
> - Nenhum ID real de planilha, pasta ou implantação aparece aqui. Todo recurso é identificado pela **chave** que o localiza na planilha mestre `ID_INDEX` (ex.: `GRADE_HORARIA_PREENCHIMENTO`).
> - Nenhum e-mail ou nome de pessoa aparece aqui. Os exemplos usam contas fictícias (`…@unidade.example`).
> - "Versão x.y.z" indica quando uma regra entrou ou mudou. A versão atual do código é **1.8.0**.
> - O código-fonte completo acompanha este documento (zip). Os nomes de arquivos e funções citados existem no código.

---

## Sumário

1. [Contexto e objetivo](#1-contexto-e-objetivo)
2. [Visão de ponta a ponta](#2-visão-de-ponta-a-ponta)
3. [Plataforma, componentes e arquivos](#3-plataforma-componentes-e-arquivos)
4. [Configuração: ID_INDEX, chaves e propriedades](#4-configuração-id_index-chaves-e-propriedades)
5. [Acesso e perfis](#5-acesso-e-perfis)
6. [A planilha-base ESTRUTURA_CURRICULAR](#6-a-planilha-base-estrutura_curricular)
7. [Importação do Júpiter (CSV e PDF)](#7-importação-do-júpiter-csv-e-pdf)
8. [Gravação segura (manifesto, diário, recuperação)](#8-gravação-segura-manifesto-diário-recuperação)
9. [O painel: consulta da estrutura](#9-o-painel-consulta-da-estrutura)
10. [Preparação da grade horária (etapas 1 a 4)](#10-preparação-da-grade-horária-etapas-1-a-4)
11. [Enviar Grade para Preenchimento](#11-enviar-grade-para-preenchimento)
12. [A planilha das secretarias](#12-a-planilha-das-secretarias)
13. [Auditoria da grade (registro de edições e aberturas)](#13-auditoria-da-grade-registro-de-edições-e-aberturas)
14. [Painel da auditoria (Comissão de Graduação)](#14-painel-da-auditoria-comissão-de-graduação)
15. [Ciclo de um semestre, passo a passo](#15-ciclo-de-um-semestre-passo-a-passo)
16. [Segurança, dados pessoais e registros](#16-segurança-dados-pessoais-e-registros)
17. [Interface, tema e acessibilidade](#17-interface-tema-e-acessibilidade)
18. [Testes e homologação](#18-testes-e-homologação)
19. [Histórico de versões e decisões](#19-histórico-de-versões-e-decisões)
20. [Incidentes reais e o que se aprendeu](#20-incidentes-reais-e-o-que-se-aprendeu)
21. [Limites conhecidos, pendências e ideias futuras](#21-limites-conhecidos-pendências-e-ideias-futuras)
22. [Sugestões para quem for auditar](#22-sugestões-para-quem-for-auditar)
23. [Glossário](#23-glossário)
24. [Mapa do código (zip)](#24-mapa-do-código-zip)

---

## 1. Contexto e objetivo

### 1.1 O problema

A cada semestre, o Serviço de Graduação do IPUSP monta a **grade horária** do curso de Psicologia (curso 47012). Até 2026 isso era feito numa planilha Google com vários scripts: o Serviço de Graduação preparava a lista de disciplinas e as **secretarias dos departamentos** (PSA, PSC, PSE, PST e as disciplinas interdepartamentais/de outras unidades) preenchiam docentes, dias, horários, vagas e salas.

Os problemas eram: a lista de disciplinas era montada à mão a partir do Júpiter (sistema acadêmico da USP); não havia uma base organizada da estrutura curricular; e não havia registro confiável de quem preencheu o quê na planilha das secretarias.

### 1.2 O que o sistema faz

É um **Web App em Google Apps Script** usado pela equipe do Serviço de Graduação (e, para consulta, pela Comissão de Graduação). Ele:

1. **importa** a estrutura curricular do Júpiter (relatório "Grade Curricular", em CSV e/ou PDF) e a guarda numa planilha-base organizada, com histórico;
2. **mostra** essa estrutura num painel com busca, filtros e uma ficha por disciplina;
3. **prepara a lista da grade horária** do semestre: corrige o que precisar (sem alterar o Júpiter), inclui disciplinas que o IP dá para outros cursos, escolhe o que entra na grade e mostra uma prévia nas mesmas abas da planilha das secretarias;
4. **envia a grade para a planilha das secretarias**, com cópia de segurança do arquivo anterior;
5. **audita** o preenchimento: registra cada edição e cada abertura da planilha das secretarias numa planilha de auditoria por semestre, fora do alcance delas;
6. **apresenta a auditoria** num painel para a Comissão de Graduação: andamento por departamento, disciplinas que não serão oferecidas ("Aguardando Justificativa"), quem mais abre e quem mais edita, linha do tempo das edições e histórico por disciplina.

### 1.3 O que o sistema não faz

- Não altera o Júpiter e não substitui o Júpiter como fonte oficial.
- Não preenche docentes, dias, horários, vagas ou salas (isso é das secretarias, na planilha delas).
- Não publica a grade visual para alunos (a planilha antiga, com link público já divulgado, continua existindo à parte e será reformulada no futuro).
- Não recebe nem registra as justificativas de disciplinas não oferecidas (chegam à Comissão de Graduação por fora).
- "Carregar grade antiga" existe como botão desativado (fase futura).

---

## 2. Visão de ponta a ponta

```text
 JÚPITER                         WEB APP "Estrutura Curricular" (Apps Script, executa como a conta do Serviço de Graduação)
 ───────                         ─────────────────────────────────────────────────────────────────────────────────────────
 Relatório "Grade Curricular"    navegador: lê e confere o arquivo ──► servidor: valida tudo de novo, compara com a base,
 (CSV e/ou PDF)                  (CSV; PDF por texto ou OCR)            mostra a prévia ──► confirmação ──► GRAVA
                                                                                                             │
 "Lista de disciplinas           navegador: decodifica o CSV ──► servidor: prévia (só códigos novos) ──► inclui
  por unidade" (CSV)                                                                                         │
                                                                                                             ▼
                                                         planilha-base ESTRUTURA_CURRICULAR (9 abas + histórico)
                                                                                                             │
                                  PAINEL (admin): etapa 1 corrigir/excluir · etapa 2 outros cursos ·         │
                                  etapa 3 escolher para a grade · etapa 4 prévia por aba (semestre/ano) ◄────┘
                                                                     │ "Enviar Grade para Preenchimento"
                                                                     ▼
            ┌─ cópia de segurança do arquivo das secretarias (pasta BACKUP_GRADES_ANTERIORES) + linha no índice
            ├─ planilha de auditoria do semestre (pasta AUDITORIA_GRADES_ANTERIORES) + ID no índice
            └─ planilha das secretarias (GRADE_HORARIA_PREENCHIMENTO): apaga B4:S999 das 6 abas, grava as
               disciplinas (C, D, E, I, J) e a fórmula do horário de fim (M), renomeia o arquivo
                                                                     │
                     secretarias preenchem (Validacoes.gs: modalidade Prática + conflito de horário)
                                                                     │  cada edição / cada abertura
                                                                     ▼
              acionadores instaláveis do Web App ──► planilha de auditoria do semestre (abas Edições e Aberturas)
                                                                     │
                                                                     ▼
              PAINEL (admin e leitor): seção "Auditoria da grade" — não oferecidas, preenchimento por aba,
              gráficos (quem mais abre / quem mais edita), edições com filtros, histórico, grades anteriores
```

---

## 3. Plataforma, componentes e arquivos

### 3.1 Plataforma

- **Google Apps Script**, projeto **independente** (não vinculado a uma planilha), implantado como **App da Web**:
  - **Executar como:** a conta do Serviço de Graduação que implantou ("Eu", `USER_DEPLOYING`). Por isso as pessoas que usam o painel não precisam ter acesso às planilhas.
  - **Quem pode acessar:** qualquer pessoa da Universidade de São Paulo (domínio). Quem de fato entra é decidido pelo próprio sistema (seção 5).
- **Fuso:** `America/Sao_Paulo`; ambiente V8.
- **Dados:** planilhas Google e pastas do Drive, todas localizadas pela planilha mestre `ID_INDEX` (seção 4).
- **Interface:** HTML servido pelo `HtmlService`, com a identidade visual GRADIP (tema claro/escuro), comunicando com o servidor por `google.script.run`.

### 3.2 Por que a leitura dos arquivos acontece no navegador

- O Apps Script não tem OCR, e o PDF do Júpiter pode não ter camada de texto ("Microsoft Print to PDF").
- O arquivo não precisa ser enviado ao Drive nem a terceiros.
- A pessoa confere a leitura antes de o servidor receber qualquer dado.
- **O servidor não confia no navegador:** revalida o pacote inteiro e refaz todo o cálculo na gravação.

### 3.3 Arquivos do projeto Apps Script (27, todos na raiz)

| Arquivo | Camada | Responsabilidade |
|---|---|---|
| `Codigo.gs` | servidor | `doGet` (página), `include_`, `VERSAO_SISTEMA` (hoje `'1.8.0'`) |
| `Configuracao.gs` | servidor | Propriedades do script; `idDoIndex_(chave, tipo)` (busca no `ID_INDEX`); cache do ID da base; `diagnosticarConfiguracao()` |
| `Acesso.gs` | servidor | `obterUsuario_()`, `exigirAdmin_()`, leitura da planilha de permissões (seção 5) |
| `Esquema.gs` | servidor | nomes das abas, colunas (título, tipo, largura, nota), criação/reparo das abas, proteção "só aviso", aba Sobre, metadados |
| `Planilha.gs` | servidor | ler/escrever abas **pelo título** das colunas; preserva colunas extras |
| `Importacao.gs` | servidor | `prepararImportacao`, `confirmarImportacao`, validação do pacote, plano, prévia, revisão paginada |
| `Gravacao.gs` | servidor | manifesto, diário, preparação em cópias, ativação, arrumação, recuperação, leitura consistente, `verificarImportacao` |
| `Consulta.gs` | servidor | `obterDadosPainel` (dados do painel) |
| `Preparacao.gs` | servidor | ajustes, exclusões, disciplinas para outros cursos, lista por unidade, marcar/desmarcar para a grade, "Cadastrar nova grade" |
| `EnvioGrade.gs` | servidor | `enviarGradeParaPreenchimento`, `diagnosticarEnvioGrade`, fórmula do horário de fim |
| `AuditoriaGrade.gs` | servidor | índice das grades anteriores, planilha de auditoria por semestre, acionadores `registrarEdicaoGrade` e `registrarAberturaGrade`, `ativarAuditoriaGrade`/`desativarAuditoriaGrade` |
| `AuditoriaPainel.gs` | servidor | `obterAuditoriaGrade` (dados do painel da auditoria, só leitura) |
| `Utilidades.gs` | servidor | respostas padronizadas, erros amigáveis, `textoSeguro_`, e-mails, datas, departamento, hash |
| `Painel.html` | página | estrutura da página; inclui os demais |
| `PainelEstilos.html` | página | CSS com tokens GRADIP; responsivo |
| `PainelApp.html` | página | módulo `Painel`: dados, filtros, lista, ficha, currículos, importações, janela modal |
| `PainelImportacao.html` | página | janela de importação (arquivo → leitura → conferência → prévia → gravação) |
| `PainelPreparacao.html` | página | ficha editável, cadastro, lista por unidade, etapas 2–4, envio da grade |
| `PainelAuditoria.html` | página | módulo `Auditoria`: seções Estrutura/Auditoria e todo o painel da auditoria |
| `LeitorComum.html`, `LeitorCsv.html`, `LeitorPdf.html`, `LeitorPdfFontes.html` | página | leitura dos arquivos do Júpiter no navegador |
| `GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | página | tema e marcas GRADIP (cópias idênticas às do Painel de Solicitações) |

Fora do projeto, na **planilha das secretarias**, fica um único arquivo de script: `planilha-grade/Validacoes.gs` (seção 12).

### 3.4 Funções que o navegador pode chamar

No Apps Script, toda função cujo nome **não** termina em `_` pode ser chamada pelo navegador. Por isso todas as auxiliares terminam em `_`, e toda função pública verifica o perfil de quem chama antes de fazer qualquer coisa. Toda resposta tem o formato `{ ok: true, dados }` ou `{ ok: false, erro, codigo }` (`executarComSeguranca_`); erros inesperados são registrados só com o nome da função e a pilha, e voltam com mensagem genérica (`INESPERADO`).

| Função | Quem | O que faz |
|---|---|---|
| `obterDadosPainel()` | leitor, admin | dados da base para o painel (seção 9) |
| `prepararImportacao(pacote)` | admin | prévia de uma importação (não grava dados) |
| `confirmarImportacao(pacote, assinatura, opcoes)` | admin | grava a importação (seção 8) |
| `obterPaginaRevisao(operacao, pagina)` | admin | página da lista de revisão do PDF |
| `verificarImportacao(operacao)` | admin | diz se uma importação ficou gravada (após "resultado incerto") |
| `salvarDisciplina(...)` | admin | salva ajustes/observações (e, opcionalmente, adiciona à grade na mesma escrita) |
| `excluirDisciplinas(itens, excluir)` | admin | exclui/restaura |
| `adicionarAGrade(itens)` / `removerDaGrade(itens)` | admin | marca/desmarca "Adicionada à grade horária" |
| `cadastrarNovaGrade('APAGAR')` | admin | apaga a planilha-base inteira para recomeçar |
| `cadastrarDisciplinaOutros(...)` | admin | cadastra disciplina para outros cursos |
| `previaDisciplinasUnidade(...)` / `incluirDisciplinasUnidade(...)` | admin | lista por unidade (CSV) |
| `enviarGradeParaPreenchimento({semestre, ano, esperado})` | admin | envio da grade (seção 11) |
| `obterAuditoriaGrade({semestre})` | leitor, admin | dados do painel da auditoria (seção 14) |
| `registrarEdicaoGrade(e)` / `registrarAberturaGrade(e)` | acionadores | registro na auditoria (seção 13); chamadas da página com dados inventados não fazem nada |
| `ativarAuditoriaGrade()` / `desativarAuditoriaGrade()` | admin, no editor | instala/remove os acionadores da auditoria |
| `diagnosticarConfiguracao()` / `diagnosticarEnvioGrade()` | admin, no editor | conferem a configuração sem mostrar IDs |

---

## 4. Configuração: ID_INDEX, chaves e propriedades

### 4.1 Nenhum ID no código

Regra de projeto desde a primeira versão: **nenhum ID de planilha, pasta ou implantação fica no código, na documentação ou nos registros**. Tudo é localizado assim:

1. **Propriedade do script** `ID_INDEX_SPREADSHEET_ID` (Configurações do projeto › Propriedades do script) → ID da planilha mestre `ID_INDEX`, compartilhada com outros sistemas do Serviço de Graduação.
2. **`ID_INDEX`**, primeira aba: coluna A = `Chave`, B = `Tipo`, C = `ID de Produção` (a coluna D, "Homologação", nunca é lida). O cabeçalho é conferido.
3. `idDoIndex_(chave, tipo)` procura a linha da chave: chave ausente, repetida, do tipo errado ou sem ID → erro `CONFIGURACAO`, com mensagem sem IDs.

Assim, para trocar uma planilha ou pasta, basta mudar o ID na planilha `ID_INDEX`, sem mexer no código.

### 4.2 Chaves usadas por este sistema

| Chave (`ID_INDEX`) | Tipo | O que é | Desde |
|---|---|---|---|
| `ESTRUTURA_CURRICULAR` | spreadsheet (conferido) | planilha-base da estrutura | 1.0.0 |
| `GRADE_HORARIA_PREENCHIMENTO` | planilha | planilha que as secretarias preenchem | 1.5.0 |
| `INDEX_GRADE_HORARIA_VERSOES_ANTERIORES` | planilha | índice das grades: A = Semestre, B = ID da cópia de segurança, C = Auditoria_ID | 1.5.0 (C em 1.6.0) |
| `BACKUP_GRADES_ANTERIORES` | pasta | onde ficam as cópias de segurança da planilha das secretarias | 1.5.0 |
| `AUDITORIA_GRADES_ANTERIORES` | pasta | onde ficam as planilhas de auditoria (uma por semestre) | 1.6.0 |
| `PERMISSOES_DE_ACESSO` | spreadsheet (conferido) | planilha que define quem acessa os apps; aba `ESTRUTURA_CURRICULAR` para este sistema | 1.7.0 |

O ID da base fica em cache por 10 minutos; a lista de permissões, por 60 segundos; os IDs da planilha das secretarias e das auditorias usados pelos acionadores, por 6 horas. As chaves do envio são lidas a cada envio.
### 4.3 Escopos (permissões do Google)

O código usa `SpreadsheetApp`, `DriveApp` (cópia de segurança e pastas, desde a 1.5.0), `ScriptApp` (acionadores, desde a 1.6.0), `Session`, `PropertiesService`, `CacheService`, `LockService`, `HtmlService` e `Utilities`. Se o manifesto (`appsscript.json`) fixar `oauthScopes`, precisa conter: `spreadsheets`, `drive`, `script.scriptapp` e `userinfo.email`. Sem `drive`, o envio recusa com `AUTORIZACAO_DRIVE`; sem `script.scriptapp`, os acionadores não são instalados.

**Importante:** depois de uma atualização que acrescenta um serviço novo (ex.: Drive na 1.5.0), é preciso executar uma função no editor (ex.: `diagnosticarEnvioGrade`) para o Google pedir a autorização nova; a implantação sozinha não pede.

---

## 5. Acesso e perfis

### 5.1 Regra atual (desde a 1.7.0)

Implementada em `Acesso.gs`, verificada **no servidor, em toda chamada** (esconder botões é só conveniência visual).

1. **Identificação:** `Session.getActiveUser().getEmail()`. Com o Web App executando como quem implantou, o Google só informa o e-mail de contas do mesmo domínio (usp.br). Sem e-mail → `SEM_CONTA`.
2. **Lista de acesso:** planilha da chave `PERMISSOES_DE_ACESSO`, aba **`ESTRUTURA_CURRICULAR`** (cada aba dessa planilha atende um app). Linha 1 = títulos; uma pessoa por linha:
   - A = N. USP · B = Nome · **C = e-mail** · D = Observação · **E = Perfil**.
   - O cabeçalho é conferido: C precisa conter "mail" e E precisa conter "Perfil"; senão `CONFIGURACAO` (ninguém entra).
3. **Perfil:**
   - `ADMINISTRADOR` → tudo: importar, preparar, enviar a grade, executar as funções do editor, ver a auditoria.
   - `LEITOR` → consulta a estrutura (modo leitura, sem etapas nem botões de alteração) e a auditoria.
   - Perfil **vazio ou desconhecido** → leitor (o menor acesso).
   - E-mail **repetido** na aba → vale o **menor** acesso (uma linha de leitor não vira administrador por engano).
4. **Qualquer outra conta** → `SEM_ACESSO`. Não há liberação por domínio, nem acesso automático para o dono da planilha.
5. O e-mail é comparado sem diferença de maiúsculas e sem espaços.
6. A lista fica em cache por **60 s**: incluir, tirar ou trocar o perfil de alguém vale em até 1 minuto.

Funções que gravam chamam `exigirAdmin_()` (leitor → `SO_ADMIN`).

### 5.2 Como era antes (até a 1.6.x)

Administrador = dono da planilha `ESTRUTURA_CURRICULAR` ou e-mail na propriedade `ESTRUTURA_ADMINS`; leitor = e-mail ou domínio em `ESTRUTURA_LEITORES`. Desde a 1.7.0 essas propriedades **não são lidas**; `diagnosticarConfiguracao` avisa se ainda existirem.

**Por que mudou:** o Serviço de Graduação passou a centralizar as permissões de todos os apps numa planilha (`PERMISSOES_DE_ACESSO`), e a Comissão de Graduação precisava entrar só para consultar.

---

## 6. A planilha-base ESTRUTURA_CURRICULAR

### 6.1 Criação e convivência com edições manuais

A planilha começa vazia. Na primeira abertura do painel por um administrador, `garantirEstrutura_()` renomeia a aba vazia para **Sobre**, cria as demais, escreve os cabeçalhos (azul GRADIP, com nota explicativa em cada coluna), aplica formatos, larguras, congelamento e proteção **"só aviso"** (avisa, mas não impede). Nas aberturas seguintes, só acrescenta colunas que faltem; **nunca apaga dados**.

- Colunas são lidas e escritas **pelo título** (sem acento, sem diferença de maiúsculas), não pela posição: dá para reordenar colunas.
- Título apagado/renomeado → a coluna é recriada no fim na próxima abertura por um admin.
- Colunas **extras** criadas por alguém são preservadas e acompanham a linha pela chave.
- A coluna **Observações** (aba Disciplinas) fica fora da proteção e nunca é apagada pelo sistema.
- Textos que a planilha poderia reinterpretar (códigos com zero à esquerda, currículo de 12 dígitos, "2026/2", textos iniciados por `=`, `+`, `-`, `@`) são gravados com apóstrofo inicial (`textoSeguro_`).

### 6.2 Abas (esquema 3)

| Aba | Conteúdo |
|---|---|
| **Sobre** | texto que explica cada aba, a última importação e a versão do esquema |
| **Disciplinas** (22 colunas) | catálogo: uma linha por código — nome, departamento, prefixo, créditos-aula/-trabalho/total, CH, CE, CP, EXT, ATPA, versão (e de onde veio), habilitações, resumo de tipo/período, semestre de oferecimento calculado, situação ("Na estrutura atual"/"Fora da estrutura atual"), datas, **Observações** |
| **Disciplinas por habilitação** (10) | a oferta: currículo, habilitação, código, nome, departamento, tipo, período ideal, semestre de oferecimento nessa habilitação, créditos-aula, resumo dos requisitos |
| **Requisitos** (11) | currículo, disciplina, tipo de requisito, requisito (código, versão, nome), grupo, relação ("ou"/"e"/não informado), se o requisito está na estrutura |
| **Currículos** (39) | um por currículo (12 dígitos): curso, habilitação, cadastro, situação, se está em uso ("Não — substituído por…"), contagens, AAC, e as **Informações Básicas** do PDF (datas, durações, cargas exigidas, estágio, AEX Apolo, extensão, total geral, texto) |
| **Importações** (17) | uma linha por importação: id, data e hora, quem importou, arquivo, formato, leitura, modo, contagens, resumo |
| **Alterações** (9) | uma linha por mudança: importação, data, código, nome, o que mudou, habilitação, campo, antes, depois |
| **Ajustes manuais** (18, 1.3.0) | correções feitas no painel para disciplinas da estrutura, por **código no Júpiter**: Excluída, Adicionada à grade horária, código/nome/departamento/créditos/CH/CE/CP/EXT/ATPA/versão ajustados, semestre de oferecimento ajustado, oferta ajustada, alterado em/por |
| **Disciplinas para outros cursos** (19, 1.3.0) | disciplinas do IP ministradas para outras unidades: identificador, código, nome, departamento, créditos, CH, ativação/desativação, unidade e curso atendidos, semestre de oferecimento, origem, incluída em, Excluída, Adicionada à grade horária, Observações, alterado em/por |

Abas ocultas: `_anterior_<aba>` (versão anterior de cada aba de dados) e, só durante/depois de uma falha, `_nova_<aba>_<op>`.

**Metadados invisíveis** (Developer Metadata): `estruturaCurricular.esquema` (versão do esquema; hoje 3), `estruturaCurricular.ativa` (o **manifesto**), `estruturaCurricular.gravacao` (o **diário**, só durante uma gravação) e `estruturaCurricular.recomeco` (só durante "Cadastrar nova grade").

### 6.3 Júpiter + ajustes ("sobreposição")

O painel mostra, para cada disciplina da estrutura, os valores do Júpiter com os campos de "Ajustes manuais" por cima (campo vazio = vale o Júpiter). Os ajustes **sobrevivem às importações**, porque a importação regrava só as abas do Júpiter. A chave do ajuste é o código **no Júpiter**: mesmo que o código seja ajustado, o ajuste continua ligado à disciplina original. Uma disciplina que sai da estrutura numa importação futura mantém o ajuste.

As abas "Ajustes manuais" e "Disciplinas para outros cursos" **não fazem parte do manifesto**: cada ação do painel roda sob a mesma trava das importações e regrava a aba afetada **numa única escrita** (vale inteira ou não vale).

---

## 7. Importação do Júpiter (CSV e PDF)

### 7.1 Os dois arquivos

Relatório "Grade Curricular" do Júpiter (Estrutura Curricular › Relatórios), curso e currículo vigentes, **complemento em branco** (para vir com todas as habilitações), tipo "Ativo", as três obrigatoriedades marcadas.

| | CSV | PDF |
|---|---|---|
| Papel no sistema | **fonte principal**: nomes completos, todos os números, arquivo exato | **complemento**: versão de todas as disciplinas, extensão (EXT), requisitos alternativos ("ou"), requisito fraco e as **Informações Básicas** dos currículos |
| Limites | não informa "e"/"ou" nos requisitos; versão só de quem é requisito | corta nomes longos; o "Complemento" do cabeçalho das páginas vem errado; o exemplo real **não tem camada de texto** (exige OCR) |

Arquivos reais de referência: 3 currículos (Psicólogo `0000`, Bacharelado `0100`, Licenciatura `0200`), 183 disciplinas, 398 ofertas, 238 requisitos; o PDF tem 38 páginas. Na comparação, CSV e PDF concordaram em todas as ofertas, requisitos e 1.098 números; o PDF cortou 36 nomes e trouxe 24 disciplinas com EXT > 0 e 19 casos de "ou".

### 7.2 Leitura do CSV (`LeitorCsv.html`)

- Codificação: UTF-8 estrito; se houver byte inválido, Windows-1252 (padrão do Júpiter). Remove BOM.
- Separador: o mais frequente na 1ª linha fora de aspas (`;` no Júpiter). RFC 4180.
- 18 colunas lidas **pela posição** (há duas colunas chamadas "Nome"); cabeçalho conferido.
- Uma disciplina com N requisitos ocupa N linhas; é contada uma vez por currículo.
- Currículo em notação científica (arquivo salvo no Excel) → erro com orientação.
- Código com 6 dígitos (zero perdido) → completado, com aviso.
- CH ≠ 15 × aula + 30 × trabalho → aviso. Mesma disciplina com dados diferentes → erro.
- A versão da disciplina é aproveitada de onde ela aparece como requisito, quando há um só valor.
- Avisos agrupados (até 8 exemplos e o total).

### 7.3 Leitura do PDF (`LeitorPdfFontes.html` + `LeitorPdf.html`)

- **PDF com texto** (ao menos metade das páginas com 40+ caracteres na camada de texto): lido com PDF.js; leitura exata.
- **PDF sem texto**: OCR no navegador com Tesseract.js e o modelo `tessdata_fast` 4.1.0 de português, a 300 dpi, em duas passadas (página inteira; só a faixa dos números, aceitando apenas dígitos). O modelo padrão (`best_int`) lia "0" como "o" e perdia linhas; o `fast` leu as 398 linhas com números coerentes.
- Bibliotecas baixadas **só quando alguém escolhe um PDF**, de `cdn.jsdelivr.net`, com SRI `sha384`; o modelo é conferido por SHA-256 antes do uso.
- Reconhecimento do relatório: rodapé (data e páginas), cabeçalho (curso, currículo — a habilitação vem **do número do currículo**, porque o "Complemento" das páginas da grade é sempre o mesmo, defeito do relatório), cabeçalho da tabela (posição das colunas), seções (Obrigatórias/Eletivas/Livres), linhas de disciplina (`CÓDIGO(VERSÃO) Nome… números`), Subtotal por período, Total por seção, requisitos abaixo da disciplina ("ou" entre dois requisitos = mesmo grupo), Informações Básicas nas últimas páginas.
- Correções de OCR: trocas de letras/dígitos desfeitas pela posição (`BIOO123` → `BIO0123`), algarismos romanos, lixo no fim do nome.

### 7.4 Conferência dos números do PDF (coerência aritmética)

Em ordem: (1) por linha, Tot. = Aula + Trab. e CH = 15 × Aula + 30 × Trab.; (2) soma do grupo = Subtotal (um valor ilegível pode ser recuperado pela diferença); (3) período igual no grupo (maioria clara); (4) consenso entre habilitações; (5) soma da seção = Total. Cada número fica **lido**, **corrigido** ou **conferir**.

**O que isso prova e o que não prova:** é **coerência aritmética**, não prova de cada leitura (dois erros podem se compensar). Por isso o sistema não chama esses números de "comprovados". No OCR, número sem coerência verificada **não é gravado** (vai em `naoConfirmados`). Nos campos que o CSV também tem, a prévia mostra a concordância com o CSV já gravado. EXT, versões sem segunda fonte e Informações Básicas passam por **revisão humana** (7.7).

### 7.5 O "pacote de importação"

O navegador transforma o arquivo num objeto JSON (`versaoPacote: 1`): origem, curso, currículos, disciplinas, vínculos (oferta), requisitos, avisos, resumo e conferência. O servidor revalida tudo (`validarPacote_`). Limites: 30 currículos, 3.000 disciplinas, 30.000 vínculos, 60.000 requisitos; arquivo até 40 MB.

### 7.6 Prévia, modos e bloqueios

**Modo de cada currículo:** CSV → **completo** (define oferta e requisitos das habilitações do arquivo); PDF de currículo que a base não tem → completo; PDF do mesmo currículo já em uso → **complemento** (acrescenta só o que o CSV não tem e **nunca** muda oferta, requisitos ou números já gravados; diferenças aparecem como "não serão aplicadas"). Habilitações fora do arquivo não são tocadas.

**Bloqueios** (a prévia mostra; a gravação é recusada): aviso de nível erro; base com outro curso; estrutura mais antiga que a da base; OCR em modo completo com número não confirmado (orientação: importe o CSV primeiro).

**Regras gerais:** nome vindo do PDF nunca substitui nome já gravado; disciplina sem oferta vira "Fora da estrutura atual" (não é apagada); currículo novo para uma habilitação marca o antigo como "Não — substituído por… em…"; cada mudança vira uma linha em Alterações; cada importação, uma linha em Importações.

**Informações Básicas conferidas no servidor:** o servidor ignora o "conferido" do navegador e refaz as contas possíveis (subtotais, total, AAC, extensão, durações, cargas pela grade). Campo que participa de uma conta que falha **não é gravado** (todos os campos daquela conta ficam de fora).

**Prévia fiel:** a assinatura da prévia é um SHA-256 do pacote limpo + versão da base + impressão das células mantidas pelo sistema + mudanças + decisões + lista de revisão. Se alguém editar à mão uma célula mantida pelo sistema depois da prévia, a confirmação é recusada (`PREVIA_DESATUALIZADA`, dizendo a aba). Observações e colunas extras podem ser editadas e são preservadas.

### 7.7 Revisão humana dos valores só do PDF

A prévia lista **todos** os valores que só o PDF traz e que vão ser gravados (EXT, versões sem segunda fonte, Informações Básicas), com valor anterior e **página do PDF**, em páginas de 100 (no topo, um resumo por tipo). Quando o PDF foi lido **por OCR**, a caixa "Conferi no PDF os N valores" só é liberada depois de abrir **todas** as páginas, e o servidor confere de novo: guarda no cache as páginas entregues e o **hash** do e-mail de quem gerou a prévia (o e-mail não vai para o cache); sem todas as páginas → `REVISAO_INCOMPLETA`. Limite honesto: o servidor sabe que cada página **chegou** ao navegador de quem confirma, não que foi lida. Capacidade: 7.000 valores; acima disso a importação é bloqueada (nunca cortada).

### 7.8 CSV e PDF juntos (1.4.2)

A janela aceita um CSV + um PDF de uma vez (o tipo do PDF é dado pelos bytes `%PDF`). Continuam **duas importações**: o CSV é conferido e gravado primeiro enquanto o PDF é lido em segundo plano no navegador; depois, "Continuar com o PDF" leva à conferência do PDF como complemento, ou "Ver a estrutura (sem o PDF)" para no CSV.

---

## 8. Gravação segura (manifesto, diário, recuperação)

### 8.1 O problema

O Google Sheets não tem transação entre abas, e `LockService` só impede duas execuções do script ao mesmo tempo (não desfaz escritas nem impede edições humanas). Uma falha no meio de uma importação poderia deixar a base meio antiga, meio nova.

### 8.2 A solução: ponto único de ativação (`Gravacao.gs`)

1. **Manifesto** (`estruturaCurricular.ativa`, JSON num metadado): IDs internos das 4 abas de dados em uso, versão da base, última importação, lista das importações **concluídas** e o texto da aba Sobre. Painel, prévia e confirmação leem as abas **pelo ID do manifesto** e o histórico filtrado pelas concluídas.
2. **Diário** (`estruturaCurricular.gravacao`): escrito antes de qualquer preparação; removido só quando tudo terminou.
3. **Preparação:** cada aba em uso é copiada para uma oculta `_nova_<aba>_<op>`; os dados novos vão só para a cópia; o histórico é acrescentado com o id da importação (invisível enquanto o id não estiver no manifesto).
4. **Conferência:** as cópias são relidas; as abas em uso são comparadas com a impressão digital lida no início (inclusive Observações e extras). Diferença → `EDICAO_DURANTE_GRAVACAO`, nada muda.
5. **Ativação:** **uma** escrita do manifesto novo.
6. **Arrumação** (idempotente, passo a passo): renomeia/mostra as novas, transforma as anteriores em `_anterior_<aba>`, oculta auxiliares, ordena, protege, reescreve a aba Sobre. O diário só sai se tudo deu certo e as abas visíveis conferem com o manifesto; senão fica com `fase: "arrumacao_pendente"`.

### 8.3 Respostas possíveis

| Onde falhou | Resultado | Resposta |
|---|---|---|
| antes da ativação | versão anterior intacta | `NAO_GRAVADA` |
| na ativação, e a releitura não consegue saber | incerto | `RESULTADO_INCERTO` → botão "Verificar" (`verificarImportacao`) |
| depois da ativação (arrumação) | concluída; todos já veem a nova pelo ID | ok, com pendências; alerta "a planilha ainda não mostra a versão em uso" enquanto a divergência for grave |

**Recuperação** (`recuperarGravacao_`, sob a trava): no início de toda prévia/confirmação e quando um **administrador** abre o painel com diário ou divergência. Usa o manifesto como verdade: descarta restos de importação não concluída, termina arrumação de importação concluída, apaga histórico órfão. Leitores não recuperam; sempre veem a última versão concluída.

**Leitura consistente:** painel e prévia leem sem a trava; leem o manifesto, os dados pelos IDs dele e relêem o manifesto; se mudou, repetem (até 3 vezes; depois `BASE_EM_ATUALIZACAO`). Nunca mostram dados de versões diferentes misturados.

**Idempotência:** a prévia devolve uma `operacao` (UUID); confirmar duas vezes a mesma operação devolve `jaGravada`. Id da importação: `IMP-aaaammdd-hhmmss-<8 hex>`.

---

## 9. O painel: consulta da estrutura

- **Lista** com busca por código ou nome (sem acento/maiúsculas; várias palavras = todas).
- **Filtros de oferta** (habilitação, obrigatoriedade, período ideal — inclusive "Ímpares"/"Pares" —, "com requisito") valem **juntos na mesma habilitação** (ex.: "Bacharelado + Obrigatória + Ímpares").
- **Filtros da disciplina:** departamento, créditos-aula, situação, CE/EXT/CP, "tipo ou período diferente entre habilitações", **semestre de oferecimento** (da disciplina: ajustado ou calculado).
- **Ordenação** por código, nome, período ideal ou créditos.
- **Baixar lista (CSV)**: exatamente o filtrado; UTF-8 com BOM, `;`, proteção contra fórmula.
- **Ficha da disciplina**: resumo em linguagem simples, créditos e cargas, "Onde aparece" (habilitação, tipo, período, semestre), requisitos por habilitação ("Basta um destes" / "e também", com navegação), "É requisito para", Observações, histórico.
- **Currículos** (um cartão por habilitação em uso + estruturas anteriores) e **Importações** (um cartão por importação).
- **Selos** em balão: tipo (verde = obrigatória, azul = eletiva, rosa = livre — a mesma convenção de cores da grade horária com as secretarias), "Excluída", "Ajustada", "Para outros cursos", "✓ Adicionada à Grade Horária". O texto sempre diz o estado (nunca só a cor).
- **Leitor** vê a estrutura já com os ajustes e sem as excluídas; não vê etapas, caixas de seleção nem o e-mail de quem importou/alterou.
- **Seções** (1.7.0): no topo, "Estrutura curricular" e "Auditoria da grade" (seção 14).

---

## 10. Preparação da grade horária (etapas 1 a 4)

Só administradores veem as etapas. O servidor confere o perfil, os campos e a existência da disciplina em toda chamada.

### 10.1 Conceitos que causaram confusão e foram fixados (1.3.2)

- **Período ideal** (ou semestre ideal): semestre **do curso** em que a disciplina deve ser cursada, 1º a 10º. Pode variar entre habilitações.
- **Semestre de oferecimento** ("disciplina de semestre" na ficha): semestre **do ano** em que a disciplina é oferecida — 1º, 2º ou os dois. Calculado pelo período ideal (ímpar = 1º semestre do ano; par = 2º; "1º e 2º" quando varia entre habilitações) e **ajustável** no painel (ex.: prática oferecida nos dois semestres). Nas disciplinas para outros cursos (sem período), é informado na ficha. **Sem semestre de oferecimento, a disciplina não entra na grade.**

### 10.2 Etapa 1 — Estrutura curricular

- A ficha abre editável: código, nome, departamento, créditos, CH, CE, CP, EXT, ATPA, versão, disciplina de semestre ("Automático — pelo período" ou 1º/2º/1º e 2º) e, em "Onde aparece", tipo e período em cada habilitação ("— não faz parte —" tira da habilitação).
- "Salvar" só ativa quando algo mudou. O servidor compara com o Júpiter e guarda em "Ajustes manuais" **só os campos diferentes**; tudo igual de novo → a linha do ajuste é removida ("Voltar aos dados do Júpiter").
- Validação: código `AAA9999` ou `9999999`, **único** entre todas as disciplinas (inclusive excluídas e de outros cursos) — `CODIGO_REPETIDO`; nome obrigatório; inteiros 0–9999; período 1–20.- A CH não é recalculada sozinha (há disciplinas em que o Júpiter registra outra carga); a ficha avisa "pelos créditos seriam N h".
- **Observações**: até 2.000 caracteres; ficam na coluna Observações da aba Disciplinas (estrutura) ou na própria aba (outros cursos). Na grade, vão depois do nome com travessão.
- **Excluir** (ficha ou em lote) não apaga: marca "Excluída = Sim"; some das listas e sai da grade; dá para restaurar.
- Limites: requisitos não são editáveis; campo vazio = "usar o Júpiter"; duas pessoas salvando a mesma disciplina → vale a última.

### 10.3 Etapa 2 — Disciplinas para outros cursos

Disciplinas que o IP ministra para outras unidades (ex.: PST0391 para a FEA).

- **Lista de disciplinas por unidade** do Júpiter, **em CSV** (o PDF desse relatório é imagem e só acrescentaria a versão; o painel recusa com explicação). Decodificado no navegador, enviado como texto; o servidor exige as colunas Disciplina, Nome e Ativação, recusa o CSV da "Grade Curricular", aceita até 5.000 linhas / 2 MB.
- A prévia mostra **só os códigos ainda não usados** (efetivos da estrutura, inclusive ajustados, excluídos e fora da estrutura, e os de outros cursos). Todas vêm marcadas; a pessoa desmarca. A inclusão confere a assinatura da prévia (`PREVIA_DESATUALIZADA`) e grava numa escrita. CH = 15 × aula + 30 × trabalho.
- **Cadastro manual**: código e nome obrigatórios; disciplina de semestre, unidade/curso atendidos, ativação/desativação e Observações opcionais.
- Disciplinas incluídas entram **fora** da grade (o envio é na etapa 3).

### 10.4 Etapa 3 — Lista para a grade horária

- Estrutura + outros cursos, sem excluídas; filtros da etapa 1 + Origem e Grade horária (adicionadas/não adicionadas).
- As caixas **só escolhem** (estado da página, sem chamar o servidor); **"Enviar para a Grade Horária"** grava a marca "Adicionada à grade horária" de uma vez (`adicionarAGrade`). As já adicionadas aparecem marcadas e travadas, com o rótulo "✓ Adicionada à Grade Horária".
- Só entram as que têm semestre de oferecimento em vigor; as outras continuam escolhidas e a barra lista os códigos. O servidor confere de novo.
- **Na ficha**, "Adicionar à Grade Horária" fica ativo com o semestre de oferecimento definido. Com alterações por salvar, **uma só chamada** salva e marca na mesma escrita (1.4.3, `salvarDisciplina` com `adicionarAGrade: true`); o andamento aparece no próprio botão.

### 10.5 Etapa 4 — Prévia da grade horária

- No topo, o **semestre da grade** (1º ímpar / 2º par; padrão = próximo semestre) e o **ano** (ex.: 2027/1). A prévia mostra só as disciplinas adicionadas e não excluídas cujo semestre de oferecimento é o escolhido ou os dois.
- Seis abas, como a planilha das secretarias: **PSA, PSC, PSE, PST** (três primeiros caracteres do código em uso), **Interdepartamentais** (código começando por 470) e **Outras Unidades** (qualquer outro).
- Colunas: Código, Nome, Semestre ideal por habilitação ("Psicólogo 7º · Bacharelado 8º"; "—" em outros cursos), Observações.
- "Remover da grade" por caixa, "Selecionar todas" ou pela ficha.
- **"Enviar Grade para Preenchimento"** (seção 11).

### 10.6 Cadastrar nova grade (1.4.0)

Botão no topo (só admin): **apaga a planilha-base inteira** (estrutura, histórico, ajustes, observações, outros cursos, grade em preparação) e a recria vazia, **sem cópia de segurança** (decisão do Serviço de Graduação). Confirmação digitando **APAGAR** (o servidor confere). Roda sob a trava. É **retomável**: grava `estruturaCurricular.recomeco` antes e só remove no fim; se falhar, o próximo administrador que abrir o painel termina. "Carregar grade antiga" aparece desativado.

---

## 11. Enviar Grade para Preenchimento

Implementado em `EnvioGrade.gs` (1.5.0; ajustes até a 1.6.3).

### 11.1 Regras de conteúdo (decididas pelo Serviço de Graduação)

- **O que vai:** exatamente as disciplinas da prévia do semestre escolhido, cada aba para a aba de mesmo nome na planilha das secretarias.
- **Uma linha por disciplina**, mesmo que ela apareça em mais de uma habilitação: as habilitações são simultâneas e o aluno cursa a disciplina uma vez só.
- **Tipo e semestre ideal quando as habilitações divergem:** valem os do **Psicólogo**; se a disciplina não está no Psicólogo, os do **Bacharelado**; depois os da **Licenciatura** (habilitação de menor código entre os currículos em uso: 0, 100, 200). Oferta ajustada no painel vale. Ex.: 4701784 (Obrigatória no 7º no Bacharelado, Eletiva no 9º no Psicólogo) → Eletiva, 9.
- **Disciplinas para outros cursos:** Tipo (E) e Semestre Ideal (I) **em branco**; ficam no fim da aba.
- **Ordem:** Obrigatórias, Eletivas, Livres, depois sem tipo; dentro de cada bloco, semestre ideal e código.
- **Colunas gravadas** (linha 4 em diante):

| Coluna | Título | Valor |
|---|---|---|
| C | Código | código em uso (ajustado, se houver) |
| D | Nome | nome em uso; com observação: `Nome – Observações` |
| E | Tipo | `Obrigatória`, `Eletiva` ou `Livre` (os rótulos que a formatação e as validações da planilha esperam) |
| I | Semestre Ideal | só o número (1–10) |
| J | Créditos Aula | créditos-aula em uso |
| M | Horário de Fim | **fórmula** (11.3) |

- **O que é apagado:** o conteúdo de **B4:S999** das 6 abas (inclusive o que as secretarias já tinham preenchido — fica na cópia), as notas da coluna K (avisos de conflito) e a lista suspensa da coluna M. Formatação, caixas de seleção e listas suspensas das demais colunas ficam. Colunas das práticas (T em diante), linhas 1–3 e da 1000 em diante, e as abas Informações, DataBase e a oculta "Disciplinas" não mudam.
- **Nome novo do arquivo:** `Grade Horária - {1|2}º semestre de {ano}`.
- **Aulas divididas em dois dias:** linha extra feita à mão, com os créditos divididos. Ela some num reenvio — por isso deve ser feita depois do envio definitivo.

### 11.2 Ordem das operações (tudo o que pode recusar vem antes de mudar algo)

Sob a trava do sistema:

1. Monta as linhas no servidor e compara as contagens com as que a pessoa viu na tela (`esperado`); diferente → `PREVIA_DESATUALIZADA`. Grade vazia → `GRADE_VAZIA`; mais de 996 linhas numa aba → `GRADE_GRANDE_DEMAIS`.
2. Abre a planilha das secretarias e confere as 6 abas e o cabeçalho da linha 3 (C, D, E, I, J); abre o índice (confere A1 Semestre, B1 ID, C1 Auditoria_ID), a pasta das cópias e a pasta das auditorias; se o índice aponta uma auditoria para o semestre novo que não abre, recusa aqui. Lê o **semestre do nome atual** do arquivo (regex `([12])º semestre de (\d{4})`, sem diferença de maiúsculas); sem semestre → `NOME_SEM_SEMESTRE`.
3. **Cópia de segurança:** `DriveApp.makeCopy(nome atual + " (cópia de dd/mm/aaaa hh:mm)", pasta das cópias)` — o arquivo inteiro, como estava. Falha → `BACKUP_FALHOU`, nada mudou.
4. **Índice:** registra a cópia na coluna B da linha do **semestre do nome atual** (a primeira daquele semestre com B vazia; senão, linha nova). Falha → `BACKUP_FALHOU` (a cópia fica na pasta; a grade não muda).
5. **Auditoria do semestre novo:** reaproveita a do índice ou cria uma na pasta das auditorias e registra o ID na coluna C (seção 13). Falha → `AUDITORIA_FALHOU` (nada apagado).
6. Apaga B4:S999 das 6 abas, grava C:E e I:J, grava a fórmula em M.
7. Renomeia o arquivo.
8. Confere a coluna M (11.3), anota o evento "Envio da grade" na auditoria nova (e "Grade encerrada" na anterior, se o semestre mudou) e verifica se os acionadores da auditoria estão instalados (senão, aviso no resultado).

Falha em 6–7 → `ENVIO_INCOMPLETO`, com o nome da cópia e o detalhe técnico (sem IDs); um novo envio refaz tudo (e faz outra cópia). **Cada envio = uma cópia e uma linha no índice.**

A tela de confirmação mostra o número de disciplinas por aba, o aviso de que o preenchido sai da planilha e o nome novo. O resultado mostra as contagens, o nome novo, o link da cópia de segurança, a auditoria (criada ou reaproveitada) e avisos.

### 11.3 A fórmula do Horário de Fim (coluna M)

Decisão (1.6.0): o horário de fim **não é digitado**; é calculado pelo início (L) + créditos-aula (J), com **1 crédito = 1 hora**, e a coluna M fica protegida.

Fórmula gravada (linha *n*, planilha em português do Brasil):

```text
=IF(Ln="";"";IF(ISERROR(IF(ISNUMBER(Ln);Ln;TIMEVALUE(Ln)));Ln;IF(Jn="";"";TEXT(IF(ISNUMBER(Ln);Ln;TIMEVALUE(Ln))+Jn/24;"HH:mm"))))
```

- Sem início → vazio. Início que não é horário ("-- : --" das práticas, "Não será oferecida") → repete o texto de L. Sem créditos → vazio.
- Aceita o início como **hora** (número) ou como **texto "08:00"** (as listas suspensas da Tabela entregam texto).
- Devolve **texto "HH:mm"**, porque a coluna "Horário de Fim" da Tabela é do tipo Texto.
- **Separador pela localidade** (`separadorDaPlanilha_`, lê `getSpreadsheetLocale()`): `;` em pt_BR e nas localidades de vírgula decimal; `,` nas demais; `;` se a leitura falhar. Depois de gravar, o envio lê M (`celulasDoFimComErro_`); se houver erro, regrava **uma vez** com o outro separador e fica com a versão com menos erros; se ainda houver erro, avisa no resultado ("A coluna Horário de Fim (M) mostra erro em N linha(s) (PSA linha 4, …)").
- **Sem `setNumberFormat`**: as abas são **Tabelas** do Google Sheets com colunas tipadas, e o Google recusa mudar o formato de uma coluna com tipo.

Os três ajustes (1.6.1, 1.6.2, 1.6.3) vieram de falhas reais; ver seção 20.

### 11.4 Diagnóstico

`diagnosticarEnvioGrade()` (editor, admin): só lê; mostra o nome da planilha das secretarias, o semestre no nome, as abas conferidas, o índice (nº de cópias), a pasta das cópias, a pasta das auditorias, se o índice tem Auditoria_ID, a localidade da planilha (e o separador que será usado) e se os acionadores de edição e abertura estão ativos. Não mostra IDs. Serve também para disparar a autorização do Drive.

---

## 12. A planilha das secretarias

### 12.1 Estrutura

Arquivo "Grade Horária - 1º semestre de 2027" (o nome muda a cada envio). Abas: Informações, **PSA, PSC, PSE, PST, Interdepartamentais, Outras Unidades**, DataBase e uma oculta "Disciplinas" (uso antigo). Nas 6 abas de disciplinas, linha 3 = cabeçalho; dados da linha 4 em diante. As abas são **Tabelas** do Sheets (colunas tipadas, listas suspensas como "chips").

Colunas (B a S): B Cadastro (caixa do Serviço de Graduação), C Código, D Nome, E Tipo, F Modalidade, G **Será oferecida** (SIM/NÃO), H Docente(s) ministrante(s), I Semestre Ideal, J Créditos Aula, K Dia da semana, L Horário de Início, M Horário de Fim, N–Q Vagas (alunos do IP; livres USP/outras unidades; intercambistas; 60+), R Observações, S Sala. De T em diante, colunas das práticas (docente ministrante, turma, vagas por prática), que o sistema nunca toca.

**Recomendações de configuração:** coluna "Horário de Fim" com tipo **Texto** (ou sem tipo) e **sem** lista suspensa; M4:M999 protegida (só o Serviço de Graduação edita).

### 12.2 Histórico: a planilha era uma cópia

A planilha das secretarias usada pelo sistema é uma **cópia** da planilha antiga. A original mantém o link público já divulgado da grade visual e será reformulada depois para exibir a grade a partir desta. Na cópia, o Serviço de Graduação **apagou os 25 arquivos de script antigos** (menu, backup, registro de edições, preenchimento de abas, grade visual etc.), o acionador antigo `registrarEdicao`, a implantação de App da Web, as propriedades antigas e a aba oculta "Registro de Edições". O passo a passo está em `planilha-grade/README.md`.

### 12.3 O único código da planilha: `Validacoes.gs`

Gatilho **simples** `onEdit`: roda sozinho a cada edição, com as permissões de quem está editando, sem instalar nada. Por isso só escreve em células que a secretaria pode editar (K e L) e lê o resto. Atua só nas 6 abas, linha 4 em diante.

1. **Modalidade "Prática"** (coluna F) → Dia = "Horário Variável" e Início = "-- : --" (o fim acompanha pela fórmula).
2. **Conflito de horário:** ao mudar dia (K), início (L) ou modalidade (F) de uma disciplina **Eletiva ou Livre**, procura nas 6 abas uma **Obrigatória** do **mesmo semestre ideal**, no **mesmo dia**, com horário sobreposto (início + créditos × 60 minutos). Se achar, **apaga dia e início** da linha editada e põe uma **nota** na célula do dia (código, tipo, semestre, horários e a obrigatória em conflito, com a aba). Sem conflito, a nota antiga sai. Colagens com mais de 50 linhas não são verificadas linha a linha (limite de tempo do gatilho).
3. Horários aceitos: data/hora do Sheets, fração do dia ou texto "HH:mm".

**Correção importante (1.6.0):** o código antigo procurava os tipos "Obrigatórias", "Optativas Eletivas" e "Optativas Livres", mas a coluna E usa "Obrigatória", "Eletiva" e "Livre" — a verificação de conflitos **nunca disparava**. O código novo usa os nomes certos. A antiga "verificação de carga horária" saiu: o fim sempre bate com os créditos pela fórmula.

Regras de conflito adicionais (obrigatória × obrigatória, optativa × optativa etc.) **não** foram implementadas; ficariam para quando o Serviço de Graduação especificar.

---

## 13. Auditoria da grade (registro de edições e aberturas)

Implementada em `AuditoriaGrade.gs` (1.6.0; aberturas em 1.8.0). Atende ao pedido do Serviço de Graduação de "registrar tudo o que for relevante, pensando num futuro painel de auditoria" e de não perder o registro de quem preencheu o quê.

### 13.1 Lógica do backup e da auditoria (decidida pelo Serviço de Graduação)

- A planilha das secretarias é **fixa** (o mesmo arquivo, semestre após semestre); **a cópia é o backup** (não se inverteu a lógica de tornar a cópia a nova produção, porque compartilhamentos, proteções e o link mudariam).
- **Uma planilha de auditoria por semestre**, "Auditoria - Grade Horária - 1º semestre de 2027", na pasta da chave `AUDITORIA_GRADES_ANTERIORES`.
- **Índice** (`INDEX_GRADE_HORARIA_VERSOES_ANTERIORES`): A = Semestre, B = ID da cópia de segurança, C = Auditoria_ID. O ID da **auditoria** entra quando a grade nova é solta (envio); o ID da **cópia** entra quando a grade anterior termina (no envio seguinte, na linha do semestre que termina).
- **Reenvio do mesmo semestre** mantém a mesma auditoria; a cópia do reenvio vai na linha do semestre (a primeira com B vazia) ou numa linha nova.
- **Ninguém das secretarias acessa a auditoria**: ela é gravada por acionadores do Web App, com a autorização da conta do Serviço de Graduação.

### 13.2 Abas da planilha de auditoria

**Edições** — uma linha por célula editada (17 colunas):

| Coluna | Conteúdo |
|---|---|
| Data e hora | quando a edição foi salva (São Paulo) |
| Semestre | do nome da planilha das secretarias no momento da edição |
| Origem | `Secretaria` (edição na planilha) ou `Sistema` (envio, ativação, encerramento) |
| E-mail | `e.user` do evento; vazio → "(não identificado)". O Google só informa contas do mesmo domínio. **Não** usa `Session.getActiveUser` como reserva, para não atribuir a edição à conta errada |
| Aba, Célula, Linha, Coluna | onde |
| Campo | título da linha 3 da coluna |
| Código da disciplina, Disciplina | colunas C e D da mesma linha no momento da edição |
| Valor anterior, Valor novo | `e.oldValue` / `e.value`. Horário que chega como fração do dia vira "HH:mm" — com ponto ou com vírgula ("0,3333333333" → 08:00, 1.6.4) |
| Tipo de edição | Preencheu / Alterou / Apagou (uma célula); Colagem ou preenchimento (várias células: uma linha por célula, sem valor anterior); Resumo (colagem com mais de 300 células: uma linha só); eventos do sistema: Envio da grade, Grade encerrada, Auditoria ativada |
| Células no evento | tamanho da ação |
| Observação | detalhe dos eventos do sistema |
| ID do evento | agrupa as linhas de uma mesma ação |

**Aberturas** (1.8.0) — Data e hora, Semestre, E-mail: uma linha a cada vez que alguém com permissão de edição abre a planilha das secretarias no navegador.

**Sobre** — o que é cada coluna; aviso para não editar as abas de registro (são a fonte do painel).

Todo texto é gravado como texto (`textoSeguro_`): nada vira fórmula, número ou data.

### 13.3 Os acionadores

- **Edição:** `ScriptApp.newTrigger('registrarEdicaoGrade').forSpreadsheet(<planilha das secretarias>).onEdit()`.
- **Abertura** (1.8.0): `ScriptApp.newTrigger('registrarAberturaGrade').forSpreadsheet(<planilha das secretarias>).onOpen()`.
- São **instaláveis**, criados por `ativarAuditoriaGrade()` **neste projeto** (não na planilha das secretarias). Rodam no servidor do Google com a autorização de quem os ativou, **mesmo com o painel fechado**, e executam o código salvo mais recente do projeto. Não deixam a planilha das secretarias mais lenta.
- **Acionadores são por conta:** `ativarAuditoriaGrade` precisa ser executado pela **mesma conta que implantou o Web App** (é ela que o sistema consulta para saber se o registro está ativo).
- `registrarEdicaoGrade`: ignora eventos inventados (precisa de um Range de verdade), edições de outras planilhas e semestres sem auditoria (avisa no registro de execução); descobre o semestre pelo **nome** da planilha; grava sob a trava do sistema (até 45 s) ou, sem ela, por `appendRow` (atômico).
- `registrarAberturaGrade`: ignora eventos inventados e outras planilhas; grava data, semestre e e-mail na aba Aberturas (criando a aba se não existir).
- **Não são registrados:** alterações feitas por scripts (o próprio envio e as validações de `Validacoes.gs`) e mudanças só de formato. Por isso o envio anota o próprio evento.
- **Limites do Google:** e-mail só de contas do mesmo domínio; em colagens não vem o valor anterior; o acionador de abertura só dispara no **navegador** (não no aplicativo do celular) e para quem tem permissão de **edição**.

### 13.4 Ativação

`ativarAuditoriaGrade()` (editor, admin, pode ser repetida sem duplicar):

1. lê o semestre do nome da planilha das secretarias;
2. cria (ou reaproveita) a auditoria desse semestre e registra no índice;
3. remove acionadores da auditoria que apontem para outra planilha;
4. instala o acionador de edição e o de abertura, se faltarem;
5. garante a aba Aberturas;
6. anota "Auditoria ativada" na auditoria.

O registro de execução mostra um resumo sem IDs (ex.: `"acionador":"instalado agora"`, `"acionadorAbertura":"instalado agora"`). `auditoriaAtiva_` só é verdadeiro com **os dois** acionadores; enquanto isso, o envio avisa. `desativarAuditoriaGrade()` remove os dois (as auditorias ficam).

---

## 14. Painel da auditoria (Comissão de Graduação)

Implementado em `AuditoriaPainel.gs` (servidor) e `PainelAuditoria.html` (navegador), versões 1.7.0 e 1.8.0.

### 14.1 Quem vê e como

- Seção **"Auditoria da grade"** no topo do mesmo Web App, ao lado de "Estrutura curricular", para **administradores e leitores**. O presidente da Comissão de Graduação tem perfil LEITOR.- **Só leitura.** Nada é gravado. **Nenhum ID nem link de planilha** vai ao navegador (1.8.0: o link para a planilha de auditoria foi retirado, inclusive para administradores, porque "não faz sentido um painel para a pessoa ver os dados crus" e para ninguém pedir permissão de edição).
- A auditoria só é pedida ao servidor na primeira vez que a seção é aberta, ao trocar a grade e no botão "Atualizar".

### 14.2 Servidor: `obterAuditoriaGrade({semestre})`

1. Abre a planilha das secretarias → nome → **semestre atual** ("em preenchimento").
2. Abre o índice → lista de semestres que têm Auditoria_ID (formato AAAA/S), da mais nova para a mais antiga (o atual entra mesmo sem auditoria).
3. Abre a auditoria do semestre pedido (padrão: o atual):
   - **Edições:** as últimas 5.000 linhas, da mais recente para a mais antiga, como texto (data formatada no servidor em `dd/MM/yyyy HH:mm:ss`);
   - **edições por pessoa** (origem Secretaria), contadas em **todas** as linhas;
   - **aberturas por pessoa** (aba Aberturas; `null` se a auditoria não tem a aba).
4. **Só para o semestre atual**, lê as colunas C a M das 6 abas da planilha das secretarias (linha 4 em diante, linhas com código): código, nome, tipo, modalidade, será oferecida, docente, semestre ideal, créditos, dia, início, fim.

Erros: `SEMESTRE_INVALIDO` (semestre sem auditoria), `SEM_AUDITORIA` (nenhuma grade enviada), `AUDITORIA_INACESSIVEL` (planilha do índice não abre), `SEM_ACESSO`.

### 14.3 O que a tela mostra (ordem atual)

(1.12.0) Abaixo do topo, três cartões (**Preenchimento**, **Quem edita**, **Edições**) com os números principais; cada um abre e fecha o seu painel. Preenchimento contém os itens 2 e 3; Quem edita, o item 4; Edições, o item 5. Abaixo, o **Panorama da grade** com mais quatro cartões: Mapa da semana (aulas por dia × hora), Ritmo (edições por dia), Por departamento (abas comparadas pela média dos três campos) e Sem movimento (sem edição nem campo preenchido); ver REGRAS 8.10.

1. **Topo:** título, lista **Grade** (grade em preenchimento + anteriores; travada quando só há uma), botão **Atualizar**, hora da última atualização.
2. **Não serão oferecidas** (1.8.0; só na grade em preenchimento): toda disciplina com "Será oferecida" = **NÃO** (com ou sem acento, maiúsculas ou não), com aba, **quem marcou e quando** (edição mais recente de "Será oferecida" com NÃO para aquele código, pela auditoria) e o selo **"Aguardando Justificativa"**. O departamento deve informar à Comissão de Graduação o motivo de não oferecer a disciplina naquele semestre; a justificativa chega **fora da planilha** (e-mail, ofício), e o painel **não** marca como recebida — o selo some só se a disciplina deixar de estar "NÃO".
3. **Preenchimento** (só na grade em preenchimento): um cartão por aba com o total de disciplinas e quantas têm **"Será oferecida"** (G) preenchida, **Docente** (H) preenchido e **Dia e horário** (K e L) preenchidos, com barras; aviso "N não serão oferecidas — aguardando justificativa" no cartão. São **contagens por campo**, sem uma regra de "linha completa" (essa regra não foi definida). Clicando no cartão, a **tabela da aba**: disciplina (código, nome, tipo, semestre ideal, modalidade), será oferecida (com o selo quando NÃO), docente, dia e horário (início – fim), última edição de secretaria (data e e-mail) e o botão "Histórico".
4. **Quem mais abre e quem mais edita** (1.8.0): dois gráficos de barras horizontais — **"Quem mais abre a planilha"** (aberturas por e-mail) e **"Quem mais edita"** (edições das secretarias por e-mail) —, do maior para o menor, as 10 primeiras pessoas (o resto: "e mais N pessoas"), com o número e a data da última vez. (1.12.0) Clicar no nome abre Edições filtrada pela pessoa; clicar no setor/vínculo, filtrada pelo vínculo. Substituíram a tabela "Quem editou" da 1.7.0.
5. **Edições:** linha do tempo, da mais recente para a mais antiga, 50 por vez ("Mostrar mais"); busca sem acento (código, disciplina, docente, campo, e-mail, valores) e filtros por aba, pessoa, vínculo (1.12.0) e origem (secretarias/sistema); colunas Quando, Quem, Onde (aba · célula), Disciplina (link para o histórico), Campo (e tipo de edição) e Mudança (antes riscado → depois em negrito; "(apagado)"). Aviso quando há mais de 5.000 edições.
6. **Histórico da disciplina:** janela com todas as edições daquele código, da mais recente para a mais antiga. Fecha só pelos botões (ESC e clique fora não fecham, como todas as janelas do sistema).

### 14.4 Grades anteriores

Escolhendo uma grade anterior na lista: aparecem as edições, os gráficos (o de aberturas fica vazio em auditorias anteriores à 1.8.0) e o histórico; **não** aparecem o preenchimento nem a lista "Não serão oferecidas", porque a planilha das secretarias já foi limpa para a grade seguinte — a situação final de cada grade fica na **cópia de segurança** (ideia futura: ler a cópia indicada na coluna B do índice para mostrar o preenchimento final).

### 14.5 Gráficos: escolhas de desenho

Barras horizontais de **uma série**, na cor primária do tema (contraste ≥ 3:1 com o cartão, conferido nos testes nos dois temas), ponta arredondada de 4 px, rótulos e valores em cor de texto (nunca na cor da barra), lista ordenada lida como texto por leitores de tela, detalhe no `title`; em modo de alto contraste do sistema, a barra usa a cor do texto. Feitos em HTML/CSS, sem biblioteca externa.

---

## 15. Ciclo de um semestre, passo a passo

Exemplo: preparar a grade do **1º semestre de 2027** quando a planilha das secretarias ainda se chama "Grade Horária - 2º semestre de 2026".

1. **Importar** o CSV (e, se quiser, o PDF) da "Grade Curricular" do Júpiter. Conferir a prévia e gravar.
2. **Etapa 1:** corrigir o que precisar (ex.: semestre de oferecimento de uma prática para "1º e 2º"), escrever Observações, excluir o que não vai para a grade.
3. **Etapa 2:** importar a "Lista de disciplinas por unidade" (CSV) e/ou cadastrar disciplinas para outros cursos, informando a disciplina de semestre.
4. **Etapa 3:** escolher as disciplinas e "Enviar para a Grade Horária".
5. **Etapa 4:** escolher "1º semestre (ímpar)" e 2027; conferir a prévia por aba.
6. **"Enviar Grade para Preenchimento"**:
   - cópia "Grade Horária - 2º semestre de 2026 (cópia de dd/mm/aaaa hh:mm)" na pasta das cópias; índice: linha **2026/2** recebe o ID da cópia (coluna B);
   - auditoria "Auditoria - Grade Horária - 1º semestre de 2027" criada; índice: linha **2027/1** recebe o Auditoria_ID (coluna C);
   - planilha das secretarias limpa e regravada; renomeada para "Grade Horária - 1º semestre de 2027";
   - auditoria de 2026/2 recebe "Grade encerrada"; a de 2027/1, "Envio da grade".
7. (Primeira vez, ou depois da 1.8.0) **`ativarAuditoriaGrade`** no editor, com a conta do Web App.
8. **Secretarias preenchem.** `Validacoes.gs` cuida da modalidade Prática e dos conflitos; a fórmula calcula o fim; cada edição e cada abertura vão para a auditoria de 2027/1 (o semestre vem do nome do arquivo).
9. **Comissão de Graduação acompanha** pelo painel: não oferecidas, preenchimento por aba, quem abre/edita, edições.
10. **Correções:** reenviar 2027/1 é permitido (nova cópia, mesma auditoria), mas apaga o que as secretarias já preencheram e as linhas extras feitas à mão.
11. **Próximo semestre:** ao enviar 2027/2, a linha 2027/1 do índice recebe a cópia final e a auditoria de 2027/1 recebe "Grade encerrada"; nasce a auditoria de 2027/2. Os acionadores continuam valendo.

---

## 16. Segurança, dados pessoais e registros

### 16.1 Princípios aplicados no código

- Autorização no servidor em toda função pública; navegador nunca é confiável.
- **Nenhum ID** no código, no HTML, nas mensagens de erro ou nos registros de execução; o painel não recebe IDs (exceção: o link da cópia de segurança no resultado do envio, só para administradores).
- Todo texto vindo da base é escapado antes de ir ao HTML.
- CSV baixado com proteção contra fórmula (apóstrofo antes de `=`, `+`, `-`, `@`).
- Textos gravados nas planilhas pelo sistema passam por `textoSeguro_` (nada vira fórmula).
- **Registros de execução sem e-mail, sem conteúdo e sem IDs** (IDs longos são mascarados como `[…]` nos detalhes técnicos).
- E-mail de quem importou/alterou só vai ao painel de administradores.
- A lista de revisão guarda só o **hash** do e-mail de quem gerou a prévia.

### 16.2 Dados pessoais tratados

| Dado | Onde | Quem vê |
|---|---|---|
| e-mail de quem importou | aba Importações / Sobre | administradores |
| e-mail de quem alterou (painel) | colunas "Alterado por" | administradores (planilha) |
| permissões (N. USP, nome, e-mail, perfil) | planilha `PERMISSOES_DE_ACESSO` (o sistema só lê) | quem edita essa planilha |
| conteúdo preenchido pelas secretarias (docentes, horários, vagas, salas) | planilha das secretarias e **cópias de segurança** | Serviço de Graduação; painel da auditoria (admin e leitor) |
| **e-mail de quem editou**, data/hora, valor anterior/novo | auditoria, aba Edições | painel (admin e leitor) |
| **e-mail de quem abriu**, data/hora (1.8.0) | auditoria, aba Aberturas | painel (admin e leitor), em contagens |

### 16.3 Pontos "A VALIDAR INSTITUCIONALMENTE"

- base legal e finalidade dos registros (edições e aberturas) e do acesso de leitores (Comissão de Graduação) aos e-mails das secretarias;
- **retenção** das importações, alterações, cópias de segurança e planilhas de auditoria;
- **comunicação às secretarias** de que edições e aberturas são registradas;
- quem pode editar as planilhas (compartilhamento **Restrito** recomendado para a base, as pastas das cópias e das auditorias e a planilha de permissões);
- periodicidade de revisão das permissões.

---

## 17. Interface, tema e acessibilidade

- Identidade GRADIP; tema **Sistema** por padrão, com escolha claro/escuro guardada no navegador.
- Testado em 360, 390, 480, 768 e 1280 px, nos dois temas, **sem rolagem horizontal**; tabelas viram cartões com rótulos no celular.
- Contraste medido: texto ≥ 4,5:1; bordas e elementos gráficos ≥ 3:1.
- Janelas com foco preso, retorno do foco e bloqueio da rolagem; **nenhuma janela fecha por ESC ou clique fora** (1.2.2), só pelos botões — decisão para não perder um arquivo lido ou dados em preenchimento por um clique acidental.
- Abas e etapas com setas, Home e End; alvos de toque de ~44 px; estados sempre também em texto.
- Tela de carregamento com logo animado (desligado para quem pede menos movimento).

---

## 18. Testes e homologação

### 18.1 Testes locais (pasta `testes/`)

- **Simulador** das APIs do Apps Script (`mockGoogle.js`): planilhas em memória, Propriedades, Cache, Lock, Session, DriveApp, ScriptApp (acionadores de edição e abertura), localidade (pt_BR lê fórmulas com ";"), colunas tipadas de Tabela (recusam `setNumberFormat`), listas suspensas que recusam valores, falhas injetadas em qualquer escrita, reinício do contexto e relógio congelado. Cria a planilha de permissões fictícia.
- **Chromium real** (Playwright) para a interface, com o backend rodando no simulador.
- Arquivos reais do Júpiter (CSV, PDF sem texto lido por OCR real, lista por unidade) como entrada; **planilhas das secretarias, de permissões e e-mails são fictícios** (`.example`).
- `rodar_suites.sh` roda tudo de uma vez e grava logs com a impressão digital (SHA-256) de cada arquivo de fonte e teste.

Resultado da 1.8.0 (04/10/2026), todas verdes, nenhum teste pulado:

| Suíte | Testes | Cobre |
|---|---|---|
| `testar_backend.js` | 42 | acesso (planilha de permissões), criação das abas, importação CSV/PDF, regras, segurança |
| `testar_gravacao.js` | 57 | falhas injetadas antes/na/depois da ativação, arrumação, recuperação, revisão paginada, leitura concorrente, migração |
| `testar_preparacao.js` | 34 | ajustes, exclusões, outros cursos, lista por unidade, grade, nova grade, migrações de esquema |
| `testar_envio_grade.js` | 31 | envio completo, regras (Psicólogo, outros cursos, ordem), recusas sem mudar nada, falha no meio, fórmula (avaliada), Tabela tipada, localidade/separador |
| `testar_auditoria_grade.js` | 19 | criação/reaproveitamento da auditoria, índice, ativação (2 acionadores), registro de edições e aberturas, `Validacoes.gs` |
| `testar_painel_auditoria.js` | 19 | `obterAuditoriaGrade` (leitor/admin, sem IDs/links), não oferecidas, gráficos, grades anteriores, interface e visual (360–1280 px, dois temas, contraste) |
| `testar_navegador.js` | 19 | fluxo completo na interface, OCR real no navegador, revisão de 1.102 valores |
| `testar_navegador_preparacao.js` | 25 | etapas 1–4 e envio na interface |
| `testar_visual.js` | 24 | larguras, temas, contraste, foco |
| `testar_pdf_texto.js`, `testar_dois_arquivos.js` | OK / 7 | PDF com texto; CSV + PDF juntos |

### 18.2 O que os testes locais **não** provam

Comportamento real do Sheets numa falha parcial, `Session.getActiveUser`, permissões, cotas e tempos reais; acionadores instaláveis reais (se `e.user` traz o e-mail, cotas diárias); cálculo real da fórmula pelo Google (no simulador ela foi conferida por um avaliador mínimo); rede da USP para as bibliotecas do PDF; exatidão das leituras de OCR sem segunda fonte. Por isso existe o **roteiro de homologação no `/exec`** (`docs/HOMOLOGACAO.md`, passos 1–67).

---

## 19. Histórico de versões e decisões

| Versão | Data (2026) | O que entrou | Decisões e motivos |
|---|---|---|---|
| 1.0.0 | 27/09 | importação CSV/PDF (texto e OCR), 7 abas, painel, tema GRADIP | CSV como fonte principal; leitura no navegador |
| 1.1.0 | 27/09 | gravação por preparação + ativação + recuperação; prévia invalidada por edição manual; Informações Básicas conferidas no servidor; revisão humana do PDF | correções de uma auditoria externa: nunca deixar base parcial |
| 1.2.0–1.2.4 | 27/09 | pendência de arrumação detectável; revisão paginada completa; leitura consistente; janelas só fecham pelos botões; animação de carregamento; selos em balão com as cores da grade | segunda auditoria; pedidos de uso |
| 1.3.0 | 28/09 | preparação da grade: ficha editável, Ajustes manuais, exclusão, outros cursos, seleção; esquema 3 | ajustes **à parte** do Júpiter, sobrevivendo às importações |
| 1.3.1–1.3.2 | 29/09 | semestre do ano em outros cursos; seleção só na tela + gravação única; Ímpares/Pares; **período ideal × semestre de oferecimento** | terminologia corrigida a pedido do Serviço de Graduação |
| 1.4.0–1.4.3 | 30/09 | "Enviar para a Grade Horária"; etapa 4 (prévia por aba); Cadastrar nova grade (APAGAR, sem cópia); semestre/ano da grade; CSV+PDF juntos; salvar+adicionar numa chamada | nova grade sem backup (só grades finalizadas teriam cópia); menos chamadas ao servidor |
| 1.5.0–1.5.1 | 01/10 | **Enviar Grade para Preenchimento** com cópia de segurança e índice; mensagens de erro separando autorização do Drive × acesso à pasta | uma linha por disciplina; tipo/semestre pelo Psicólogo → Bacharelado → Licenciatura; outros cursos sem E/I; ordem tipo → semestre → código |
| 1.6.0 | 02/10 | **auditoria** por semestre (acionador de edição); cópia na linha do semestre que termina; **horário de fim por fórmula**; planilha das secretarias com só `Validacoes.gs` | planilha fixa + cópia como backup; auditoria fora do alcance das secretarias; grade visual sai da planilha |
| 1.6.1–1.6.3 | 03/10 | fórmula: tira a lista suspensa de M; sem `setNumberFormat` (Tabela tipada); resultado em texto; **separador pela localidade** | três falhas reais (seção 20) |
| 1.6.4 | 03/10 | horário com vírgula na auditoria ("0,333…" → 08:00); manifesto do README atualizado | falha real (seção 20) |
| 1.7.0 | 04/10 | **painel da auditoria**; **acesso pela planilha de permissões** (ADMINISTRADOR/LEITOR) | painel dentro do app; Comissão de Graduação como LEITOR, vendo estrutura + auditoria |
| 1.8.0 | 04/10 | gráficos de **aberturas** (novo acionador) e de **edições**; **"Não serão oferecidas — Aguardando Justificativa"**; **sem link** para a planilha de auditoria | justificativa por fora (só o aviso); nada de dados crus |

---

## 20. Incidentes reais e o que se aprendeu

| Quando | Sintoma | Causa | Correção |
|---|---|---|---|
| 01/10 (1.5.0) | "Não foi possível abrir a pasta das cópias", com o ID certo | o projeto não tinha a **autorização do Drive**: implantar não pede autorizações novas | 1.5.1 separa `AUTORIZACAO_DRIVE` de falta de acesso; executar `diagnosticarEnvioGrade` no editor |
| 03/10 (1.6.0) | envio parou depois da aba PSA (`ENVIO_INCOMPLETO`) | a coluna M tinha **lista suspensa** que recusa valores — o Google aplica a recusa também a scripts — e recusou a fórmula | 1.6.1 retira a lista de M antes de gravar; a mensagem passa a trazer o detalhe técnico |
| 03/10 (1.6.1) | "Não é possível definir o formato de número das células em uma coluna com tipo" | as abas são **Tabelas** com colunas tipadas; `setNumberFormat` é proibido nelas | 1.6.2 não muda o formato; fórmula devolve texto "HH:mm"; envio confere M e avisa |
| 03/10 (1.6.2) | envio concluído, mas M com "Erro de análise de fórmula" em todas as linhas | a planilha está em **português do Brasil** e o Google lê a fórmula gravada pelo script com o **separador da localidade** (";"); a fórmula ia com "," (indício: o código antigo da própria planilha gravava `HYPERLINK(…; …)`) | 1.6.3 escolhe o separador pela localidade e, se der erro, tenta o outro |
| 03/10 (1.6.3) | auditoria sem as edições | `ativarAuditoriaGrade` não tinha sido executado (não havia a linha "Auditoria ativada") | executado no editor com a conta do Web App; aviso mais claro |
| 03/10 (1.6.3) | horário de início na auditoria como "0,3333333333" | o evento de edição traz o horário como **fração do dia com vírgula** na planilha em português; a conversão só reconhecia ponto | 1.6.4 reconhece ponto e vírgula |

**Lições gerais:** (1) o Google Sheets real tem regras que o simulador não tinha (Tabelas tipadas, validação aplicada a scripts, localidade das fórmulas) — o simulador passou a reproduzir cada uma depois de descoberta; (2) toda operação destrutiva confere tudo antes e faz cópia antes de apagar; (3) mensagens de erro trazem o detalhe técnico mascarado para permitir diagnóstico sem expor IDs.

**Restos das tentativas de 03/10:** os reenvios que pararam no meio deixaram cópias "(cópia de 03/10/2026 12:26)" e "12:45" na pasta das cópias e linhas 2027/1 no índice; são fotos intermediárias, podem ser apagadas.

---

## 21. Limites conhecidos, pendências e ideias futuras

**Limites**
- Requisitos não são editáveis no painel; um campo vazio na ficha significa "usar o Júpiter".
- Duas pessoas editando a mesma disciplina ao mesmo tempo: vale a última gravação.
- Um curso por planilha-base.
- Reenvio apaga o que as secretarias já preencheram (fica na cópia) e as linhas extras feitas à mão.
- A auditoria não registra alterações feitas por scripts nem mudanças de formato; e-mail só de contas do mesmo domínio; aberturas só no navegador e para quem pode editar.
- O painel da auditoria mostra no máximo as 5.000 edições mais recentes na linha do tempo (as contagens usam todas).
- Grades anteriores aparecem no painel sem o preenchimento final.
- A justificativa de disciplinas não oferecidas não é registrada no sistema.
- A aba antiga "Registro de Edições" (anterior à 1.6.0) não foi migrada para a auditoria.

**Pendências / ideias registradas**
- "Carregar grade antiga" (abrir grades finalizadas).
- Painel ler a cópia de segurança (coluna B do índice) para mostrar o preenchimento final e as não oferecidas de grades anteriores.
- Grade visual externa, reformulando a planilha original (link público) para ler a planilha das secretarias.
- Regras de conflito adicionais em `Validacoes.gs`, se especificadas.
- Regra de "linha completa" no preenchimento, se definida (inclusive para disciplinas "NÃO").
- Itens "A VALIDAR INSTITUCIONALMENTE" (seção 16.3).
- Propagar a correção de contraste de bordas do tema para a cópia compartilhada (`shared/GradipTema.html`).

---

## 22. Sugestões para quem for auditar

Pontos que merecem atenção especial, com onde olhar:

1. **Autorização** — toda função pública chama `obterUsuario_`/`exigirAdmin_`? (`Acesso.gs`, início de cada função pública em `Importacao.gs`, `Preparacao.gs`, `EnvioGrade.gs`, `AuditoriaGrade.gs`, `AuditoriaPainel.gs`, `Consulta.gs`). Funções auxiliares terminam em `_`?
2. **Acionadores públicos** — `registrarEdicaoGrade` e `registrarAberturaGrade` são públicas (o Google exige); confirmar que ignoram eventos inventados vindos de `google.script.run` (precisam de objetos `Range`/`Spreadsheet` reais).
3. **Atomicidade da importação** — depende de a escrita de **um** metadado (o manifesto) ser atômica (`Gravacao.gs`).
4. **Envio destrutivo** — conferir a ordem: nada é apagado antes de a cópia estar feita e registrada (`EnvioGrade.gs`, `enviarGradeParaPreenchimento`).
5. **Injeção de fórmulas** — `textoSeguro_` em tudo o que vem de usuários/arquivos e vai para planilhas; proteção no CSV baixado; escape de HTML (`esc`).6. **Vazamento de IDs/e-mails** — mensagens de erro, registros de execução (`console.*`), dados devolvidos ao navegador (o painel da auditoria não devolve links).
7. **Cache** — conteúdo e validade (`CacheService`): permissões 60 s, IDs 10 min/6 h, revisão 6 h (só hash do e-mail).
8. **Limites de cota/tempo** do Apps Script com planilhas grandes (cada ação da preparação regrava a aba inteira; a auditoria lê até 5.000 linhas + contagens de todas).
9. **Dados pessoais** — itens da seção 16.3.
10. **Consistência documentação × código** — `docs/ARQUITETURA.md` e `docs/REGRAS.md` foram mantidos a cada versão; vale conferir pontos específicos contra o código.

---

## 23. Glossário

| Termo | Significado |
|---|---|
| **Júpiter** | sistema acadêmico da USP, fonte oficial da estrutura curricular |
| **Currículo** | número de 12 dígitos: curso (5) + habilitação (4) + ano/semestre de cadastro (3); sempre texto |
| **Habilitação** | 0000 Psicólogo, 0100 Bacharelado, 0200 Licenciatura (no curso 47012) |
| **Oferta / vínculo** | a disciplina dentro de um currículo: tipo e período ideal |
| **Tipo** | Obrigatória, Optativa eletiva ("Eletiva"), Optativa livre ("Livre") |
| **Período ideal** | semestre do curso (1º a 10º) |
| **Semestre de oferecimento** | semestre do ano (1º, 2º ou os dois) |
| **Créditos-aula / -trabalho** | 1 crédito-aula = 15 h no semestre (1 h/semana); 1 crédito-trabalho = 30 h |
| **CH, CE, CP, EXT, ATPA, AAC, AEX** | carga horária total; estágio; práticas como componente curricular; extensão; atividades teórico-práticas de aprofundamento; atividades acadêmicas complementares; atividades extensionistas (Apolo) |
| **Departamentos** | PSA, PSC, PSE, PST (pelo prefixo); Interdepartamental (código 470…); Outras unidades |
| **Ajuste manual** | correção feita no painel, guardada à parte do Júpiter |
| **Disciplinas para outros cursos** | disciplinas do IP ministradas para outras unidades |
| **Manifesto** | metadado que diz qual versão da base está em uso |
| **Diário** | metadado que marca uma gravação em andamento |
| **Prévia** | o que a importação/envio vai fazer, mostrado antes de gravar |
| **Planilha das secretarias** | `GRADE_HORARIA_PREENCHIMENTO`, onde os departamentos preenchem a grade |
| **Índice das grades** | `INDEX_GRADE_HORARIA_VERSOES_ANTERIORES`: semestre, ID da cópia, Auditoria_ID |
| **Auditoria** | planilha por semestre com as edições e aberturas da planilha das secretarias |
| **Acionador instalável** | gatilho do Google criado por script, que roda com a autorização de quem o criou |
| **Leitor / Administrador** | perfis definidos na planilha `PERMISSOES_DE_ACESSO` |
| **Comissão de Graduação (CG)** | órgão que acompanha a grade pelo painel da auditoria (perfil Leitor) |

---

## 24. Mapa do código (zip)

```text
estrutura_curricular/
  LEIA-ME.md                                   visão geral do pacote
  SISTEMA_ESTRUTURA_CURRICULAR_E_GRADE_HORARIA.md   (este documento)
  sistemas/estrutura-curricular/
    README.md                                  instalação, atualização versão a versão, manifesto
    src/                                       os 27 arquivos do projeto Apps Script (seção 3.3)
    planilha-grade/
      Validacoes.gs                            único código da planilha das secretarias
      README.md                                limpeza do projeto antigo da planilha e passos
    testes/                                    simulador, suítes Node e Playwright, rodar_suites.sh
  docs/sistemas/estrutura-curricular/
    README.md          finalidade, papéis, tabela de versões
    ARQUITETURA.md     referência técnica: componentes, funções, códigos de erro, esquema completo
    REGRAS.md          regras de leitura, conferência, gravação, preparação, envio e auditoria
    CSV_X_PDF.md       comparação detalhada dos arquivos do Júpiter
    AJUDA.md           conteúdo da futura Central de Ajuda
    DADOS_E_SEGURANCA.md   dados tratados, acesso, registros, pontos a validar
    HOMOLOGACAO.md     testes, evidências, limites e roteiro de homologação (passos 1–67)
    evidencias/        logs da última rodada de testes (sem caminhos, IDs ou e-mails reais)
```

Para instalar do zero, ver `sistemas/estrutura-curricular/README.md` (seção "Instalação"); para atualizar a partir de uma versão anterior, as seções "Atualizar da x para a y" do mesmo arquivo.
