# Emissão de Diplomas — baseline recebida

**Estado em 23/10/2026: documentado por inspeção estática; fonte operacional não publicada; versão implantada NÃO VERIFICADA.** Origem: `Codigos.zip` fornecido pelo responsável, 17 arquivos Apps Script/HTML, 936.681 bytes de conteúdo descompactado. Não havia no ZIP manifesto `appsscript.json` nem configuração de implantação.

O aplicativo interno acompanha **Dados Pessoais → Histórico Escolar → Colação de Grau → Emissão de Diploma**. Também oferece seleção por colação, busca, filtros, anexos/pastas, certificados, ofícios, lista de formandos, e-mails individuais e em lote, análises de histórico e relatórios PDF. A confirmação das etapas é atividade humana.

## Componentes versionados dentro da fonte recebida

| Componente | Identificação no código recebido |
|---|---|
| Backend Diplomas | Cabeçalho `V3.0 (Hardening Fase 1)` |
| Parser de histórico | `HistoricoParser-v1.0.0`; PDF.js `3.11.174` |
| Motor de regras | `HistoricoEngine-v2.0.1` |
| Gerador de relatórios de histórico | `HistoricoRelatorio-v2.0.0` |
| Deploy Google | **Desconhecido**; não deduzir do ZIP |

Os números pertencem a componentes distintos. O sistema Diplomas **não é** o sistema Estrutura Curricular cujo PDF.js foi modernizado em outro projeto.

## Documentação

- [Inventário e origem](INVENTARIO_E_ORIGEM.md): arquivos, dependências e condições de incorporação.
- [Arquitetura](ARQUITETURA.md): interação UI, servidor, parser, rulesets e auditoria.
- [Modelo de dados](MODELO_DE_DADOS.md): planilhas, campos e chaves de integração.
- [Endpoints](ENDPOINTS.md): inventário das chamadas do servidor e efeitos de leitura/escrita.
- [Análise de Histórico Escolar](HISTORICO_ESCOLAR.md): parser, reconciliação, rulesets, auditoria e PDFs.
- [Incorporação segura](INSTALACAO_E_INCORPORACAO.md): roteiro para o futuro PR de código sanitizado.
- [Regras e fluxos](REGRAS_E_FLUXOS.md): estados, análise, relatórios e anexos.
- [Manual de operação](MANUAL_OPERACAO.md): uso e problemas.
- [Ajuda](AJUDA.md): tópicos presentes na Central de Ajuda.
- [Dados e segurança](DADOS_E_SEGURANCA.md): preflight e riscos.
- [Homologação](HOMOLOGACAO.md): evidências e roteiro de teste.
- [Migração futura](MIGRACAO_DADOS_PLANO.md): plano preliminar sem execução.
- [Fonte recebida](../../../sistemas/diplomas/README.md): limites de publicação no Git.

**Por que a fonte não entra agora?** Os arquivos recebidos contêm IDs operacionais reais de planilhas, modelos e pasta Drive. O repositório é público inclusive no histórico. Publicar e apagar depois continuaria expondo esses dados. O próximo PR de código precisa primeiro converter essas dependências para chaves lógicas e comprovar segurança/compatibilidade. Documentação não equivale a certificação de implantação.
