# Marco Zero — inventário do formulário de colação

**Corte:** 06/11/2026 (America/Sao_Paulo). **Estado:** proposta de documentação/contexto, sem adoção ou alteração de aplicativo.

## Proveniência

- Fonte pública comum: `caiolunardi/Sistemas_IPUSP_GoogleScript` em `main@479266728f3fce424e42483cfef70fcf5677dff4`; Gerenciador de Colação 4.0 incorporado pelo PR #42.
- Fonte privada específica do aplicativo: arquivos `Codigo(1).gs` e `ColacaoApp.html` entregues diretamente pelo responsável em 06/11/2026. Seus SHA-256 e limites de revisão estão no [inventário](../../../docs/sistemas/pedido-colacao-grau/INVENTARIO_LEGADO.md).
- Material adjacente lido: `sistemas/emissao-diplomas/src/DiplomasBackend.gs`, `sistemas/painel-servidores/src/ConfigFormularioColacaoGrau.gs`, políticas e documentação do repo.
- **Não houve** acesso ao editor Apps Script do formulário, testes, inspect de Google Drive/Sheets, migração, deploy nem publicação de códigos originais.
- O responsável solicitou **primeiro documentar o que existe** e registrar a fronteira funcional; não pediu reformular ou publicar código nesta rodada.

## Corte de conhecimento

A documentação descreve o comportamento do código entregue, sem certificação de que o editor Google usa exatamente os mesmos bytes. O formulário legado contém identificadores operacionais que não podem entrar no Git público. Não tem `src/`, manifesto, fontes de teste nem dados fictícios versionados ainda.

## Riscos e incertezas

O modelo de execução proposto em comentários exige acesso direto de usuários a planilhas; a titularidade acadêmica e os anexos requerem revisão; a nomenclatura dos documentos não contém colação; não há transação entre recursos nem locks interprojetos. Ver [segurança](../../../docs/sistemas/pedido-colacao-grau/DADOS_E_SEGURANCA.md) e [pendências](PENDENCIAS.md).

## Gate prospectivo

Revisão independente deste conjunto e decisão humana sobre adoção de contexto; em rodada própria, design de autorização, sanitização, modernização com testes, homologação e eventual implantação. Nada do Marco Zero é aprovação de código ou prova de deploy.
