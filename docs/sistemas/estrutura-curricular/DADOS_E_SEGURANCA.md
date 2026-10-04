# Dados e segurança — Estrutura Curricular e Grade Horária 1.8.0

Este documento aplica `docs/seguranca/` ao sistema. Não registra IDs reais, nomes de pessoas ou e-mails reais.

## Acesso

- Web App executa como quem implantou.
- autorização efetiva vem de `PERMISSOES_DE_ACESSO` / aba `ESTRUTURA_CURRICULAR`;
- `ADMINISTRADOR` escreve; `LEITOR` consulta estrutura e auditoria;
- backend deve revalidar papel em toda chamada pública.

## Recursos lógicos

| Recurso | Tipo | Resolução |
|---|---|---|
| `ID_INDEX` | Sheets | `ID_INDEX_SPREADSHEET_ID` em Script Properties |
| `ESTRUTURA_CURRICULAR` | Sheets | chave no índice |
| `GRADE_HORARIA_PREENCHIMENTO` | Sheets | chave no índice |
| `INDEX_GRADE_HORARIA_VERSOES_ANTERIORES` | Sheets | chave no índice |
| `BACKUP_GRADES_ANTERIORES` | Drive folder | chave no índice |
| `AUDITORIA_GRADES_ANTERIORES` | Drive folder | chave no índice |
| `PERMISSOES_DE_ACESSO` | Sheets | chave no índice |

Nenhum ID deve ser documentado ou logado.

## Dados pessoais tratados

- e-mail de quem importa;
- e-mail de quem faz ajustes no painel;
- N. USP, nome, e-mail e perfil na planilha de permissões;
- e-mail de quem edita a grade, com data/hora e ação;
- e-mail de quem abre a planilha, quando fornecido pelo acionador;
- nomes de docentes e demais conteúdo operacional existente na grade e nos backups.

O material classifica base legal, retenção, comunicação às secretarias e periodicidade de revisão de permissões como **A VALIDAR INSTITUCIONALMENTE**.

## Minimização

O arquivo do Júpiter é lido no navegador. O PDF não é enviado ao Drive para OCR. Metadados do PDF não são usados. Logs de execução não devem conter IDs, conteúdo de arquivos ou e-mails.

## Auditoria e CG

Administradores e leitores veem dados de auditoria processados. A 1.8.0 removeu o link direto para a planilha de auditoria.

## Backups

Backups da grade contêm o preenchimento operacional das secretarias e devem permanecer em pasta restrita. A retenção das cópias e auditorias está marcada para validação institucional.

## Dependências externas

PDF.js/Tesseract e o modelo OCR são obtidos de fontes públicas fixadas pelo projeto; o OCR roda localmente no navegador. A disponibilidade dessas CDNs na rede USP deve ser homologada.

## Ponto conhecido do design system

O descritivo registra que `GradipTema.html` local possui correção de contraste ainda não propagada ao `shared/` central.

## Incidentes

Seguir `docs/seguranca/INCIDENTES.md`. Em particular: dado pessoal em Observações, lista de acesso errada, base inconsistente ou ID exposto exigem contenção/revisão conforme a política comum.
