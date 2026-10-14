# Dados e segurança — Estrutura Curricular

Preenchido a partir de [`SYSTEM_SECURITY_TEMPLATE.md`](../../seguranca/SYSTEM_SECURITY_TEMPLATE.md), atualizado para a fonte **1.10.0**, sobre a baseline **1.9.3**. Os registros de versões anteriores abaixo descrevem a evolução dos tratamentos. **Não contém valores de IDs operacionais ou dados pessoais reais.** Configuração e resultados institucionais dependentes da implantação permanecem **A VALIDAR**.

## 1. Escopo

- **Sistema:** Estrutura Curricular e Grade Horária, fonte 1.10.0.
- **Público:** equipe do Serviço de Graduação (sistema interno). Consulta pode ser liberada a outras contas USP.
- **Ambiente desta revisão:** verificação local com simulador/Chromium e dados sintéticos. Versão real em produção e homologação 1.10.0 no Google **A VALIDAR**; esta rodada não promoveu a implantação.
- **Responsável funcional:** Serviço de Graduação do IPUSP (registrar o papel responsável, não o nome) — **A VALIDAR**.
- **Última revisão:** 11/10/2026.

## 2. Dados tratados

| Categoria | Exemplo abstrato | Finalidade | Origem | Destino | Persistência | Classe |
|---|---|---|---|---|---|---|
| Estrutura curricular | "AAA0000 — Disciplina Exemplo", créditos, cargas, tipo, período, requisitos, informações do currículo | base da grade horária | relatório "Grade Curricular" do Júpiter (CSV/PDF) | planilha `ESTRUTURA_CURRICULAR`; painel | até a próxima importação; mudanças ficam no histórico | Conteúdo público (o Júpiter publica as grades curriculares); a planilha é recurso interno |
| E-mail institucional de quem importou | `pessoa.teste@unidade.example` | registro de quem gravou cada importação | conta conectada (`Session.getActiveUser`) | aba Importações (coluna "Quem importou") e aba Sobre (última importação) | enquanto a planilha existir — **A VALIDAR** retenção | Pessoal |
| E-mail de quem abre o painel | — | decidir o papel (admin/leitor) | conta conectada | **não é gravado**; volta ao próprio usuário na resposta do painel | só durante a chamada | Pessoal |
| (1.7.0) Permissões de acesso | N. USP, nome, e-mail, observação, perfil (ADMINISTRADOR/LEITOR) | autorização | Serviço de Graduação | planilha `PERMISSOES_DE_ACESSO`, aba `ESTRUTURA_CURRICULAR` (fora do sistema; o sistema só lê) e cache do script por 60 s (só e-mail → perfil) | enquanto a pessoa tiver acesso — **A VALIDAR INSTITUCIONALMENTE** | Pessoal |
| Lista de revisão da prévia (valores só do PDF) + hash SHA-256 do e-mail de quem gerou a prévia | — | provar, na gravação, que todas as páginas foram entregues a quem confirma | prévia (`prepararImportacao`) | cache do script | até 6 h | Institucional; o hash não revela o e-mail, mas é pseudônimo — A VALIDAR INSTITUCIONALMENTE |
| Observações | "Oferecida só no 2º semestre" | anotações da equipe sobre a disciplina | digitação na planilha ou na ficha do painel (1.3.0, só administradores) | aba Disciplinas (estrutura) ou aba Disciplinas para outros cursos; as da estrutura são exibidas na ficha para **todos** os que consultam | permanente | Interno — **não escrever dados pessoais** |
| Ajustes manuais (1.3.0) | nome/créditos/oferta corrigidos, "Excluída", "Adicionada à grade horária" | corrigir a estrutura sem alterar o Júpiter; preparar a lista da grade | ficha e listas do painel (administradores) | aba Ajustes manuais; painel (leitores recebem a estrutura já ajustada, sem as excluídas) | permanente — **A VALIDAR** retenção | Interno |
| Disciplinas para outros cursos (1.3.0) | "AAA0000 — Disciplina Exemplo", créditos, unidade e curso atendidos | incluir na grade as disciplinas do IP para outras unidades | "Lista de disciplinas por unidade" do Júpiter (CSV, lido no navegador) ou cadastro | aba Disciplinas para outros cursos; painel **só para administradores** | permanente | Conteúdo público (catálogo do Júpiter) / interno |
| E-mail de quem alterou (1.3.0) | `pessoa.teste@unidade.example` | registro de quem fez cada ajuste, exclusão, inclusão ou seleção | conta conectada | colunas "Alterado por" das abas Ajustes manuais e Disciplinas para outros cursos; **não é enviado ao painel** | enquanto a linha existir (sobrescrito pela alteração seguinte) — **A VALIDAR INSTITUCIONALMENTE** retenção | Pessoal |
| Nome do arquivo importado | `grade_curricular.csv` | registro | arquivo escolhido | aba Importações | enquanto a planilha existir | Interno |
| Manifesto da versão ativa | ids das abas, versão, lista de importações concluídas (`id`, identificador da operação, data) e o texto da aba Sobre (que inclui o e-mail de quem fez a última importação) | ativar e ler só versões completas | servidor | metadado `estruturaCurricular.ativa` da planilha | enquanto a planilha existir | Interno / pessoal (um e-mail) |
| (1.8.7) Ação em lote pendente | ação, chaves das disciplinas que ela muda (estrutura e outros cursos), contagens, aba e importação em uso, identificador da planilha da estrutura, data e e-mail de quem pediu | concluir uma ação em lote interrompida | servidor | Propriedades do script (`estruturaCurricular.lote` e partes) | só até a ação ser concluída (ou descartada, se a base mudou) | Interno / pessoal (e-mail) |
| (1.8.5) Salvamento pendente | disciplina (chave), linha de ajuste (1.8.6: sem colunas extras) e observação pretendidas, aba e importação em uso, data e e-mail de quem salvou | concluir um salvamento interrompido | servidor | metadado `estruturaCurricular.salvamento` | só até o salvamento ser concluído (ou descartado, se a base mudou) | Interno / pessoal (e-mail) |
| Diário da gravação | id e operação da importação em andamento | recuperação após falha | servidor | metadado `estruturaCurricular.gravacao` | só até a gravação terminar ou ser recuperada | Interno |
| Cópias de segurança `_anterior_…` | a versão anterior das 4 abas de dados, incluindo Observações | recuperar a versão anterior / edição feita no instante da ativação | servidor | abas ocultas da mesma planilha | até a importação seguinte | Interno (mesma classe das abas originais) |
| Tentativas não concluídas | cópias `_nova_…` e linhas de histórico de uma gravação que falhou | — | servidor | abas ocultas / abas de registro | até a recuperação (próxima importação ou abertura pelo admin); nunca aparecem no painel | Interno / pessoal (e-mail na linha de Importações) |
| Preferência de tema | `dark` | aparência | navegador | `localStorage["gradip-theme"]` | local ao navegador | Técnico |
| Modo de navegação (1.10.0) | `sidebar` / `abas` | apresentação | controle no navegador | DOM da página | somente durante a página aberta; não é persistido | Técnico |

