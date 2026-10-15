# Base única de disciplinas (planilha DISCIPLINAS)

**1.12.0 (15/10/2026):** etapa 1, a migração. Código em [`BaseDisciplinas.gs`](../../../sistemas/estrutura-curricular/src/BaseDisciplinas.gs), testes em [`testar_base_disciplinas.js`](../../../sistemas/estrutura-curricular/testes/testar_base_disciplinas.js). Implantação e homologação no Google pendentes.

## Para que serve

A planilha da chave `DISCIPLINAS` no `ID_INDEX` é o cadastro de disciplinas do Serviço de Graduação, lido por todos os apps: grade horária, formulários de exclusão e trancamento parcial e consultas (créditos, semestre ideal, modalidade…). Cobre o universo IPUSP e também disciplinas sem relação com o IP, que alunos cursam como optativas e às vezes trancam.

| universo | o que é | grade horária |
|---|---|---|
| `IP` | do IP, no currículo do IP | sim |
| `IP_PARA_OUTRAS` | do IP, ministrada para outras unidades | sim |
| `OUTRA_PARA_IP` | de outra unidade, no currículo do IP | sim |
| `EXTERNA` | de outra unidade, sem relação com o IP | não |

## Decisões do usuário (15/10/2026)

- Duas planilhas que conversam: DISCIPLINAS guarda o cadastro (uma linha por disciplina); a ESTRUTURA_CURRICULAR fica com o que vem do Júpiter por currículo (Currículos, Requisitos, Importações, Alterações). As abas Disciplinas, Ajustes manuais e Disciplinas para outros cursos da estrutura serão substituídas, **sem perder funcionalidade do app**.
- Tipo e período ideal mudam por habilitação: aba própria (disciplina × currículo), com um resumo "principal" na linha da disciplina.
- Ao importar CSV/PDF do Júpiter, conferir as diferenças e confirmar antes de gravar (etapa 3).
- Troca de código: na conferência, a pessoa escolhe entre "mesma disciplina" (mantém o `disciplina_id`, o código antigo vai para `codigos_anteriores`) e "disciplina nova" (a antiga fica `Substituída`, com `substituida_por`). A ficha da disciplina também permite alterar o código.
- Modalidade: só **Teórica** e **Prática**.
- Nenhuma restrição de trancamento ou exclusão por disciplina: não há campo para isso.
- Duas observações: `observacao_grade` (vai para as secretarias) e `observacao_interna` (só a equipe).
- Pré-carga de grade a partir de uma antiga: copia modalidade, será oferecida, docentes, dia, início, vagas, observações e colunas de práticas; **não** copia a sala. A lista de disciplinas continua vindo da base.

## Chave primária

`disciplina_id` = `disc_` + UUID (`Utilities.getUuid()`), a mesma convenção das Regras Curriculares do Painel dos servidores. Gerada uma vez, nunca editada nem reaproveitada. Outros apps devem guardar o `disciplina_id`, não o código. O código é a chave de negócio: único entre as linhas não `Substituída` (a migração recusa gravar se houver repetição).

## Abas e colunas

Títulos em `snake_case`, lidos pelo título (a ordem não importa). Cada coluna tem uma nota explicativa no cabeçalho.

