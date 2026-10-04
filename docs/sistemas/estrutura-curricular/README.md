# Estrutura Curricular e Grade Horária — Serviço de Graduação

**Snapshot documentado:** 1.8.0 — 04/10/2026  
**Tipo:** Web App interno em Google Apps Script  
**Público:** Serviço de Graduação; consulta autorizada para perfis `LEITOR`, inclusive Comissão de Graduação quando configurada  
**Fonte oficial dos dados curriculares:** Júpiter  
**Estado desta incorporação:** documentação consolidada a partir do descritivo e do pacote 1.8.0 recebidos; **auditoria independente do código ainda pendente**.

## Visão executiva

O sistema reúne em um único fluxo a construção da base de estrutura curricular e a preparação/acompanhamento da grade horária do curso de Psicologia do IPUSP.

Ele resolve cinco frentes operacionais:

1. importa e organiza a estrutura curricular do Júpiter;
2. mantém os dados oficiais separados de ajustes operacionais feitos pela equipe;
3. prepara a grade do semestre em quatro etapas controladas;
4. envia a grade para a planilha das secretarias, com cópia de segurança;
5. registra e apresenta a auditoria do preenchimento para a Graduação e para a Comissão de Graduação.

O sistema **não altera o Júpiter**, não preenche por conta das secretarias docentes/dias/horários/vagas/salas e não publica a grade visual para estudantes.

## Mapa funcional

```text
JÚPITER
  ├─ Grade Curricular (CSV/PDF)
  └─ Lista de disciplinas por unidade (CSV)
          ↓
WEB APP — ESTRUTURA CURRICULAR
  ├─ importação e conferência
  ├─ base curricular
  ├─ ajustes manuais
  ├─ disciplinas para outros cursos
  ├─ seleção para a grade
  └─ prévia do semestre
          ↓
ENVIAR GRADE PARA PREENCHIMENTO
  ├─ backup do arquivo anterior
  ├─ criação/reuso da auditoria do semestre
  └─ atualização da planilha das secretarias
          ↓
SECRETARIAS PREENCHEM A GRADE
  ├─ validações locais
  └─ auditoria de edições e aberturas
          ↓
PAINEL DE AUDITORIA
  ├─ andamento por departamento
  ├─ não oferecidas / aguardando justificativa
  ├─ quem abre / quem edita
  ├─ linha do tempo
  └─ histórico por disciplina
```

## Componentes principais

- Web App independente em Apps Script, executando como a conta que implantou.
- Planilha-base `ESTRUTURA_CURRICULAR`, com esquema, histórico e metadados de controle.
- `ID_INDEX`, índice mestre usado para localizar recursos por chave, sem IDs no código.
- Planilha operacional `GRADE_HORARIA_PREENCHIMENTO`, mantida como arquivo fixo.
- Backups das grades anteriores, feitos antes de cada envio destrutivo.
- Uma planilha de auditoria por semestre, fora do alcance das secretarias.
- Planilha `PERMISSOES_DE_ACESSO`, que define `ADMINISTRADOR` e `LEITOR`.

## Documentação deste sistema

| Documento | Finalidade |
|---|---|
| [DESCRICAO_COMPLETA.md](DESCRICAO_COMPLETA.md) | referência de ponta a ponta entregue com a versão 1.8.0 |
| [ARQUITETURA.md](ARQUITETURA.md) | componentes, arquivos, dados, configuração e desenho técnico |
| [FLUXOS.md](FLUXOS.md) | ciclo completo: Júpiter → base → preparação → secretarias → auditoria |
| [REGRAS.md](REGRAS.md) | regras de negócio, importação, gravação, grade e auditoria |
| [CSV_X_PDF.md](CSV_X_PDF.md) | papel de cada formato do Júpiter e por que são complementares |
| [UX.md](UX.md) | organização da interface, tema GRADIP, responsividade e acessibilidade |
| [AJUDA.md](AJUDA.md) | escopo da Central de Ajuda e assuntos que ela deve cobrir |
| [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md) | dados tratados, acesso, recursos, LGPD e pontos a validar |
| [HOMOLOGACAO.md](HOMOLOGACAO.md) | evidências declaradas no pacote, limites e roteiro de homologação |
| [VERSOES_E_DECISOES.md](VERSOES_E_DECISOES.md) | evolução 1.0.0 → 1.8.0 e decisões de desenho |
| [INCIDENTES_E_LICOES.md](INCIDENTES_E_LICOES.md) | incidentes reais registrados e lições incorporadas |

## Situação da 1.8.0

O material recebido identifica o código como **1.8.0**. Segundo o próprio descritivo, a **1.7.0 estava instalada em 04/10/2026** e a **1.8.0 havia sido testada localmente**, com implantação/homologação real ainda pendente. Esta documentação preserva essa distinção: desenvolvimento concluído não é tratado automaticamente como implantação comprovada.

A próxima etapa será a auditoria independente do ZIP recebido. Só depois dessa auditoria o código será promovido para a pasta de fonte como baseline auditada.