**O arquivo importado não é enviado nem salvo.** A "Lista de disciplinas por unidade" (1.3.0) é lida no navegador e só o texto do CSV vai ao servidor, que o usa para a prévia e a inclusão e não o guarda (grava só as disciplinas escolhidas). CSV e PDF são lidos no navegador de quem importa. O servidor recebe só os dados extraídos, e somente depois da confirmação. **Metadados do PDF** (por exemplo, o autor que o Windows grava ao imprimir em PDF) **não são lidos nem gravados**.

**(1.5.0) Envio da grade.** O servidor copia a planilha das secretarias **inteira** — inclusive o que elas já preencheram: nomes de docentes, dias, horários, vagas, salas e observações — para a pasta das grades anteriores, e registra no índice o semestre e o ID da cópia. Depois apaga e regrava as colunas B a S das 6 abas de disciplinas. As cópias ficam na pasta indefinidamente (retenção **A VALIDAR INSTITUCIONALMENTE**) e herdam o compartilhamento da pasta: mantenha a pasta **Restrita**. Nenhum e-mail é gravado no índice nem nas cópias pelo sistema.

**(1.7.0) Painel da auditoria.** A seção "Auditoria da grade" mostra no navegador de administradores **e leitores** as edições registradas (data e hora, e-mail de quem editou, onde, disciplina, valor anterior e novo) e a situação atual das disciplinas na planilha das secretarias (inclusive nomes de docentes). Só leitura; nada fica guardado no navegador além da página aberta; (1.8.0) não há link para a planilha de auditoria (nem para administradores).

