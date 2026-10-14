# Dados e segurança — planilha das secretarias

**Revisão:** 14/10/2026. Preflight de conteúdo feito: a documentação e os testes não têm IDs, URLs de implantação, nomes de docentes nem outros dados reais. A cópia `.xlsx` usada para descrever a estrutura **não** foi versionada. O [checklist de segurança](../../seguranca/SECURITY_CHECKLIST.md) depende do arquivo real no Drive.

## 1. Escopo

- Sistema: planilha das secretarias (Grade Horária) e seu código `Validacoes.gs` 1.1.
- Público: secretarias dos departamentos (edição) e Serviço de Graduação.
- Ambiente: produção (arquivo único, reaproveitado a cada semestre).
- Responsável funcional: Serviço de Graduação — A VALIDAR (nome não registrado aqui).
- Última revisão: 14/10/2026.

## 2. Dados tratados

| Categoria | Exemplo abstrato | Finalidade | Origem | Destino | Persistência | Classe |
|---|---|---|---|---|---|---|
| Oferta de disciplinas | código, nome, tipo, semestre ideal, créditos | base do preenchimento | envio do Estrutura Curricular | planilha | até o próximo envio; depois, na cópia de segurança | Interno |
| Preenchimento | será oferecida, modalidade, dia, horário, vagas, observações, sala | grade do semestre | secretarias | planilha; grade visual | idem | Interno, divulgado ao curso pela grade visual |
| Docentes | nome do docente | quem ministra | lista na aba DataBase (outra planilha, por `IMPORTRANGE`) | planilha; grade visual | idem | Pessoal (função pública docente) |
| Nota de conflito | texto com códigos, nomes e horários de disciplinas | explicar a limpeza | `Validacoes.gs` | célula do Dia da semana | até a próxima edição sem conflito ou o próximo envio | Interno |
| Caixa de aviso (1.1) | o mesmo texto da nota | avisar quem editou | `Validacoes.gs` | tela de quem editou | não fica gravada | Interno |
| Quem editou / abriu | e-mail, data, célula, valores | auditoria | acionadores do Estrutura Curricular | planilha de auditoria do semestre | ver o Estrutura Curricular | Pessoal |

Não há dado de aluno. `Validacoes.gs` não lê e-mail de ninguém.

## 3. Recursos externos

| Nome lógico | Tipo | Config key | Público? | Permissão esperada |
|---|---|---|---|---|
| GRADE_HORARIA_PREENCHIMENTO | Google Sheets; esta planilha | chave no `ID_INDEX` (coluna de ID de produção) | Não | edição: secretarias e Serviço de Graduação; edição pela conta do Estrutura Curricular; leitura pela conta da grade visual |
| Lista de docentes | Google Sheets; origem do `IMPORTRANGE` da aba DataBase | fórmula na própria planilha (fora do Git) | Não | leitura autorizada uma vez no arquivo |
| Grade Horária visual | Web App | link e QR code na aba Informações (fora do Git) | Sim | — |

O código `Validacoes.gs` não tem IDs nem URLs e não abre outros arquivos: só a planilha em que está.

## 4. Web App

Não há. O código é um gatilho simples `onEdit`:

- executa com a identidade de **quem edita**, sem autorização (não pode chamar serviços que exigem autorização);
- só escreve em K e L e na nota de K das 6 abas da grade;
- a caixa `SpreadsheetApp.getUi().alert` aparece só para quem fez a edição.

## 5. Configuração

Nenhuma chave. Constantes no topo do código: abas, linha inicial, colunas, tipos, `MAX_LINHAS` (50) e `MAX_AVISOS` (10). As propriedades antigas `BACKUP_FOLDER_ID` e `GRADE_ADMINS` devem estar apagadas ([migração](../../../sistemas/estrutura-curricular/planilha-grade/README.md)).

## 6. Logs

- Eventos registrados: falha da validação (`console.error`) e caixa de aviso que não abriu (`console.warn`), só com a mensagem técnica do erro.
- Proibido em log: conteúdo das linhas, docentes, e-mails.
- Debug: **Apps Script › Execuções**.

## 7. Compartilhamento e acesso

- Planilha: Restrita; edição para as secretarias e o Serviço de Graduação. Quem tem edição pode alterar o código do projeto e desligar as validações: o `onEdit` não é controle de segurança, é ajuda ao preenchimento.
- Proteger M4:M999 e, de preferência, as colunas gravadas pelo envio ([manual](MANUAL_OPERACAO.md#proteções)).
- Revisão de permissões: o painel da auditoria aponta "Pessoa não cadastrada com acesso". Periodicidade: A VALIDAR.

## 8. Dados de teste

- `testar_validacoes_planilha.js`: planilha sintética com códigos `PSA0001`, `PSC0001` e nomes "Fictícia".
- `testar_auditoria_grade.js`: planilha fictícia do simulador do Estrutura Curricular.
- Screenshots: nenhum versionado.

## 9. Pontos LGPD/institucionais

- Finalidade: planejar e divulgar a grade horária da graduação.
- Base legal e retenção das cópias semestrais: **A VALIDAR INSTITUCIONALMENTE**.
- Nomes de docentes: os mesmos divulgados pela grade visual; confirmar com o responsável funcional.

## 10. Incidentes

- Seguir o [procedimento comum](../../seguranca/INCIDENTES.md).
- Preenchimento apagado por engano: recuperar pelo **Histórico de versões** do arquivo ou pela cópia de segurança do último envio.
- Código alterado por terceiros: recolar o `Validacoes.gs` do repositório e conferir as **Execuções**.

## 11. Exceções

- A validação roda com a identidade de quem edita e pode ser desligada por qualquer editor: aceitável porque só ajuda o preenchimento e não protege dados.

## 12. Homologação

Verificação local em [HOMOLOGACAO.md](HOMOLOGACAO.md). O checklist de segurança deve ser concluído no arquivo real.
