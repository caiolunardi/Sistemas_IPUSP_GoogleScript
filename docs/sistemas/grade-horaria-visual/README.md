# Grade Horária visual — página pública da grade

**Versão:** v2.0 (13/10/2026), sobre o código em uso recebido em 13/10/2026 (25 arquivos do projeto vinculado à planilha original da grade). O [código Apps Script](../../../sistemas/grade-horaria-visual/README.md) está versionado e foi verificado localmente; **ainda não foi homologado no `/exec`**. O GitHub não informa qual versão está implantada.

## Finalidade e escopo

Mostrar aos alunos do IP (e a docentes e secretarias) a grade horária do curso de Psicologia, semestre a semestre do curso, com dia, horário, docentes e sala de cada disciplina; consultar grades de semestres anteriores; exportar a grade em PDF.

A página é a última etapa do ciclo da grade horária:

```text
Júpiter → Estrutura Curricular (importa, prepara, envia) → planilha das secretarias
          (Validacoes.gs no onEdit; auditoria pelo Estrutura Curricular)
          → cópia de segurança a cada envio novo (índice das grades anteriores)
          → Grade Horária visual (esta página: lê a planilha e as cópias)
```

Fora do escopo: preencher, validar, copiar ou auditar a grade. Isso é feito pelo [Estrutura Curricular](../estrutura-curricular/README.md) e pela [planilha das secretarias](../../../sistemas/estrutura-curricular/planilha-grade/README.md). A página não grava nada em planilha nenhuma.

## Por que continua na planilha original

O link público da grade é a implantação `/exec` do projeto Apps Script **vinculado à planilha original**. Para não trocar o link, o projeto continua lá, mas a v2.0 não lê mais as abas dela: localiza tudo pelo índice mestre `ID_INDEX`. As abas da planilha original ficam sem uso.

## Funcionamento

- **Abertura:** a página chama `obterConfiguracaoGrade()` (lista para o seletor) e `obterGrade("")` (grade atual). A grade atual é a planilha da chave `GRADE_HORARIA_PREENCHIMENTO` no `ID_INDEX`; o semestre dela vem do nome do arquivo ("Grade Horária - 1º Semestre de 2027" → 2027/1), o mesmo que o envio da grade grava.
- **Consultar Grades Anteriores:** seletor no cabeçalho. Primeira opção: **Grade atual (AAAA - Xº Semestre)**; depois, as grades do índice `INDEX_GRADE_HORARIA_VERSOES_ANTERIORES` (coluna `Semestre` no formato AAAA/S e coluna `ID`), exibidas como "2026 - 1º Semestre", da mais recente para a mais antiga. Ficam de fora linhas sem ID (por exemplo, a do semestre atual, que a auditoria cria antes de existir cópia), semestres fora do formato e o próprio semestre atual; semestre repetido usa a última linha. Escolher uma opção chama `obterGrade("AAAA/S")`; o servidor procura o ID no índice e o navegador nunca recebe IDs. Uma falha mantém a grade anterior na tela, com aviso, e volta o seletor.
- **Faixa da grade exibida:** acima do quadro, ano/semestre, etiqueta **Grade atual** ou **Grade anterior**, horário da leitura, legenda das cores e o atalho "Como ler a grade?".
- **Botões de semestre do curso:** paridade do semestre da grade (AAAA/1 → 1º, 3º, 5º, 7º, 9º; AAAA/2 → 2º, 4º, 6º, 8º, 10º) **mais** qualquer outro semestre ideal que tenha disciplina naquela grade (ex.: um 4º semestre numa grade ímpar), em ordem numérica. Se o semestre da grade não puder ser identificado, só os que têm disciplina. Trocar de semestre filtra no navegador, sem nova leitura; ao trocar de grade, o semestre escolhido é mantido quando existe na outra.
- **O que entra no quadro** (regra do servidor, `disciplinaDaLinha_`): abas PSA, PSC, PSE, PST, Interdepartamentais e Outras Unidades, linha 4 em diante; **Será oferecida = SIM**; modalidade diferente de **Prática**; **semestre ideal de 1 a 10** (vazio = disciplina do IP para outros cursos, que não entra; disciplinas de outras unidades ministradas para o IP, como Estatística, entram); dia de segunda a sexta; início e fim em HH:mm com fim depois do início. Disciplina que começa fora dos horários do quadro (08:00–12:00 e 13:30–18:00, em meias horas) não é desenhada e é contada num aviso.
- **Quadro e post-its:** o desenho da versão em uso foi mantido (posição pelo dia/início, altura pela duração, deslocamento em escada nos conflitos, hover). Cores: verde = Obrigatória, azul = Eletiva, rosa = Livre (os nomes antigos "Obrigatórias", "Optativas Eletivas", "Optativas Livres" são aceitos).
- **Ficha da disciplina:** clique ou Enter no post-it. Código, departamento/unidade (pelo prefixo do código), nome, tipo, créditos-aula, dia, horário, docentes (um por linha) e sala. A **Sala** é procurada pelo título "Sala" na linha 3 de cada aba; sem coluna ou sem valor, "A definir". Fecha pelo ×, Esc ou clique fora.
- **Exportar PDF:** uma página A4 paisagem por botão de semestre da grade exibida, título "Nº Semestre — Grade Horária — AAAA - Xº Semestre", arquivo `Grade_Horaria_AAAA-S.pdf`; sempre na paleta clara; conflitos lado a lado. Feito no navegador (html2canvas + jsPDF do cdnjs), sem nova leitura.
- **Cache:** grade atual 120 s (as secretarias podem estar editando), grades anteriores 6 h, lista de anteriores 10 min. `diagnosticarGradeVisual()` limpa o cache da grade atual e da lista.
- **Tema:** Sistema, Claro e Escuro; preferência local (`gradip-theme`).
- **Ajuda:** Central estática e client-side (botão **Ajuda** e "Como ler a grade?"). Texto-fonte em [AJUDA.md](AJUDA.md).

## Documentos

| Documento | Conteúdo |
|---|---|
| [MANUAL_OPERACAO.md](MANUAL_OPERACAO.md) | Instalação na planilha original (manter, substituir, criar, apagar), configuração, diagnóstico, conferência e manutenção. |
| [AJUDA.md](AJUDA.md) | Texto-fonte da Central de Ajuda, FAQ e gatilhos. |
| [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md) | Dados tratados, recursos, acesso, logs e pendências. |
| [HOMOLOGACAO.md](HOMOLOGACAO.md) | Base recebida, o que mudou, hashes e verificação local. |

## Versões

| Versão | Alterações |
|---|---|
| 1.0 (em uso) | Projeto da planilha original: a página lia as abas da própria planilha (`getActiveSpreadsheet`), botões pela célula `DataBase!V3` (PAR/ÍMPAR), tema GRADIP Claro/Escuro; o mesmo projeto tinha menu, backup, novo semestre, registro de edições, validações e preenchimento das abas. |
| 2.0 | Lê a planilha das secretarias e as grades anteriores pelo `ID_INDEX`; seletor **Consultar Grades Anteriores**; botões pela paridade do semestre da grade + extras; regras de entrada explícitas (outros cursos fora); Sala pelo título; tipos novos e antigos; Central de Ajuda; ficha com ×, Esc e teclado; avisos de semestre vazio, horário fora do quadro e falha; escape de HTML; PDF da grade selecionada. Removidos 19 arquivos sem uso. Não homologado no `/exec`. |
