# Checklist de segurança e privacidade

Use antes de incorporar um sistema ao repositório e antes de publicar mudanças que tratem dados pessoais.

## Repositório e configuração
- [ ] Nenhuma senha/token/chave/credencial está versionada.
- [ ] IDs reais de Sheets/Drive/Forms/Scripts/Deployments foram removidos do código/documentação quando não são públicos por finalidade.
- [ ] Configurações de produção usam nomes lógicos/Script Properties ou mecanismo aprovado.
- [ ] `.clasp.json`, `.clasprc.json`, `creds.json`, `.env` e credenciais locais não entraram no commit.
- [ ] A pasta `src/` tem o `.claspignore` padrão e `clasp status` lista só `.gs`, `.js`, `.html` e `appsscript.json` ([desenvolvimento local](../../DEVELOPMENT_LOCAL.md)).
- [ ] Nenhum ID de produção escrito no código: chave do `ID_INDEX` ou Script Property.
- [ ] Histórico Git foi considerado, não apenas o estado atual.

## Dados pessoais
- [ ] Não há nome, Nº USP, CPF, e-mail, telefone ou protocolo real em fixture/documentação.
- [ ] Não há histórico, notas, pedidos ou anexos reais no repo.
- [ ] Dados sensíveis/alto impacto não aparecem em logs, exemplos, screenshots ou prompts.
- [ ] Campos tratados foram minimizados ao necessário.
- [ ] Base legal/retenção não foram inventadas; pontos não confirmados estão marcados `A VALIDAR INSTITUCIONALMENTE`.

## Apps Script e backend
- [ ] Entradas do cliente são validadas no servidor.
- [ ] Autorização não depende de botão oculto/URL desconhecida.
- [ ] Identidade de execução do Web App foi documentada.
- [ ] Acesso ao recurso não depende apenas da permissão direta do usuário na planilha.
- [ ] Funções privilegiadas não aceitam IDs arbitrários sem validação.
- [ ] Mensagens server-side não retornam segredo, stack trace ou dado excessivo.

## Google Drive/Sheets
- [ ] Recursos com dados pessoais estão `Restritos` por padrão.
- [ ] Compartilhamento com domínio/link foi revisto.
- [ ] Editores/leitores têm necessidade real.
- [ ] Herança de permissões de pasta foi revisada.
- [ ] IDs no código foram substituídos por config onde aplicável.

## Logs e observabilidade
- [ ] Não existe `Logger.log`/`console.log` de payload completo com dados pessoais.
- [ ] Logs usam o mínimo de identificadores.
- [ ] Erros para usuário são orientativos e não técnicos.
- [ ] Debug temporário foi removido.

## Testes e documentação
- [ ] Fixtures são sintéticas.
- [ ] Screenshots foram revisados/redigidos.
- [ ] Exemplos usam placeholders não reais.
- [ ] Agentes de código receberam somente o mínimo necessário.
- [ ] `DADOS_E_SEGURANCA.md` do sistema está atualizado.

## Incidentes
- [ ] Responsável sabe onde escalar suspeita de incidente.
- [ ] Não há orientação para comunicar ANPD/titular diretamente sem fluxo institucional.
- [ ] Se houve exposição de segredo, a rotação foi considerada.
- [ ] Se houve dado pessoal no Git, histórico/clones/artifacts foram considerados.

## Aprovação

Se algum item crítico estiver `não`, a publicação deve parar até correção ou decisão institucional documentada.
