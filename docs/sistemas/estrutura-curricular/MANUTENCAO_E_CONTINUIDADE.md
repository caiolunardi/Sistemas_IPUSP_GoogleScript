# Manutenção e continuidade — 1.10.0

Ponto de entrada para retomar em outra conversa/ferramenta. Este app pertence a `Sistemas_IPUSP_GoogleScript`. Lunaris/Licita são referências visuais de outros projetos, não bases de regra de negócio aqui.

## Estado

- Baseline: **1.9.3**, auditada localmente na revisão anterior.
- Fonte atual: **1.10.0**, sidebar padrão, alternância para abas, ícones e hover.
- Backend: mesmos algoritmos; só constante de versão alterada.
- Esquema: **3**, sem migração.
- Esta rodada não acessou Apps Script/Sheets, não modificou acionadores nem promoveu `/exec`; homologação no Google pendente.
- [Verificação atual](VERIFICACAO_1_10_0.md); registros anteriores em `evidencias/` conservam alcance/versão de origem.

Pacote baseline: `estrutura_curricular_1.9.3_central_ajuda_correcao_editorial.zip`, SHA-256 `72f0ce6e4e34d5adbfb9c1823b055fb998b95574bb1b6514f3fb6221bc32ee04`. Revisão confirmou ZIP/patch/manifesto e Central de Ajuda; não equivale a homologação Google.

## Leitura por objetivo

| Objetivo | Começar por |
|---|---|
| uso | [Manual](MANUAL_OPERACAO.md), [Ajuda](AJUDA.md), [Fluxos](FLUXOS.md) |
| implantação | [Instalação](INSTALACAO_E_ATUALIZACAO.md), [Verificação](VERIFICACAO_1_10_0.md) |
| regra de negócio | [Regras](REGRAS.md), [Contratos](CONTRATOS_E_FLUXOS.md), [Inventário](INVENTARIO_CODIGO.md) |
| dados | [Modelo](MODELO_DE_DADOS.md), Esquema/Planilha/Gravacao |
| navegação/ícones | [Visual](NAVEGACAO_E_VISUAL_1_10_0.md), quatro arquivos novos |
| recuperação | Gravacao/Preparacao, testes de falha e Regras |
| envio/fórmula | EnvioGrade, suites de prévia/envio, cópias no Google |
| auditoria | AuditoriaGrade/AuditoriaPainel/PainelAuditoria, projeto vinculado separado |
| acesso/segurança | [Dados e segurança](DADOS_E_SEGURANCA.md), padrões centrais e Acesso |

## Invariantes

1. CSV/PDF têm papéis distintos; nomes truncados não substituem os completos.
2. Ajustes são separados do Júpiter; Observações/colunas extras têm preservação própria.
3. Manifesto ativa importação; contagens/histórico não o substituem.
4. Salvar/adicionar pode concluir só parte; descarte não inventa rollback.
5. Lotes registrados e conferidos item a item; não apagar pendência para liberar UI.
6. Envio confirma conteúdo exato, além de contagens.
7. Dados iguais nas seis abas não provam envio concluído: fórmulas/renomeação podem falhar depois.
8. Ajuda fecha por Escape/fundo; janelas operacionais por controles explícitos.
9. Leitor consulta; autorização no servidor, independentemente de menu.
10. Sidebar em cada carga; tema é preferência independente.

## Próximas alterações

Leia `CLAUDE.md` e padrões de UX/tema/ajuda/segurança, identifique commit-base e versão implantada real. Fonte: 34 arquivos no Web App e script separado na planilha operacional. Registre testes pertinentes antes de alterar.

Depois: execute cenários afetados, registre códigos de saída, fonte/dependências, dados sintéticos, pulados e limites. Atualize contratos/manual se regra mudar. Não transforme evidência histórica em teste atual. `rodar_suites.sh` distingue falha, infraestrutura e reprodução; ajuda/navegação também executam diretamente.

`testes/saida/` é reproduzível e ignorada. Publique apenas evidências selecionadas/sanitizadas em `evidencias/<versao>/`. Não versionar exports reais, metadados pessoais PDF, logs privados, modelos OCR, dependências, credenciais ou IDs.

Registro de implantação: data/versão, conta ou papel responsável, admin/leitor/sem acesso e resultados reais de envio/auditoria, sem secretos. Responsável formal, base legal, retenção e destinatários são **A VALIDAR INSTITUCIONALMENTE**.
