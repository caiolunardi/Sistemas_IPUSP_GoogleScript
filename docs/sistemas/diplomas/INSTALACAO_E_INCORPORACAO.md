# Incorporação segura da fonte — roteiro sem executar

A presente rodada incorporou **somente documentação**. O ZIP tem código real e não pode ser colocado no repositório público de forma literal.

## Antes do PR de código

1. Confirmar se os 17 arquivos representam exatamente a versão em produção ou um pacote de desenvolvimento; conferir manifesto, bibliotecas, Script Properties, acionadores e deployment do projeto institucional, **sem modificar**.
2. Fazer inventário dos IDs fixos: pasta raiz, templates Google Docs, planilha central de Alunos e planilha de Regras Curriculares.
3. Definir no backend chaves lógicas, usando o `ID_INDEX` e/ou `PropertiesService.getScriptProperties` conforme o padrão GRADIP; nenhum valor real no Git. Registrar somente nome de chave em `DADOS_E_SEGURANCA.md`.
4. Verificar que o projeto Apps Script consegue abrir recursos de homologação isolada e que falta de configuração resulta em erro explícito, não fallback à produção.
5. Auditar autorização por identidade de todas as funções públicas, especialmente leitura de dados, upload, e-mail, exclusão, relatórios e migrações administrativas. O fato de um endpoint usar token de sessão ou Registro ID não prova autorização de usuário.
6. Rever o comportamento de `doGet`: se necessário, separar migração automática de esquema de abertura da UI, com decisão funcional expressa e sem perder a idempotência.
7. Somente então criar `src/` com `.claspignore` padrão; recuperar `appsscript.json` verdadeiro e revisar bibliotecas/escopos.
8. Acrescentar testes de regressão, testes negativos de acesso e CSV inventado para homologação; preservar o comportamento do sistema original onde não foi autorizada mudança.
9. Classificar o PR pelo **risco mais alto** das alterações efetivas, incluir plano de homologação, recuperação e parecer independente.
10. **Não fazer** clasp, merge, tag, Release ou deploy sem autorização própria e posterior.

## Checkpoints

| Entrega | Estado |
|---|---|
| Inventário fiel dos 17 arquivos | Concluído por leitura estática |
| Documentação de fluxos, dados, regras, ajuda e segurança | Concluída para baseline recebida |
| Preflight para publicação literal dos arquivos | **Reprovado pelos IDs operacionais fixos** |
| Sanitização e testes do código | Pendente |
| Auditoria independente de código | Pendente |
| Homologação com dados fictícios | Pendente |
| Identificar versão e permissões efetivamente implantadas | Pendente |
| Migração de planilha antiga para nova | Pendente e **separada** |

Concluir incorporação da fonte **não** autoriza migração de registros reais. O plano desta última permanece em [MIGRACAO_DADOS_PLANO.md](MIGRACAO_DADOS_PLANO.md).
