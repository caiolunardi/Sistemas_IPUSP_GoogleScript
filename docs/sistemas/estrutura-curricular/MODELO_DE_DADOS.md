# Modelo de dados — 1.10.0

Fonte do contrato: `Esquema.gs`, `Gravacao.gs`, `Preparacao.gs`, `EnvioGrade.gs` e `AuditoriaGrade.gs`. Esquema **3**, sem mudança nesta atualização visual. IDs operacionais são configurados fora do Git.

## Base curricular

Na primeira abertura de administrador, `garantirEstrutura_()` cria/repara as nove abas. `Sobre` é um quadro gerado de orientação/última importação; as outras oito têm as colunas abaixo, extraídas diretamente de `COLUNAS` da fonte. Leitura/escrita usa título, não posição; não renomear cabeçalhos do sistema. Colunas extras e Observações têm as regras de preservação de [REGRAS.md](REGRAS.md). Proteção só com aviso não bloqueia edição nem substitui autorização.

| Aba | Identidade/finalidade |
|---|---|
| Sobre | orientação e resumo gerados |
| Disciplinas | catálogo por código Júpiter; Observações livre |
| Disciplinas por habilitação | oferta da disciplina no currículo/habilitação |
| Requisitos | vínculos de requisitos por currículo/disciplina/grupo |
| Currículos | código de currículo e informações da habilitação |
| Importações | operações e metadados de importação |
| Alterações | mudanças resultantes da importação |
| Ajustes manuais | sobreposição operacional por código da estrutura |
| Disciplinas para outros cursos | registros de identidade própria, separados do catálogo |

### Dicionário de colunas

Tipo é o contrato interno: texto, inteiro, decimal ou dataHora. A lista não inclui valores reais. Notas, larguras, aliases históricos e formatos completos permanecem em `Esquema.gs`.

#### Disciplinas

| Campo interno | Título no Sheets | Tipo |
|---|---|---|
| `codigo` | Código | `texto` |
| `nome` | Nome | `texto` |
| `departamento` | Departamento | `texto` |
| `prefixo` | Prefixo | `texto` |
| `creditosAula` | Créditos-aula | `inteiro` |
| `creditosTrabalho` | Créditos-trabalho | `inteiro` |
| `creditosTotal` | Créditos (total) | `inteiro` |
| `ch` | CH total (h) | `inteiro` |
| `ce` | Estágio – CE (h) | `inteiro` |
| `cp` | Práticas – CP (h) | `inteiro` |
| `ext` | Extensão – EXT (h) | `inteiro` |
| `atpa` | ATPA (h) | `inteiro` |
| `versao` | Versão | `inteiro` |
| `versaoOrigem` | Origem da versão | `texto` |
| `habilitacoes` | Habilitações | `texto` |
| `oferta` | Tipo e período por habilitação | `texto` |
| `semestreIdeal` | Semestre de oferecimento | `texto` |
| `situacao` | Situação | `texto` |
| `incluidaEm` | Incluída em | `dataHora` |
| `alteradaEm` | Última alteração | `dataHora` |
| `complementoPdfEm` | Dados do PDF em | `dataHora` |
| `observacoes` | Observações | `texto` |

#### Disciplinas por habilitação

| Campo interno | Título no Sheets | Tipo |
|---|---|---|
| `curriculo` | Currículo | `texto` |
| `habilitacao` | Habilitação | `texto` |
| `codigo` | Código | `texto` |
| `nome` | Nome | `texto` |
| `departamento` | Departamento | `texto` |
| `tipo` | Tipo | `texto` |
| `periodoIdeal` | Período ideal | `inteiro` |
| `semestreIdeal` | Semestre de oferecimento | `texto` |
| `creditosAula` | Créditos-aula | `inteiro` |
| `requisitos` | Requisitos | `texto` |

#### Requisitos

| Campo interno | Título no Sheets | Tipo |
|---|---|---|
| `curriculo` | Currículo | `texto` |
| `habilitacao` | Habilitação | `texto` |
| `codigo` | Disciplina | `texto` |
| `nome` | Nome da disciplina | `texto` |
| `tipoRequisito` | Tipo de requisito | `texto` |
| `requisito` | Requisito (código) | `texto` |
| `versaoRequisito` | Versão do requisito | `inteiro` |
| `nomeRequisito` | Nome do requisito | `texto` |
| `grupo` | Grupo | `inteiro` |
| `relacao` | Relação | `texto` |
| `naEstrutura` | Requisito na estrutura? | `texto` |

#### Currículos