**(1.11.0) Nome de quem aparece na auditoria.** Ao montar o painel, o servidor procura cada e-mail registrado (edições das secretarias e aberturas) nos cadastros de servidores, docentes e alunos e envia ao navegador de administradores e leitores, só para esses e-mails, o **nome**, o **vínculo** (servidor, docente ou aluno) e, para servidores, o **setor**. Nada dos cadastros é gravado; as demais pessoas dos cadastros não saem do servidor. O resultado de cada e-mail fica no cache do script por até 10 minutos. Aluno só aparece se tiver aberto ou editado a planilha das secretarias (o que não deveria acontecer): nesse caso o nome dele fica visível a leitores. Finalidade (identificar quem mexe na planilha das secretarias e quem tem acesso indevido) e base legal — **A VALIDAR INSTITUCIONALMENTE**.

**(1.8.0) Aberturas da planilha das secretarias.** Um acionador anota cada vez que alguém com permissão de edição abre a planilha das secretarias no navegador: data e hora, semestre e **e-mail**, na aba "Aberturas" da auditoria do semestre. O painel mostra a contagem por pessoa (gráfico "Quem mais abre a planilha") a administradores e leitores. Finalidade (acompanhar o preenchimento), base legal e retenção — **A VALIDAR INSTITUCIONALMENTE**; as secretarias devem ser informadas de que aberturas e edições são registradas.

**(1.6.0) Auditoria da grade.** Cada edição feita pelas secretarias na planilha da grade é registrada numa planilha de auditoria por semestre (pasta das auditorias): data e hora, **e-mail de quem editou**, aba, célula, disciplina, valor anterior e valor novo. É dado pessoal de servidores (e-mail e ação), com finalidade de auditoria do preenchimento. Recomendado avisar as secretarias, na mensagem de compartilhamento, que as edições são registradas. O acionador roda com a autorização de quem o ativou (`ativarAuditoriaGrade`). Retenção das planilhas de auditoria: **A VALIDAR INSTITUCIONALMENTE**.

## 3. Recursos externos

| Nome lógico | Tipo | Config key | Público? | Permissão esperada |
|---|---|---|---|---|
| ID_INDEX | Google Sheets (índice mestre) | `Script Properties["ID_INDEX_SPREADSHEET_ID"]` | Não | leitura pela identidade de execução |
| ESTRUTURA_CURRICULAR | Google Sheets (base) | linha `ESTRUTURA_CURRICULAR` / `spreadsheet`, coluna C (`ID de Produção`) da 1ª aba do `ID_INDEX` | Não | edição pela identidade de execução; compartilhamento **Restrito** |
| (1.5.0) Planilha das secretarias | Google Sheets | linha `GRADE_HORARIA_PREENCHIMENTO` do `ID_INDEX`, coluna C | Não | edição pela identidade de execução (apaga e grava B4:S999 das 6 abas de disciplinas; renomeia o arquivo) |
| (1.5.0) Índice das grades anteriores | Google Sheets | linha `INDEX_GRADE_HORARIA_VERSOES_ANTERIORES`, coluna C | Não | edição pela identidade de execução (acrescenta uma linha por cópia) |
| (1.6.0) Pasta das auditorias | pasta do Google Drive | linha `AUDITORIA_GRADES_ANTERIORES`, coluna C | Não | criar arquivos; a pasta deve ser **Restrita** ao Serviço de Graduação |
| (1.5.0) Pasta das cópias de segurança | pasta do Google Drive | linha `BACKUP_GRADES_ANTERIORES`, coluna C | Não | criar arquivos (a cópia herda o compartilhamento da pasta) |
| (1.11.0) Cadastro de servidores | Google Sheets | linha `SERVIDORES`, coluna C | Não | leitura (primeira aba: A e-mail, B nome, C setor) |
| (1.11.0) Cadastro de docentes | Google Sheets | linha `PLANILHA_DOCENTES`, coluna C | Não | leitura (primeira aba: B nome, D e-mail) |
| (1.11.0) Cadastro de alunos | Google Sheets | linha `PLANILHA_ALUNOS`, coluna C | Não | leitura (primeira aba: B nome, D e-mail, E e-mail secundário); planilha **Restrita**, com dados pessoais de alunos |
| Bibliotecas de leitura de PDF | JavaScript público (PDF.js 3.11.174; Tesseract.js 7.0.0 e núcleo 7.0.0) | fixas no código (`LeitorPdfFontes.html`, `LIBS`) | Sim | — (integridade por SRI `sha384`) |
| Modelo de OCR em português | arquivo público `tessdata_fast` 4.1.0 (jsDelivr ou GitHub) | fixo no código | Sim | — (conferido por SHA-256 antes do uso) |
| Marca USP (tema claro) | PNG público em `datagrad.sistemas.ip.usp.br` | fixo (`GradipMarcaUSP.html`, igual ao Painel de Solicitações) | Sim | — |

