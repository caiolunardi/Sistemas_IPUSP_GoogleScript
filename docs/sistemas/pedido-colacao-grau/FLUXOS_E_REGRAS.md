# Fluxos e regras atuais — formulário de colação

**Referência:** arquivos privados fornecidos em 06/11/2026; regras descritas como **comportamento do código**, não como testes executados no Google.

## 1. Abertura da página

1. `doGet` lê `Session.getActiveUser().getEmail()`; caso não identifique um e-mail terminado em `@usp.br`, serve uma página restrita, sem o formulário principal.
2. O cliente chama `obterDadosIniciais`: primeiro obtém período vigente; período ausente/inválido gera tela de erro, período fechado gera mensagem de fechamento.
3. Havendo período aberto, localiza o cadastro pelo e-mail da sessão, pré-preenche os campos e procura um pedido na mesma colação **se o cadastro tem nº USP**.
4. Quando há pedido anterior na colação, um `confirm` pergunta se o aluno deseja corrigir. Recusa leva ao Painel de Solicitações; aceite preenche os campos gravados, mostra aviso de correção e **exige novo envio dos dois arquivos**.
5. Só então o formulário é exibido.

**Limite:** o endpoint de dados iniciais não demonstra a mesma checagem explícita de domínio que `doGet`; a autorização integral de todas as entradas deve ser reavaliada. Não publicar o código bruto até isso ocorrer.

## 2. Período e semestre

O formulário usa a **primeira aba** da planilha `PERIODOS`. Localiza pela coluna A (normalização de caixa, acento e espaços) a linha `Pedido de Colação de Grau`.

| Campo | Coluna | Regra do backend |
| --- | --- | --- |
| Tipo de período | C | Se começa com `cont`, abre independentemente de datas; demais tipos usam janelas |
| Abertura/fechamento principal | D/E e F/G | Datas e horários inclusivos |
| Janela alternativa | H/I e J/K | Também aceita quando preenchida, embora o Painel dos Servidores trate Colação como período único |
| Semestre acadêmico da colação | M | Texto `AAAA/S`, com ano de quatro dígitos e semestre de um dígito |
| Identificador gravado | M derivado | `AAAAS`; ex.: `2026/2` vira `20262` |
| Horário | todas as janelas | Comparado no fuso `America/Sao_Paulo` |

Se a linha/coluna M estiver ausente ou em formato inesperado, devolve erro. O módulo `ConfigFormularioColacaoGrau.gs` do [Painel dos Servidores](../painel-servidores/README.md) define um período sazonal único em D–G, limpa H–K e mantém o semestre em M. **Não confundir o configurador do painel com o código do formulário.**

O código de leitura aceita datas em texto `dd/mm/aaaa` ou objetos Date do Sheets, e horário em texto ou Date. Ainda é necessário validar limites de calendário e horários na futura suíte.

## 3. Formulário e validações

| Grupo | Campos/regra atuais |
| --- | --- |
| Identidade | Nome, nº USP, ano de ingresso; e-mail institucional só leitura no HTML, oriundo da sessão |
| Documentos | RG/CIN obrigatório, nº do RG/CIN, certidão de nascimento obrigatória |
| Cursos concluídos | Pelo menos uma de Formação de Psicólogo(a), Bacharelado e Licenciatura |
| Matrícula seguinte | Resposta SIM/NÃO; interface mostra como pendentes apenas cursos não selecionados como concluídos |
| Contatos | Telefone celular e e-mail pessoal alternativo obrigatórios no cliente |
| Procuração | SIM/NÃO; se SIM, nome e RG/CIN do procurador obrigatórios |
| Antecipação | SIM/NÃO; observações opcionais |
| Anexos | Até 15 MiB **por arquivo** no servidor; bloqueio por lista de extensões perigosas; MIME recebido do cliente |

No servidor, nome, RG, contato, observações e campos correlatos são sanitizados/limitados. Nº USP é normalizado para dígitos (máximo 15); ano de ingresso exige quatro dígitos entre 1950 e ano corrente + 1. Os estados SIM/NÃO são normalizados. Habilitação pendente não pode ser simultaneamente marcada concluída. **Não pressupor** que essas validações provam identidade, propriedade do pedido, autenticidade de documento, consistência de MIME ou restrição a tipos permitidos.

## 4. Envio inicial

`enviarPedidoColacao` verifica novamente a sessão `@usp.br` e o período, valida o payload, cadastra/complementa o cadastro central (nome, nº USP, ingresso, e-mails), assegura a pasta por nº USP, grava ambos os arquivos e só depois cria uma linha na aba `Diplomas`. Gera `Registro ID` UUID, `Versão=1`, `Status — Dados Pessoais` vazio e grava a colação vigente `AAAAS`.

Os dados são escritos em colunas procuradas pelo **título literal do cabeçalho**; a função cria uma coluna nova se não encontrar determinado título. Não existe conferência completa do esquema antes de gravar, nem rollback transacional entre planilha central, Drive e planilha de Diplomas.

## 5. Correção do pedido no mesmo semestre

O backend procura primeiro registro cujo nº USP e código da colação coincidam. Se encontrar:

- Mantém o `Registro ID` e incrementa `Versão` (a intenção é detectar edições obsoletas no Gerenciador).
- Atualiza dados do aluno e da solicitação, mas **não reinicializa** os status das etapas administrativas já existentes.
- Volta a exigir os dois anexos e pode substituir arquivos com nomes finais iguais, sem confirmação detalhada.
- **Não** compara a versão esperada enviada pelo cliente; o incremento de versão é uma consequência da gravação, não um controle de concorrência completo.
- Não limpa automaticamente colunas de ano de habilitações que deixaram de estar concluídas.

## 6. Exceções, concorrência e falhas parciais

- Travas do tipo `ScriptLock` no cadastro, na pasta e na planilha de Diplomas, em fases separadas; não constituem transação única nem lock distribuído com o Gerenciador, que é outro projeto Apps Script.
- Arquivos são gravados **antes** do registro de solicitação. Se uma fase posterior falhar, alterações anteriores podem permanecer; não há compensação geral.
- Identificação de pedido repetido é verificada novamente no servidor, mas a integridade de titularidade precisa de validação específica antes da modernização.
- Não existe etapa de aprovação acadêmica ou verificação do histórico no formulário; isso pertence ao Gerenciador.
