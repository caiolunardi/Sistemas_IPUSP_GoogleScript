# Dados e segurança — Grade Horária visual

**Revisão da fonte para Git:** 13/10/2026. O preflight de conteúdo foi feito (sem IDs, URLs de implantação ou dados pessoais na fonte e nos testes); o [checklist de segurança](../../seguranca/SECURITY_CHECKLIST.md) do ambiente depende da implantação real.

## 1. Escopo

- Sistema: Grade Horária visual (v2.0).
- Público: alunos do IP, docentes e secretarias; página de consulta, sem login próprio.
- Ambiente: fonte Git; implantação em produção existente (projeto vinculado à planilha original), sem homologação desta versão.
- Responsável funcional: Serviço de Graduação — A VALIDAR (nome não registrado aqui).
- Última revisão: 13/10/2026.

## 2. Dados tratados

| Categoria | Exemplo abstrato | Finalidade | Origem | Destino | Persistência | Classe |
|---|---|---|---|---|---|---|
| Oferta de disciplinas | código, nome, tipo, semestre ideal, créditos, dia, horário, sala | mostrar a grade | planilha das secretarias / cópias | navegador | em memória enquanto a página está aberta; cache do script (até 6 h) | Interno, de divulgação pública ao curso |
| Docentes ministrantes | nome do docente | mostrar quem ministra | coluna H | navegador | idem | Pessoal (função pública docente) |
| Semestres com grade guardada | "2026/1" | seletor de grades anteriores | índice das grades anteriores | navegador | idem | Interno |
| Nome da aba de origem | "PSA" | interno da resposta | planilha | navegador | idem | Interno |
| Horário da leitura | "13/10/2026 às 19:40" | faixa da grade | servidor | navegador | idem | Não pessoal |
| Preferência de tema | `system`/`light`/`dark` | aparência | navegador | `localStorage["gradip-theme"]` | até o usuário trocar | Não pessoal |

Não são lidas nem enviadas as colunas de vagas, observações, cadastro e as auxiliares (T em diante). Não há dado de aluno. O e-mail de quem acessa não é lido.

## 3. Recursos externos

| Nome lógico | Tipo | Config key | Público? | Permissão esperada |
|---|---|---|---|---|
| ID_INDEX | Google Sheets; índice mestre | `Script Properties["ID_INDEX_SPREADSHEET_ID"]` | Não | leitura pela identidade de execução |
| GRADE_HORARIA_PREENCHIMENTO | Google Sheets; planilha das secretarias | chave no `ID_INDEX`, coluna `ID de Produção` | Não | leitura pela identidade de execução |
| INDEX_GRADE_HORARIA_VERSOES_ANTERIORES | Google Sheets; índice das cópias | chave no `ID_INDEX` | Não | leitura |
| Cópias das grades anteriores | Google Sheets | coluna `ID` do índice | Não | leitura |
| html2canvas 1.4.1, jsPDF 2.5.1 | JavaScript de CDN (cdnjs) | URLs fixas em `GradeGrid.html` | Sim | mesmas da versão em uso |
| MARCA_USP_CLARA | PNG externo | URL fixa em `GradipMarcaUSP.html` | Sim | mesma dos outros sistemas |

A fonte versionada não contém IDs nem a URL da implantação. A versão em uso tinha a URL `/exec` escrita em `FormataAba.gs` (aba Informações com QR code); esse arquivo foi descartado e os originais não foram versionados. Usa só `SpreadsheetApp.openById` (sem `DriveApp`, sem escrita).

## 4. Web App

- Quem pode acessar: **A VALIDAR** na implantação (mantida a configuração em uso).
- Executa como: precisa ser **quem implantou** (`USER_DEPLOYING`): os visitantes não têm acesso às planilhas.
- Dados enviados ao cliente: só os da seção 2, das linhas que entram na grade.
- Operações privilegiadas: nenhuma. Não há gravação.

### Autorização server-side

| Operação | Regra no servidor |
|---|---|
| `obterConfiguracaoGrade`, `obterGrade` | nenhuma além do acesso ao Web App (consulta pública, como a versão em uso). |

O navegador escolhe uma grade só pelo semestre (`AAAA/S`, validado por expressão regular); o servidor abre apenas IDs que estão no `ID_INDEX` ou no índice das grades anteriores. Não é possível pedir uma planilha arbitrária. Textos da planilha são escapados antes de entrar no HTML.

Ponto de atenção: com "Executar como: Eu", quem abrir a página vê a grade atual enquanto ela ainda está sendo preenchida pelos departamentos (comportamento pedido: abrir na grade atual). Isso inclui nomes de docentes ainda provisórios.

## 5. Configuração

```text
ID_INDEX_SPREADSHEET_ID
```

Em **Configurações do projeto → Propriedades do script**. As chaves `GRADE_HORARIA_PREENCHIMENTO` e `INDEX_GRADE_HORARIA_VERSOES_ANTERIORES` ficam no próprio `ID_INDEX`. `BACKUP_FOLDER_ID` e `GRADE_ADMINS`, da versão em uso, devem ser apagadas.

## 6. Logs

- Eventos registrados: falha ao abrir uma planilha (`console.error`, com sequências longas cortadas para não registrar IDs); o diagnóstico manual registra nomes de abas, contagem de disciplinas e semestres do índice.
- Proibido em log: IDs, conteúdo das linhas, docentes.

## 7. Compartilhamento e acesso

- `ID_INDEX`, planilha das secretarias, índice e cópias: Restritos; leitura pela conta que implantou. A planilha original fica sem uso pela página.
- Grupos/contas autorizados e revisão de permissões: A VALIDAR.

## 8. Dados de teste

- Fixtures sintéticas nos [testes](../../../sistemas/grade-horaria-visual/testes/README.md) (códigos fictícios, "Docente Teste N", IDs inventados).
- Os dois arquivos enviados para análise nesta rodada (um export da planilha original e um arquivo sem relação, com dados pessoais de alunos) **não** foram versionados nem usados nos testes.
- Screenshots: nenhum versionado.

## 9. Pontos LGPD/institucionais

- Finalidade: divulgação da grade horária do curso.
- Base legal e retenção do cache (até 6 h): **A VALIDAR INSTITUCIONALMENTE**.
- Exibição de nomes de docentes: dado já divulgado pela grade em uso; confirmar com o responsável funcional.

## 10. Incidentes

- Seguir o [procedimento comum](../../seguranca/INCIDENTES.md).
- Grade errada publicada: corrigir na planilha das secretarias e rodar `diagnosticarGradeVisual` para limpar o cache.
- Cópia indevida no índice: remover a linha do índice (a lista se atualiza em até 10 min, ou na hora com o diagnóstico).

## 11. Exceções

- Consulta sem autorização server-side, como a versão em uso, por ser página pública.
- Bibliotecas de PDF carregadas de CDN, herdadas da versão em uso.

## 12. Homologação

Verificação local em [HOMOLOGACAO.md](HOMOLOGACAO.md). O checklist de segurança deve ser concluído na implantação real.