O código não contém o ID de nenhuma planilha nem pasta. Desde a 1.5.0 usa `DriveApp` só para copiar a planilha das secretarias para a pasta das cópias (`makeCopy`) e abrir essa pasta; isso acrescenta ao projeto a autorização do Google Drive (`auth/drive`, acesso aos arquivos da conta que implanta), que o Apps Script não permite restringir a um arquivo só com `DriveApp`. Script Properties tira o valor do Git, mas **não é cofre** contra editores do projeto Apps Script.

(1.9.0) A Central de Ajuda (`EstruturaAjuda*.html`) não acrescenta recurso externo: o conteúdo é texto fixo dentro da página, sem imagens, fontes ou scripts de fora; abrir, buscar e navegar não chama o servidor, não faz pedido de rede e não grava nada no navegador (nem `localStorage`); a busca roda só na página e o termo digitado não sai dela. Os textos não contêm IDs, e-mails nem dados pessoais — o teste `testar_ajuda.js` (A4, A6) confere isso. Os gatilhos "?" são montados com textos fixos do código, nunca com dados da base.

(1.10.0) Navegação lateral/abas não acrescenta recurso externo, API, configuração ou armazenamento. Os 12 ícones são SVGs estáticos do catálogo Lucide, incluídos na própria página; licença preservada. O adaptador observa visibilidade e move controles existentes, sem ler/gravar conteúdo de negócio. Brilho/elevação são uma exceção visual explícita, limitada à navegação; ver [NAVEGACAO_E_VISUAL_1_10_0.md](NAVEGACAO_E_VISUAL_1_10_0.md).

## 4. Web App

- **Quem pode acessar:** "Qualquer pessoa da Universidade de São Paulo" (domínio) — **A VALIDAR** na implantação.
- **Executa como:** quem implantou (`USER_DEPLOYING`, "Eu"). Assim, leitores não precisam ter acesso direto às planilhas. Consequência: **a segurança não depende do compartilhamento da planilha**; o backend valida o papel em toda chamada.
- **Autorização server-side** (`Acesso.gs`):
  - conta identificada;
  - (1.7.0) e-mail na aba `ESTRUTURA_CURRICULAR` da planilha de permissões; administrador = Perfil `ADMINISTRADOR`; leitor = Perfil `LEITOR` (ou vazio/desconhecido); nunca por domínio, nem pelo dono da planilha;
  - qualquer outra conta é recusada.
- **Dados enviados ao cliente:**
  - a base curricular inteira;
  - as 30 últimas importações (e-mail de quem importou **só para administradores**);
  - as 600 últimas alterações (sem e-mail);
  - o e-mail e o papel do próprio usuário;
  - a versão do sistema.

  **Nenhum ID de planilha.**
- **Operações privilegiadas** (só administrador):
  - `prepararImportacao` (prévia; pode recuperar uma gravação interrompida);
  - `confirmarImportacao` (grava);
  - `verificarImportacao` (só lê: diz se uma operação foi concluída);
  - criação das abas na primeira abertura;
  - `diagnosticarConfiguracao` (só contagens e nomes de abas, sem IDs);
  - (1.3.0) `salvarDisciplina`, `excluirDisciplinas`, `adicionarAGrade`, `removerDaGrade`, `cadastrarNovaGrade` (1.4.0), `cadastrarDisciplinaOutros`, `previaDisciplinasUnidade` e `incluirDisciplinasUnidade`. Todas conferem o papel antes de qualquer leitura; um leitor que as chame direto recebe `SO_ADMIN` (há teste que prova isso pelo navegador).
- **Entradas validadas no servidor:** todo o pacote; na 1.3.0, cada campo da ficha (padrão do código, faixas numéricas, tamanho dos textos, habilitações e períodos da oferta), a existência da disciplina, a unicidade do código e o tamanho dos lotes e do CSV da unidade (2 MB, 5.000 linhas). Formatos, faixas numéricas, tamanhos, coerência entre listas e limites de quantidade. Textos são limpos de caracteres de controle e gravados de modo a não virar fórmula.

