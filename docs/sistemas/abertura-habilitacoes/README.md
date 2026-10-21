# Abertura de Habilitações — Gerenciador

**Versão:** gerenciador da equipe **v2.0** no repositório (21/10/2026), **NÃO HOMOLOGADO · NÃO IMPLANTADO**. Em uso continua a v1.0, fora do repositório, recebida em 21/10/2026. O código está em [`sistemas/abertura-habilitacoes/gerenciador/`](../../../sistemas/abertura-habilitacoes/gerenciador/README.md). O GitHub não informa qual versão está implantada no Apps Script.

## Finalidade e escopo

Os alunos pedem a abertura de uma habilitação (Bacharelado ou Licenciatura em Psicologia) num Google Forms, que grava na aba `Respostas ao formulário 2` da planilha `ABERTURA_HABILITACOES`. O gerenciador é o Web App em que a equipe do Serviço de Graduação:

- vê os **pedidos pendentes**, em ordem alfabética, com busca por nome ou Nº USP;
- abre cada pedido, escreve **observações**, **conclui** ou **reabre** e **avisa o aluno por e-mail** (opções independentes);
- consulta os **10 concluídos mais recentes** e faz a **busca no histórico**, que inclui a aba `2021 - 2022` (somente consulta);
- vê **relatórios** por habilitação, ano e mês.

O formulário dos alunos (Google Forms) não faz parte deste repositório. O Painel dos servidores conta as pendências desta planilha ([contrato](REGRAS_E_CONTRATOS.md#6-contratos-com-outros-sistemas)).

## O que mudou da 1.0 para a 2.0, em resumo

- **Configuração:** nenhum ID no código; planilhas pelo `ID_INDEX`, com ambiente de homologação.
- **Acesso:** perfis LEITOR e ADMINISTRADOR conferidos no servidor em toda função; quem não está na lista não vê nada. Proposta técnica, a validar.
- **Abrir a página não grava mais nada.** A atribuição de identificadores virou operação expressa (por pedido, em lote pela migração controlada, cujo código de confirmação identifica o plano, ou um a um pela recuperação administrativa).
- **Versão:** um único critério de validade; versão vazia ou malformada não é mais corrigida em silêncio.
- **Salvar:** nada é gravado quando o pedido é recusado; reserva de envio com data e marca própria; a data do envio nunca sobrescreve uma alteração feita durante o envio; "salvo, mas o e-mail falhou" e "e-mail enviado, mas não registrado" são resultados distintos.
- **Voltar à 1.0** tem riscos e condições próprias ([INSTALACAO_E_ATUALIZACAO.md §5](INSTALACAO_E_ATUALIZACAO.md#5-voltar-atrás)).
- **Interface:** padrão GRADIP (tema, menu lateral ou abas, diálogos acessíveis, Central de Ajuda).

Todas as diferenças, uma a uma, com a classificação e o teste: [INVENTARIO_LEGADO.md](INVENTARIO_LEGADO.md).

## Documentos

| Documento | Conteúdo |
|---|---|
| [INVENTARIO_LEGADO.md](INVENTARIO_LEGADO.md) | Inventário da 1.0 e matriz "atual → esperado → teste de equivalência", com a classificação de cada item. |
| [ARQUITETURA.md](ARQUITETURA.md) | Módulos, chamadas da página, leitura em lote, trava e desempenho. |
| [FLUXOS.md](FLUXOS.md) | Abrir a página, listar, detalhar, salvar, avisar, reabrir, preparar pedido, migração. |
| [REGRAS_E_CONTRATOS.md](REGRAS_E_CONTRATOS.md) | Regras implementadas, significado de J e K, e-mail, relatórios, contratos com outros sistemas. |
| [MODELO_DE_DADOS.md](MODELO_DE_DADOS.md) | Abas, colunas, tipos e valores. |
| [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md) | Dados tratados, recursos, acesso, registros, pendências institucionais. |
| [UX_E_NAVEGACAO.md](UX_E_NAVEGACAO.md) | Tela, estados, teclado, tema, responsividade. |
| [AJUDA.md](AJUDA.md) | Texto-fonte da Central de Ajuda. |
| [INSTALACAO_E_ATUALIZACAO.md](INSTALACAO_E_ATUALIZACAO.md) | Script Properties, `ID_INDEX`, lista de acesso, implantação (sem valores). |
| [MANUAL_OPERACAO.md](MANUAL_OPERACAO.md) | Uso diário, diagnósticos, migração controlada, recuperação de um pedido, cópia de segurança, como voltar atrás, problemas comuns. |
| [HOMOLOGACAO.md](HOMOLOGACAO.md) | Plano de homologação e estado. |
| [TESTES.md](TESTES.md) | O que os testes cobrem, resultados e limitações. |
| [MANUTENCAO_E_CONTINUIDADE.md](MANUTENCAO_E_CONTINUIDADE.md) | O que não mudar sem cuidado, como evoluir, riscos. |
| [VERSOES_E_DECISOES.md](VERSOES_E_DECISOES.md) | Versões e decisões pendentes de validação humana. |
| [evidencias/2.0/](evidencias/2.0/README.md) | Capturas geradas pelos testes, com dados fictícios. |

## Versões

| Versão | Data | Estado |
|---|---|---|
| v1.0 | recebida em 21/10/2026 | em uso, fora do repositório |
| v2.0 | 21/10/2026 | no repositório; não homologada, não implantada |