| Campo interno | Título no Sheets | Tipo |
|---|---|---|
| `curriculo` | Currículo | `texto` |
| `curso` | Curso | `texto` |
| `habilitacaoCodigo` | Cód. habilitação | `texto` |
| `habilitacao` | Habilitação | `texto` |
| `cadastradoEm` | Cadastrado em | `texto` |
| `situacaoJupiter` | Situação no Júpiter | `texto` |
| `vigente` | Na base atual | `texto` |
| `disciplinas` | Disciplinas | `inteiro` |
| `obrigatorias` | Obrigatórias | `inteiro` |
| `eletivas` | Optativas eletivas | `inteiro` |
| `livres` | Optativas livres | `inteiro` |
| `requisitos` | Requisitos | `inteiro` |
| `aacHoras` | AAC exigida (h) | `inteiro` |
| `aacPercentual` | AAC (%) | `decimal` |
| `dataAtivacao` | Ativação | `texto` |
| `dataDesativacao` | Desativação | `texto` |
| `duracaoIdeal` | Duração ideal (sem.) | `inteiro` |
| `duracaoMinima` | Duração mínima (sem.) | `inteiro` |
| `duracaoMaxima` | Duração máxima (sem.) | `inteiro` |
| `chAulaObrigatoria` | Obrigatórias – aula (h) | `inteiro` |
| `chTrabalhoObrigatoria` | Obrigatórias – trabalho (h) | `inteiro` |
| `chObrigatoria` | Obrigatórias – total (h) | `inteiro` |
| `chAulaEletiva` | Eletivas – aula (h) | `inteiro` |
| `chTrabalhoEletiva` | Eletivas – trabalho (h) | `inteiro` |
| `chEletiva` | Eletivas – total (h) | `inteiro` |
| `chAulaLivre` | Livres – aula (h) | `inteiro` |
| `chTrabalhoLivre` | Livres – trabalho (h) | `inteiro` |
| `chLivre` | Livres – total (h) | `inteiro` |
| `chDisciplinas` | CH em disciplinas (h) | `inteiro` |
| `estagio` | Estágio (h) | `inteiro` |
| `aexApolo` | AEX Apolo (h) | `inteiro` |
| `extensaoOptativas` | Extensão em optativas (h) | `inteiro` |
| `chDisciplinasMaisAac` | CH disciplinas + AAC (h) | `inteiro` |
| `extensaoTotal` | Extensão exigida (h) | `inteiro` |
| `extensaoPercentual` | Extensão exigida (%) | `decimal` |
| `totalGeral` | Total geral (h) | `inteiro` |
| `informacoesEspecificas` | Informações específicas | `texto` |
| `atualizadoEm` | Atualizado em | `dataHora` |
| `infoPdfEm` | Informações do PDF em | `dataHora` |

#### Importações

| Campo interno | Título no Sheets | Tipo |
|---|---|---|
| `id` | Importação | `texto` |
| `dataHora` | Data e hora | `dataHora` |
| `usuario` | Quem importou | `texto` |
| `arquivo` | Arquivo | `texto` |
| `formato` | Formato | `texto` |
| `leitura` | Leitura | `texto` |
| `modo` | Gravação | `texto` |
| `curriculos` | Currículos | `texto` |
| `disciplinas` | Disciplinas | `inteiro` |
| `novas` | Novas | `inteiro` |
| `alteradas` | Alteradas | `inteiro` |
| `sairam` | Saíram | `inteiro` |
| `voltaram` | Voltaram | `inteiro` |
| `ofertasAlteradas` | Ofertas alteradas | `inteiro` |
| `requisitos` | Requisitos | `inteiro` |
| `avisos` | Avisos | `inteiro` |
| `resumo` | Resumo | `texto` |

#### Alterações

| Campo interno | Título no Sheets | Tipo |
|---|---|---|
| `importacao` | Importação | `texto` |
| `dataHora` | Data e hora | `dataHora` |
| `codigo` | Código | `texto` |
| `nome` | Nome | `texto` |
| `tipo` | O que mudou | `texto` |
| `habilitacao` | Habilitação | `texto` |
| `campo` | Campo | `texto` |
| `antes` | Antes | `texto` |
| `depois` | Depois | `texto` |

#### Ajustes manuais

| Campo interno | Título no Sheets | Tipo |
|---|---|---|
| `chave` | Disciplina (código no Júpiter) | `texto` |
| `excluida` | Excluída | `texto` |
| `naGrade` | Adicionada à grade horária | `texto` |
| `codigo` | Código ajustado | `texto` |
| `nome` | Nome ajustado | `texto` |
| `departamento` | Departamento ajustado | `texto` |
| `creditosAula` | Créditos-aula ajustados | `inteiro` |
| `creditosTrabalho` | Créditos-trabalho ajustados | `inteiro` |
| `ch` | CH total ajustada (h) | `inteiro` |
| `ce` | Estágio – CE ajustado (h) | `inteiro` |
| `cp` | Práticas – CP ajustadas (h) | `inteiro` |
| `ext` | Extensão – EXT ajustada (h) | `inteiro` |
| `atpa` | ATPA ajustada (h) | `inteiro` |
| `versao` | Versão ajustada | `inteiro` |
| `oferecimento` | Semestre de oferecimento ajustado | `texto` |
| `oferta` | Oferta ajustada | `texto` |
| `alteradoEm` | Alterado em | `dataHora` |
| `alteradoPor` | Alterado por | `texto` |

#### Disciplinas para outros cursos