## 5. Configuração

Somente chaves (valores apenas no Apps Script):

```text
ID_INDEX_SPREADSHEET_ID    (Propriedades do script — obrigatória)
PERMISSOES_DE_ACESSO       (1.7.0; chave na 1ª aba do ID_INDEX; tipo spreadsheet; aba ESTRUTURA_CURRICULAR)
ESTRUTURA_CURRICULAR       (chave na 1ª aba do ID_INDEX; tipo spreadsheet; coluna C = ID de Produção)
```

Configurar em **Configurações do projeto › Propriedades do script**. Nunca criar script de setup com valores reais.

**Cadastrar nova grade (1.4.0).** Apaga, sem cópia de segurança, tudo o que a planilha guarda — inclusive os registros com e-mail (Importações, Sobre, colunas "Alterado por"). Só administradores; exige digitar APAGAR (conferido no servidor) e roda sob a trava. O histórico de versões do Google Sheets continua existindo (restauração manual pelo dono da planilha). Efeito sobre a retenção: **A VALIDAR INSTITUCIONALMENTE** (o recomeço também encerra a guarda desses registros).

## 6. Logs

- **Registro de execução (Apps Script):** só falhas inesperadas, com o nome da função e a pilha (`executarComSeguranca_`), e o resultado de `diagnosticarConfiguracao` (contagens e nomes de abas). (1.5.0) Cada envio da grade registra uma linha: semestre da grade, número de disciplinas e o semestre da cópia (sem IDs, nomes de disciplinas ou e-mails); `diagnosticarEnvioGrade` registra nomes de arquivo e pasta, sem IDs. (1.6.0) O acionador da auditoria só registra no log avisos sem e-mails nem IDs; os e-mails ficam só na planilha de auditoria.
- **Proibido em log:**
  - e-mails;
  - conteúdo do arquivo ou do pacote;
  - IDs;
  - valores de propriedades.

  Um teste automatizado confere isso.
- **Falhas de gravação:** o registro de execução recebe só a etapa e a mensagem técnica da falha (sem dados, e-mails ou IDs).
- **Registro de negócio (na planilha):**
  - Importações: data, e-mail de quem importou, arquivo, contagens, resumo;
  - Alterações: disciplina, campo, antes/depois, **sem e-mail**;
  - Sobre: última importação, com e-mail;
  - (1.3.0) Ajustes manuais e Disciplinas para outros cursos: "Alterado em" e "Alterado por" (e-mail) da última alteração de cada linha. Não há histórico linha a linha dessas alterações: o histórico de versões da planilha é o registro completo.
- **Depuração:** a opção `depurar` do leitor de PDF só é usada nos testes; o painel não a ativa.

## 7. Compartilhamento e acesso

- **Planilha `ESTRUTURA_CURRICULAR`:**
  - **Restrito**; a conta que implanta precisa do acesso de execução e de perfil `ADMINISTRADOR` explicitamente na lista; ser dona não concede autorização no app;
  - editores só se necessário — **A VALIDAR** quem;
  - as abas têm proteção "só com aviso" (avisa, mas não impede), para permitir a coluna Observações e colunas extras. As abas da 1.3.0 também: devem ser alteradas só pelo painel. A integridade vem da regravação a cada importação e do histórico.
- **`ID_INDEX`:** a identidade de execução precisa de leitura.
- **(1.5.0) Planilha das secretarias, índice e pasta das cópias:** a identidade de execução precisa de edição (planilha e índice) e de criar arquivos (pasta). A pasta das cópias deve ser **Restrita** à equipe: as cópias trazem o que as secretarias preencheram.
- **Papéis:**
  - (1.7.0) uma pessoa por linha na aba `ESTRUTURA_CURRICULAR` da planilha de permissões, com Perfil. Não há liberação por domínio. A planilha de permissões deve ser **Restrita** ao Serviço de Graduação (quem a edita decide quem acessa o sistema);
  - **leitores veem a auditoria da grade**: e-mail das secretarias, o que cada uma preencheu e quando. Quem recebe o perfil LEITOR (ex.: Comissão de Graduação) e a finalidade desse acesso — **A VALIDAR INSTITUCIONALMENTE**.
- **Revisão de permissões:** periodicidade **A VALIDAR**.

## 8. Dados de teste

