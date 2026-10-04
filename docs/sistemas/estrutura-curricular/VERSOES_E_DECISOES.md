# Versões e decisões — Estrutura Curricular e Grade Horária

| Versão | Data | Marco |
|---|---|---|
| 1.0.0 | 27/09/2026 | importação CSV/PDF, base, painel e GRADIP |
| 1.1.0 | 27/09/2026 | gravação com preparação/ativação/recuperação e revisão humana |
| 1.2.0–1.2.4 | 27/09/2026 | recuperação reforçada, revisão paginada, leitura consistente e UX |
| 1.3.0 | 28/09/2026 | ajustes manuais, exclusão, outros cursos e preparação |
| 1.3.1–1.3.2 | 29/09/2026 | seleção em lote; período ideal × semestre de oferecimento |
| 1.4.0–1.4.3 | 30/09/2026 | lista da grade, prévia, nova grade e CSV+PDF juntos |
| 1.5.0–1.5.1 | 01/10/2026 | envio para secretarias, backup e autorização Drive |
| 1.6.0 | 02/10/2026 | auditoria, horário de fim e `Validacoes.gs` mínimo |
| 1.6.1–1.6.4 | 03/10/2026 | correções de lista, Tabela tipada, locale e horários auditados |
| 1.7.0 | 04/10/2026 | painel de auditoria e acesso centralizado |
| 1.8.0 | 04/10/2026 | gráficos, não oferecidas e retirada do link cru da auditoria |

## Decisões estruturais

- Júpiter permanece fonte oficial; ajustes ficam separados.
- CSV define e PDF complementa.
- OCR no navegador.
- gravação multiaba usa manifesto como ponto único de ativação.
- planilha das secretarias permanece fixa; a cópia é o backup.
- auditoria fica em planilha separada, fora do alcance das secretarias.
- horário de fim é calculado, não digitado.
- acesso migrou para `PERMISSOES_DE_ACESSO`.
- painel de auditoria apresenta informação processada e não fornece link para dados crus.
- justificativa de não oferecimento permanece fora do sistema nesta versão.
