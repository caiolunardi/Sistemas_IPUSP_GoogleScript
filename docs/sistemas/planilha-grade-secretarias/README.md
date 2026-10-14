# Planilha das secretarias (Grade Horária) — preenchimento

**Versão do código da planilha:** 1.1 (14/10/2026). Fonte em [`sistemas/estrutura-curricular/planilha-grade/Validacoes.gs`](../../../sistemas/estrutura-curricular/planilha-grade/Validacoes.gs). A 1.1 foi verificada localmente com planilha sintética; **a colagem no projeto da planilha e o teste no Google estão pendentes** ([homologação](HOMOLOGACAO.md)).

## Finalidade

É a planilha Google em que as secretarias dos departamentos informam ao Serviço de Graduação, a cada semestre, como serão oferecidas as disciplinas de graduação: se a disciplina será oferecida, docentes, dia, horário, vagas, observações e sala. Hoje é a única "interface" das secretarias no ciclo da grade. Um front-end próprio para elas está previsto (ver [Futuro](#futuro-front-end-das-secretarias)).

A planilha não é um Web App: as secretarias editam o arquivo diretamente, com permissão de edição no Drive. O único código dela é um gatilho simples `onEdit` com as validações.

## Lugar no ecossistema

```text
Júpiter ─► Estrutura Curricular (importa, prepara e ENVIA a grade do semestre)
              │  grava C/D/E/I/J e a fórmula de M, renomeia o arquivo,
              │  copia a versão anterior e cria a auditoria do semestre
              ▼
        PLANILHA DAS SECRETARIAS  ◄── secretarias preenchem
              │  Validacoes.gs (onEdit simples): Prática, conflito de horário
              │  acionadores do Estrutura Curricular: auditoria de edições e aberturas
              ▼
        Grade Horária visual (lê a planilha atual e as cópias; página pública)
```

| Sistema | Relação com a planilha | Documentação |
|---|---|---|
| Estrutura Curricular | envia a grade (apaga B4:S999 depois da cópia de segurança, grava as disciplinas, a fórmula do fim e o nome), instala os acionadores de auditoria e mostra o painel da auditoria | [docs](../estrutura-curricular/README.md) · [contrato das colunas](../estrutura-curricular/MODELO_DE_DADOS.md#índices-e-planilha-das-secretarias) |
| Grade Horária visual | só leitura, para a página pública | [docs](../grade-horaria-visual/README.md) |
| `ID_INDEX` | a planilha é a chave `GRADE_HORARIA_PREENCHIMENTO` | [dados e segurança](DADOS_E_SEGURANCA.md) |

## Estrutura do arquivo

**Nome:** "Grade Horária - 1º semestre de 2027" (o envio renomeia; o semestre da grade é lido do nome por todos os sistemas).

| Aba | Conteúdo |
|---|---|
| Informações | título, versão, texto de apresentação e link/QR code da grade visual |
| PSA, PSC, PSE, PST | disciplinas de cada departamento |
| Interdepartamentais | disciplinas interdepartamentais |
| Outras Unidades | disciplinas de outras unidades ministradas para o IP |
| DataBase (oculta) | lista de docentes trazida de outra planilha por `IMPORTRANGE`, usada na lista suspensa de docentes |

### Colunas das 6 abas da grade

Cabeçalho na linha **3**, dados da linha **4** à **999**. "Quem grava" diz se a coluna vem do envio do Estrutura Curricular ou é preenchida pela secretaria.

| Col. | Título | Quem grava | Valores |
|---|---|---|---|
| B | Cadastro | secretaria | caixa de seleção (linha fica amarela quando marcada) |
| C | Código | envio | código da disciplina |
| D | Nome | envio | nome (com observações, conforme a montagem do envio) |
| E | Tipo | envio | Obrigatória / Eletiva / Livre (cores: verde, azul, rosa) |
| F | Modalidade | secretaria | Teórica / Prática |
| G | Será oferecida | secretaria | SIM / NÃO (NÃO destaca a linha) |
| H | Docente(s) ministrante(s) | secretaria | lista de docentes (DataBase) |
| I | Semestre Ideal | envio | 1 a 10; vazio = disciplina do IP para outros cursos |
| J | Créditos Aula | envio | número; 1 crédito = 1 hora de aula |
| K | Dia da semana | secretaria | Segunda-Feira … Sexta-Feira, Horário Variável, Não será oferecida |
| L | Horário de Início | secretaria | 08:00 … 12:00 e 13:30 … 17:30, de meia em meia hora; Não será oferecida; "-- : --" |
| M | Horário de Fim | envio (fórmula) | início + créditos-aula, em texto HH:mm; **deve ficar protegida** |
| N–Q | Vagas (alunos do IP, livres USP, intercambistas, 60+) | secretaria | número; na linha 2, acima das vagas, o aviso "Cadastrar como Especial no jupiterweb" |
| R | Observações | secretaria | texto livre |
| S | Sala | secretaria | lista; só informativa, fora das validações |
| T em diante | auxiliares (Docente Ministrante, Turma…) | — | preservadas pelo envio |

O envio mexe só em **B:S** das linhas 4–999. Linhas 1–3, colunas T+ e as outras abas são preservadas.

## Validações (`Validacoes.gs`, gatilho simples `onEdit`)

Rodam sozinhas a cada edição, com as permissões de quem edita, só nas 6 abas da grade e da linha 4 em diante. Só alteram K e L (e a nota de K); leem o resto.

1. **Modalidade "Prática"** (F) → Dia = "Horário Variável" e Início = "-- : --" (o fim acompanha pela fórmula).
2. **Conflito de horário.** Ao escolher o dia (K) ou o início (L) de uma disciplina **Eletiva** ou **Livre**, procura nas 6 abas uma **Obrigatória** do **mesmo semestre ideal**, no **mesmo dia**, com horário sobreposto (fim = início + créditos). Encostar não é conflito: 08:00–10:00 e 10:00–12:00 passam. Achando:
   - grava na célula do **Dia da semana** a nota "Conflito de horário" com a optativa, o horário, a obrigatória (código, nome e aba) e o horário dela;
   - apaga o Dia e o Início da linha editada;
   - **(1.1)** abre para quem editou a caixa **"Conflito de horário"** com o mesmo texto e o botão OK.

   Sem conflito, a nota antiga sai. Obrigatórias não são verificadas entre si, nem optativas entre si.
3. **Caixa de aviso (1.1):**
   - aparece **depois** de gravar a nota e apagar os horários. O gatilho simples tem limite de 30 s; se a pessoa demorar a clicar em OK, a validação já valeu;
   - uma colagem com vários conflitos gera **uma** caixa com a lista (até 10 por extenso, o resto como "e mais N");
   - não aparece no **app de celular** do Planilhas Google: lá fica só a nota e a limpeza;
   - não pede autorização nova às secretarias. Se a caixa não puder abrir, nada é desfeito, e o log registra só a mensagem de erro.
4. Colagens de mais de **50 linhas** não são verificadas linha a linha (limite de tempo do gatilho). A Prática é aplicada mesmo assim.

## Pontos de atenção encontrados na cópia de 1º/2027

Achados na exportação `.xlsx` recebida em 14/10/2026, sem alteração nesta rodada:

- As **listas suspensas** (E, F, G, H, I, K, L, S) cobrem só até a linha **91–92** de cada aba, mas o envio pode gravar até a linha 999. Uma aba com mais disciplinas fica sem lista nas linhas de baixo. As validações do script valem em todas as linhas.
- Na exportação, as listas de **Docentes (H)** e **Sala (S)** aparecem como `#REF!`. Provavelmente é só o Excel sem acesso à faixa de origem; **conferir no Google** se as listas abrem.
- A lista do Semestre Ideal (I) inclui "Não será oferecida", e as de K e L também. Essas opções não disparam a verificação de conflito.
- A coluna **Sala** já existe nas 6 abas.
- A exportação não traz as **proteções** do Google; conferir no arquivo se M4:M999 está protegida nas 6 abas ([manual](MANUAL_OPERACAO.md#proteções)).

## Futuro: front-end das secretarias

Está previsto um front-end próprio para as secretarias. Para não começar do zero, ele deve:

- ler e gravar nas **mesmas posições** de coluna (o envio e a grade visual dependem delas) ou mudar os três sistemas juntos;
- reaproveitar as regras desta página (Prática; conflito optativa × obrigatória por semestre ideal, dia e sobreposição; fim = início + créditos);
- seguir o tema GRADIP e a Central de Ajuda do repositório, com o caderno de segurança dos sistemas (autorização no servidor, sem IDs no navegador);
- decidir com a equipe se a planilha continua editável diretamente (e então `Validacoes.gs` fica) ou passa a ser só armazenamento.

## Documentos

| Documento | Conteúdo |
|---|---|
| [MANUAL_OPERACAO.md](MANUAL_OPERACAO.md) | instalar/atualizar o código, proteções, novo semestre, problemas comuns |
| [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md) | dados, recursos, acesso, logs e pendências |
| [HOMOLOGACAO.md](HOMOLOGACAO.md) | verificação local da 1.1 e roteiro de teste no Google |
| [Código e passo a passo da migração](../../../sistemas/estrutura-curricular/planilha-grade/README.md) | `Validacoes.gs` e a limpeza do projeto antigo (25 arquivos) |

## Versões

| Versão | Data | Alterações |
|---|---|---|
| 1.0 | 02/10/2026 (Estrutura Curricular 1.6.0) | `Validacoes.gs` substitui os 25 arquivos antigos; Prática; conflito com nota e limpeza; tipos corrigidos para "Obrigatória/Eletiva/Livre"; fim por fórmula gravada pelo envio. |
| 1.1 | 14/10/2026 | Caixa "Conflito de horário" para quem editou, depois da nota e da limpeza; uma caixa por edição; teste sintético `testar_validacoes_planilha.js`. Documentação própria da planilha. |