- Os testes locais usam os arquivos do Júpiter (conteúdo curricular público: grade curricular e lista de disciplinas por unidade), informados no momento da execução e **não versionados**. Cadastros de teste usam códigos e nomes fictícios.
- E-mails de teste usam domínios reservados (`@unidade.example`, `@externo.example`). O simulador usa planilhas em memória com IDs fictícios.
- Capturas de tela e saídas ficam em `testes/saida/`, **fora do Git**. Contêm só dados curriculares.
- O PDF de exemplo tem, nos metadados, o nome de quem o imprimiu: **não copiar esse arquivo para o repositório**.

## 9. Pontos LGPD/institucionais

- **Finalidades:** organizar a estrutura curricular para a grade horária; registrar quem fez cada importação e cada alteração da preparação da grade.
- **Base legal:** `A VALIDAR INSTITUCIONALMENTE`.
- **Retenção** do registro de importações (e-mails), das alterações e das colunas "Alterado por" (1.3.0), das **cópias de segurança da grade** na pasta das grades anteriores (1.5.0; contêm nomes de docentes) e das **planilhas de auditoria** (1.6.0; e-mails e ações das secretarias): `A VALIDAR INSTITUCIONALMENTE`. Hoje o registro cresce sem limpeza automática.
- **Compartilhamentos externos:** nenhum dado curricular ou pessoal sai do Google Workspace.
  - Ao ler um PDF, o navegador baixa bibliotecas e o modelo de OCR de endereços públicos (jsDelivr/GitHub), como qualquer site que usa uma CDN.
  - O OCR roda no próprio navegador.
- **Dados sensíveis:** nenhum previsto. As Observações não devem conter dados pessoais de alunos ou servidores.

## 10. Incidentes

- Seguir o [procedimento comum](../../seguranca/INCIDENTES.md) e o fluxo institucional vigente, sem inventar contatos.
- **Medidas específicas deste sistema:**
  - dado pessoal escrito em Observações: apagar a célula, conferir o histórico de versões da planilha e escalar;
  - lista de acesso errada: corrigir a aba `ESTRUTURA_CURRICULAR` da planilha de permissões; vale em até 1 minuto (cache);
  - base com aba de dados apagada à mão ou manifesto ilegível (`BASE_INCONSISTENTE`): nada é gravado; restaurar pelo histórico de versões da planilha (as cópias `_anterior_…` ajudam a conferir);
  - ID de planilha exposto: revisar o compartilhamento. O ID não dá acesso, mas é informação interna.

## 11. Exceções

| Desvio | Justificativa | Mitigação |
|---|---|---|
| Bibliotecas e modelo de OCR carregados de CDN pública | ler PDF sem texto exige OCR, e o Apps Script não tem OCR | versões fixas; SRI e SHA-256; carregadas só ao escolher um PDF; o CSV não depende delas |
| `GradipTema.html` copiado do Painel de Solicitações v1.2 (e não de `shared/`) | a cópia do painel tem a correção de contraste de `--gradip-border-strong` (≥ 3:1), que `shared/` ainda não tem | propagar a correção para `shared/` |
| Proteção das abas "só aviso" | permitir Observações e colunas extras | regravação a cada importação; histórico de alterações; **edição em célula do sistema depois da prévia invalida a prévia**; edição durante a gravação cancela a gravação |
| Sem transação entre abas no Sheets | limitação da plataforma | preparação em cópias + ativação por uma escrita de metadado + recuperação por diário (ARQUITETURA.md §7); respostas distinguem "não gravada", "concluída com pendências" e "resultado incerto". (1.8.5) Salvar disciplina da estrutura: registro do pedido + conferência + conclusão retomável (REGRAS §8.1, 8b). (1.8.7) Ações em lote: mesmo tratamento, com o registro nas Propriedades do script (REGRAS §8.1, 8c) |

## 12. Homologação

- **Preflight de conteúdo:** sem segredos, sem IDs reais e sem dados pessoais no código e na documentação.
- **Checklist completo** ([SECURITY_CHECKLIST.md](../../seguranca/SECURITY_CHECKLIST.md)): depende da implantação real. Falta conferir:
  - compartilhamento das planilhas;
  - `executeAs`;
  - acesso por domínio;
  - acesso às CDNs na rede USP;
  - revisão de editores.

  Roteiro em [HOMOLOGACAO.md](HOMOLOGACAO.md).