| Campo interno | Título no Sheets | Tipo |
|---|---|---|
| `chave` | Identificador | `texto` |
| `codigo` | Código | `texto` |
| `nome` | Nome | `texto` |
| `departamento` | Departamento | `texto` |
| `creditosAula` | Créditos-aula | `inteiro` |
| `creditosTrabalho` | Créditos-trabalho | `inteiro` |
| `ch` | CH total (h) | `inteiro` |
| `ativacao` | Ativação | `texto` |
| `desativacao` | Desativação | `texto` |
| `unidadeAtendida` | Unidade atendida | `texto` |
| `cursoAtendido` | Curso atendido | `texto` |
| `oferecimento` | Semestre de oferecimento | `texto` |
| `origem` | Origem | `texto` |
| `incluidaEm` | Incluída em | `dataHora` |
| `excluida` | Excluída | `texto` |
| `naGrade` | Adicionada à grade horária | `texto` |
| `observacoes` | Observações | `texto` |
| `alteradoEm` | Alterado em | `dataHora` |
| `alteradoPor` | Alterado por | `texto` |

## Camadas e metadados

Os dados oficiais importados não são sobrescritos por ajustes da ficha. A preparação aplica a sobreposição de Ajustes manuais; oferecimento e oferta precisam manter coerência entre painel, prévia e envio. Outros cursos usam identidade própria e podem ter código visível editado sem mudar silenciosamente a chave do registro.

| Local | Chave | Papel |
|---|---|---|
| metadado da base | `estruturaCurricular.esquema` | versão do esquema |
| metadado da base | `estruturaCurricular.versaoBase` | versão lógica da base |
| metadado da base | `estruturaCurricular.ativa` | manifesto: abas ativas por ID e importações confirmadas |
| metadado da base | `estruturaCurricular.gravacao` | diário de preparação/ativação/arrumação |
| metadado da base | `estruturaCurricular.salvamento` | pedido individual interrompido |
| metadado da base | `estruturaCurricular.recomeco` | reinício interrompido |
| Script Properties | `estruturaCurricular.lote` e `estruturaCurricular.lote.<id>.<n>` | cabeçalho/partes de lote, até sua conclusão |
| cache | ID resolvido/permissões/revisão | aceleração e revisão paginada; não fonte de verdade |
| navegador | `gradip-theme` | preferência visual local |

Preparação de importação usa abas `_nova_*`; versões anteriores usam `_anterior_*`. Manifesto determina a versão ativa, não nomes visíveis isolados. Não apagar abas técnicas/metadados para encerrar uma pendência. Leia [Contratos](CONTRATOS_E_FLUXOS.md) e [Arquitetura](ARQUITETURA.md).

## Índices e planilha das secretarias

| Recurso | Contrato |
|---|---|
| ID_INDEX, primeira aba | A Chave; B Tipo; C ID de Produção. Coluna D não é utilizada |
| PERMISSOES_DE_ACESSO / ESTRUTURA_CURRICULAR | linha 1 cabeçalho; coluna C e-mail; E Perfil; dados linha 2+ |
| índice de grades anteriores | `Semestre`, `ID`, `Auditoria_ID` na primeira aba |

Secretarias: **PSA, PSC, PSE, PST, Interdepartamentais, Outras Unidades**. Cabeçalho esperado na linha **3**: C Código, D Nome, E Tipo, I Semestre Ideal, J Créditos Aula. Dados nas linhas **4–999**; capacidade de 996 linhas por aba. O envio substitui **B:S**, preservando linhas 1–3, colunas T+ e outras abas.

| Coluna | Escrita do envio |
|---|---|
| C | código exibido da disciplina |
| D | nome completo com observações conforme montagem atual |
| E | Obrigatória / Eletiva / Livre; vazio quando não se aplica |
| I | período ideal numérico, vazio quando não se aplica |
| J | créditos-aula, distinguindo zero de vazio |
| M | fórmula de Horário de Fim em texto HH:mm |

Outros campos B:S são liberados para preenchimento conforme o modelo institucional; o envio apaga o conteúdo anterior dessa faixa após backup. Notas de conflito em K e validação de M são tratadas pelo envio. Não presumir que a presença dos dados comprova fórmula, renomeação ou auditoria concluídas.

## Auditoria por semestre

Uma planilha por semestre na pasta de auditorias. `Sobre` explica o arquivo; `Edições` registra mudanças e eventos do sistema; `Aberturas` registra aberturas observáveis.

| Aba | Colunas |
|---|---|
| Edições | Data e hora; Semestre; Origem; E-mail; Aba; Célula; Linha; Coluna; Campo; Código da disciplina; Disciplina (como está na planilha); Valor anterior; Valor novo; Tipo de edição; Células no evento; Observação; ID do evento |
| Aberturas | Data e hora; Semestre; E-mail |

Colagens acima de 300 células têm resumo conforme o contrato existente. O painel limita lista recente a 5.000 edições; gráficos de pessoas usam todas as linhas lidas pelo agregador. Evento pode não conter identificação em todos os contextos do Google; confirme no ambiente real. Retenção/base legal, aviso às secretarias e acesso aos dados pessoais são [A VALIDAR INSTITUCIONALMENTE](DADOS_E_SEGURANCA.md).
