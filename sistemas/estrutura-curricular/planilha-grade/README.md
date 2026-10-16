# Planilha das secretarias (Grade Horária) — código da planilha

> Migração histórica recebida. A atualização visual 1.10.0 não modifica este script nem exige repetir remoções de arquivos/acionadores. Para implantação nova, confira o estado do projeto vinculado e [INSTALACAO_E_ATUALIZACAO.md](../../../docs/sistemas/estrutura-curricular/INSTALACAO_E_ATUALIZACAO.md).

A planilha que as secretarias preenchem (chave `GRADE_HORARIA_PREENCHIMENTO` no `ID_INDEX`) fica com **dois arquivos de código**: `Validacoes.gs` (validações a cada edição) e `Protecao.gs` (só e-mails autorizados preenchem). Nada de menu, backup, registro de edições ou grade visual: isso roda no sistema Estrutura Curricular (envio da grade, cópia de segurança, auditoria) ou vai para um projeto separado (grade visual).

## O que `Validacoes.gs` faz

Gatilho simples `onEdit` (roda sozinho, com as permissões de quem edita), só nas abas PSA, PSC, PSE, PST, Interdepartamentais e Outras Unidades, da linha 4 em diante:

1. **Modalidade "Prática"** (coluna F) → Dia da semana = "Horário Variável" e Horário de Início = "-- : --".
2. **Conflito de horário**: ao escolher o dia (K) ou o início (L) de uma disciplina **Eletiva** ou **Livre**, procura nas 6 abas uma **Obrigatória** do mesmo semestre ideal, no mesmo dia, com horário sobreposto. Se achar, apaga o dia e o início da linha e explica numa nota na célula do dia (código, aba e horários da obrigatória). Sem conflito, a nota antiga sai.

O **Horário de Fim (M)** não é mais digitado: o envio da grade grava em M a fórmula `início + créditos-aula` (1 crédito = 1 hora), com o resultado em **texto "HH:mm"** (1.6.2). Na Tabela, deixe a coluna Horário de Fim com o tipo **Texto** (ou sem tipo) e sem lista suspensa; o envio não muda o formato dela (o Google não deixa o script mudar o formato de coluna com tipo). Por isso a antiga "verificação de carga horária" saiu — o fim sempre bate com os créditos.

**Correção:** o código antigo procurava os tipos "Obrigatórias", "Optativas Eletivas" e "Optativas Livres", mas a coluna E usa "Obrigatória", "Eletiva" e "Livre" — a verificação de conflitos nunca disparava. O código novo usa os nomes certos.

## O que `Protecao.gs` faz

Só as secretarias autorizadas preenchem a grade, mesmo que a planilha tenha outros editores (por exemplo, um docente que recebeu acesso de uma secretaria). Usa a proteção de abas do próprio Google: quem não está na lista abre e vê a planilha, mas não consegue digitar.

- A lista fica na aba **Acesso** da própria planilha (nunca no código: o repositório é público), uma linha por aba da grade, com os e-mails separados por vírgula. Aba sem e-mail: só o dono edita.
- Todas as outras abas (Informações, DataBase, Acesso…) ficam só com o dono.
- Proteções que já existem, como a da coluna M, continuam valendo: numa célula com duas proteções, a pessoa precisa estar autorizada nas duas.
- A verificação de hora em hora reaplica a lista e desfaz qualquer editor incluído direto na proteção. A coluna "Última aplicação" da aba Acesso mostra quando rodou e quem foi removido.

Instalação (com a conta **dona** da planilha; outra conta é recusada):

1. Extensões › Apps Script: crie o arquivo **`Protecao`** e cole o conteúdo de `Protecao.gs`. Salve.
2. Execute `prepararAbaAcesso` (autorize quando o Google pedir). Aparece a aba **Acesso**.
3. Na aba Acesso, coluna B, preencha os e-mails de cada secretaria na linha da aba do departamento. Interdepartamentais e Outras Unidades: os e-mails de quem pode preencher essas abas, ou vazio para só você.
4. Execute `ativarVerificacaoDeAcesso`: aplica agora e liga a verificação de hora em hora.
5. Ao trocar uma secretaria, mude a aba Acesso e execute `aplicarAcessoGrade` (ou espere a próxima verificação).

Complementos fora do script, no Drive: em Compartilhar › engrenagem, desmarque "Editores podem alterar permissões e compartilhar" na planilha **e nas pastas acima dela**, e compartilhe com as secretarias só o arquivo, nunca a pasta. Um editor não autorizado ainda consegue criar abas novas ou fazer uma cópia da planilha; nada disso altera a grade.

## Passo a passo na planilha (Extensões › Apps Script da planilha das secretarias)

1. **Acionadores** (ícone de relógio): apague o acionador `registrarEdicao` (e qualquer outro). Sem isso, o Google manda e-mails de erro quando o arquivo dele sumir.
2. **Arquivos**: apague **todos** os 25 arquivos atuais:
   - `Codigo.gs`, `Backup.gs`, `FormataAba.gs`, `Gradehoraria.gs`, `Menu Grade Horaria.gs`, `Novo Semestre.gs`, `Registro de Edicoes.gs`, `doGet.gs`, `limpar Aba.gs`, `obterConfiguracaoGrade.gs`;
   - `Verificacao de Conflitos.gs`, `Verifica Carga Horaria.gs`, `Verifica Modalidade.gs` (substituídos por `Validacoes.gs`);
   - `preenchimento de abas - PSA.gs`, `preenchimento de abas - PSC.gs`, `preenchimento de abas - PSE.gs`, `preenchimento de abas - PST.gs`, `preenchimento de abas - Interdepartamentais.gs`, `preenchimentos de abas - Outras Unidades.gs`;
   - `GradeGrid.html`, `GradeHoraria.html`, `GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html`.
3. Crie o arquivo de script **`Validacoes`** e cole o conteúdo de `Validacoes.gs`. Salve. (Não precisa executar nada: o `onEdit` é automático.)
4. **Implantar › Gerenciar implantações**: se esta cópia tiver uma implantação de App da Web (a grade visual), arquive-a.
5. **Configurações do projeto › Propriedades do script**: apague `BACKUP_FOLDER_ID` e `GRADE_ADMINS` (não são mais usadas).
6. Na planilha:
   - apague a aba oculta **"Registro de Edições"** (o registro passa a ser a planilha de auditoria; se quiser guardar o que ela tem hoje, baixe-a antes em Arquivo › Fazer download › CSV);
   - **proteja a coluna M** (M4:M999) nas 6 abas, só você editando: ela passa a ser fórmula;
   - as células DataBase!V2 e V3 (recarga e paridade) não são mais usadas.
7. O menu "Grade Horária" some ao recarregar a planilha.

## Depois, no sistema Estrutura Curricular

1. Instale a versão 1.6.0 (ou posterior) e execute `ativarAuditoriaGrade` no editor (uma vez): cria a auditoria do semestre que está no nome da planilha (hoje, 2027/1) e instala o acionador de edição.
2. **Envie de novo a grade 2027/1** pelo painel, antes de liberar para as secretarias: é esse envio que grava a fórmula do Horário de Fim (M) nas linhas. A auditoria de 2027/1 é reaproveitada e o reenvio fica anotado nela.