- **DISCIPLINAS**: `disciplina_id`, `codigo`, `codigos_anteriores`, `versao`, `nome`, `universo`, `uso_grade`, `unidade_sigla`, `departamento`, `prefixo`, `creditos_aula`, `creditos_trabalho`, `creditos_total`, `ch_total`, `ce_estagio`, `cp_praticas`, `ext_extensao`, `atpa`, `habilitacoes`, `oferta_resumo`, `tipo_principal`, `semestre_ideal_principal`, `semestre_oferecimento`, `na_estrutura_atual`, `unidade_atendida`, `curso_atendido`, `na_grade`, `modalidade`, `observacao_grade`, `observacao_interna`, `situacao`, `ativacao_jupiter`, `desativacao_jupiter`, `substituida_por`, `link_jupiter`, `origem_registro`, `chave_estrutura`, `criada_em`, `criada_por`, `atualizada_em`, `atualizada_por`, `revisao`.
- **OFERTA_HABILITACAO**: `disciplina_id`, `codigo`, `curriculo`, `curso`, `habilitacao_codigo`, `habilitacao`, `tipo`, `periodo_ideal`, `semestre_oferecimento`, `oferta_ajustada`, `requisitos_resumo`.
- **HISTORICO**: `registrado_em`, `registrado_por`, `disciplina_id`, `codigo`, `operacao` (CRIADA/ALTERADA), `campo`, `antes`, `depois`, `origem`.
- **DICIONARIO**: `dominio`, `codigo`, `rotulo`, `descricao` (universo, situação, modalidade, tipo, origem).
- **LEIA-ME**: texto para quem abre a planilha.

`tipo_principal` e `semestre_ideal_principal` seguem a regra do envio da grade: Psicólogo, depois Bacharelado, depois Licenciatura. `uso_grade` é calculado pelo universo.

## Migração (etapa 1)

O que copia: abas Disciplinas, Ajustes manuais, Disciplinas para outros cursos e Disciplinas por habilitação, com os ajustes do painel aplicados (nome, código, créditos, oferta, semestre de oferecimento, exclusão, seleção para a grade, observações). Não muda nada na ESTRUTURA_CURRICULAR nem no painel.

| Coluna | Na migração |
|---|---|
| vindas da estrutura (nome, créditos, oferta, situação…) | atualizadas a cada rodada; cada mudança vai para HISTORICO |
| `universo`, `unidade_sigla`, `origem_registro` | calculadas na criação; depois só se estiverem vazias |
| `modalidade`, `observacao_interna`, `codigos_anteriores`, `substituida_por` e colunas extras | nunca escritas pela migração |
| situação `Substituída` | nunca desfeita pela migração |

Rodar de novo não duplica: `chave_estrutura` (`estrutura:CÓDIGO` ou `outros:IDENTIFICADOR`) liga cada linha à origem. Uma linha sem `chave_estrutura` com o mesmo código é reaproveitada (mantém o ID). Linhas que não vieram da estrutura, como uma disciplina externa cadastrada à mão, ficam intactas.

### Como rodar

1. Crie a planilha e a linha `DISCIPLINAS` / `spreadsheet` / ID de produção no `ID_INDEX` (já feito pelo usuário). A conta que implantou o Web App precisa ser **editora** da planilha.
2. Copie `BaseDisciplinas.gs` para o projeto Apps Script do Estrutura Curricular (raiz, como os outros) e substitua `Codigo.gs` (versão 1.12.0).
3. No editor, execute `simularMigracaoDisciplinas` e confira em "Registros de execução" as contagens (por universo e situação) e os avisos. Nada é gravado.
4. Execute `migrarDisciplinasParaBaseUnica`. O registro mostra o mesmo resumo com `gravado: true`.
5. Confira a planilha. Para refazer depois de mudanças na estrutura, rode de novo.

As duas funções exigem perfil de administrador e usam a trava do sistema. Resultado no registro: só contagens, códigos de disciplina e avisos, sem e-mails.

## Próximas etapas

1. ✓ Migração (1.12.0).
2. O app passa a ler e gravar a lista de disciplinas, ajustes, seleção para a grade e observações na planilha DISCIPLINAS, só com `uso_grade` = Sim; ficha com modalidade e observação interna. O envio grava a modalidade na coluna F.
3. Importação do Júpiter com conferência das diferenças antes de gravar, incluindo a escolha em troca de código.
4. Pré-carga da grade a partir de uma grade anterior do índice.
5. Leitura pelos outros apps (formulários de exclusão e trancamento), só leitura.
