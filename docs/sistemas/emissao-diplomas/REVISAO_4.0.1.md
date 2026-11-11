# Revisão 4.0.1 — pasta compartilhada e integridade das inclusões

**Para quem audita.** PR 1 do plano de reformulação do Formulário de Pedido de Colação de Grau, aprovado pelo responsável em 06/11/2026 (documentação do formulário no PR #46; o plano entra no repositório no PR 0). Classe de risco: **crítica** (exclusão de dados e gravação em planilha compartilhada). Base: `main` `4792667` (4.0.0). Só `src/DiplomasBackend.gs`, os textos de exclusão em `DiplomasApp.html` e `DiplomasAjuda.html` mudam; nenhuma chave do `ID_INDEX`, Script Property, coluna, aba ou permissão nova.

## 1. Problemas corrigidos

| ID | Onde (4.0.0) | Defeito | Consequência |
|---|---|---|---|
| A2 | `excluirAlunoInterno_` + `outrosRegistrosUsamPasta_` | Mandava a pasta do Nº USP para a lixeira quando nenhuma **outra linha** tinha o cache de pasta (Link/ID da Pasta) preenchido, e apagava o "ID da Pasta" na planilha central. O cache só existe em linhas em que o Gerenciador já abriu a pasta. | Excluir o registro de 2026/2 podia levar os documentos de 2025/2 da mesma pessoa e deixar outros sistemas sem a pasta. |
| A3a | `adicionarAluno` | Reservava `getLastRow() + 1`, limpava a linha e gravava célula por célula; coluna obrigatória ausente era descoberta no meio. Não havia conferência de duplicidade. | Linha pela metade; dois registros do mesmo Nº USP na mesma colação; outra gravação fora deste projeto no mesmo instante podia cair na mesma linha. |
| A3b | `garantirPastaAlunoCentral_` | Autocadastro com `getLastRow() + 1` célula por célula; com Nº USP repetido na central usava a primeira linha; gravava a pasta nova sem reler a coluna E. | Cadastro misturado com o de outra pessoa; pasta gravada por outro sistema sobrescrita; ID de pasta gravado na linha errada se a linha mudasse de lugar. |

## 2. O que a 4.0.1 faz

| Função | Antes | Agora |
|---|---|---|
| `excluirAlunoInterno_` (usada por `excluirAluno` e `excluirAlunosEmLote`) | lixeira condicional da pasta + limpeza do ID na central + `deleteRow` | só `deleteRow`. `outrosRegistrosUsamPasta_` e `limparIdPastaNaCentral_` saíram (sem outro uso) |
| `adicionarAluno` | como acima | sob o `ScriptLock`: recusa Nº USP + colação já existente (Nº USP normalizado); resolve **todas** as colunas antes de gravar; monta a linha inteira e grava com uma chamada (`appendRow`); `conferirInclusao_` localiza a linha pelo Registro ID (erro se ausente ou repetido) e confere Nº USP, nome e colação |
| `garantirPastaAlunoCentral_` | como acima | `linhaUnicaAlunoCentral_` (Nº USP repetido → erro, nada gravado); autocadastro com `appendRow` e releitura; antes de gravar a pasta nova, relocaliza a linha e relê a coluna E; se outra pasta apareceu, usa a outra e descarta só a pasta nova **vazia** criada nesta execução (`descartarPastaNovaVazia_`); depois de gravar, confere de novo |

`appendRow` não é tratado como garantia entre projetos (requisito 1 do responsável): a defesa é ler antes, gravar numa chamada e conferir depois, falhando fechado.

## 3. Avaliação de regressão

- **Chamadores.** `garantirPastaAlunoCentral_` só é chamada por `garantirPastaInterno_`, usada em upload, exclusão de anexo, observações, documentos, relatórios e análise de histórico; todas passam a falhar com mensagem clara quando o Nº USP está repetido na central (antes seguiam com a primeira linha). A leitura (`obterDetalheAluno`, `localizarPastaSemGravar_`) continua usando a primeira ocorrência, como antes, porque não grava.
- **Comportamento visível.** Exclusão deixa de apagar pastas: pastas de alunos excluídos ficam no Drive e precisam de limpeza manual, se um dia for desejada. A inclusão duplicada passa a ser recusada. Textos de tela e da Central de Ajuda atualizados.
- **Sem mudança:** etapas, e-mails, documentos, análise de histórico, acesso e perfis, migração de Registro ID, `rebindPastaAposEdicao_` (renomeia a pasta quando o nome muda; não apaga).
- **Suítes:** `testar_acesso.js` 39 ok, `testar_historico.js` 484/486 (as mesmas 2 que dependem da planilha real), `testar_navegador.js` 21 ok, `testar_integridade.js` 21 ok. A suíte nova contra o código da 4.0.0 dá 5 ok e 16 falhas; as 5 que passam são guardas de regressão (versão desatualizada, LEITOR, dados inválidos, outra colação, pasta já existente).

## 4. Testes negativos (`testes/testar_integridade.js`)

| Tema | Casos |
|---|---|
| Exclusão | outra colação sem cache de pasta; único registro; lote; versão desatualizada; LEITOR; inspeção do código (nada de lixeira nem limpeza da central) |
| Duplicidade | mesmo Nº USP + colação; Nº USP com pontos e espaços; outra colação permitida; Nº USP repetido na central |
| Gravação parcial | coluna obrigatória ausente; dados vazios, colação inválida, dados nulos |
| Concorrência simulada | linha recém-gravada sobrescrita por outro escritor; Registro ID repetido depois de gravar; autocadastro simultâneo do mesmo Nº USP; pasta gravada por outro sistema durante a criação; linha da central que muda de posição; cadastro que some |
| Privacidade | nenhum nome, Nº USP, e-mail, Registro ID ou ID de pasta no registro de execução |

A simulação ganhou `appendRow`, `deleteRow` e `clearContent` em `testes/simulacao.js`.

## 5. Riscos que continuam

- **Edição manual direta na planilha** no mesmo segundo: detectada pela conferência depois de gravar (erro, não sucesso), não impedida.
- **Janela entre a releitura e a gravação da coluna E**: outro sistema pode gravar outra pasta nesses milissegundos; a conferência seguinte detecta e passa a usar a pasta gravada, mas a pasta nova pode ficar com o ID registrado por um instante. Não há transação no Sheets.
- **`aplicarEdicaoDadosPessoais_`** regrava a linha inteira com `setValues` (pode trocar fórmulas pelo valor). Fora do escopo; registrado para PR próprio.
- **Exclusão de anexo** (`excluirArquivo`) ainda manda o arquivo para a lixeira sem conferir uso por outro pedido; entra no PR 6 do plano, junto com o registro de documentos.
- **Autocadastro** continua existindo por compatibilidade e sai antes da integração com o formulário (D6, PR 4).

## 6. Homologação no Google

Roteiro I1–I6 em [HOMOLOGACAO.md](HOMOLOGACAO.md#401-06112026--em-pr-não-enviada-ao-google), com os [dados fictícios](dados-ficticios/README.md#401--integridade-roteiro-i1i6-do-homologacaomd). Nada foi enviado ao Google; envio e produção dependem de autorização do responsável.
