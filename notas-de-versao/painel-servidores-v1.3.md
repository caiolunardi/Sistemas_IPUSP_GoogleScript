**Painel de Sistemas (servidores)** — versão 1.3, de 20/10/2026.

Auditoria de tudo o que acontece no painel, numa planilha própria (chave `AUDITORIA_PAINEL_SERVIDORES` no `ID_INDEX`), que só a conta do Serviço de Graduação abre:

- acessos (com o tempo de carga), contas sem acesso e tentativas de gravar com perfil LEITOR;
- telas, janelas, abas do editor de rulesets, aparência, menu lateral ou abas;
- cards abertos (pelo nome do sistema, nunca pela URL), buscas na lista de sistemas e na Central de Ajuda, perguntas do FAQ;
- alterações de Formulários e Regras Curriculares com o valor de antes e depois de cada campo, inclusive as recusadas; inativação automática de ruleset ligada à ativação que a causou;
- contagem dos avisos de pendência (no máximo uma vez por hora) e erros de JavaScript.

Como funciona:

- se a auditoria não puder gravar, a alteração é recusada e nada muda; ver, navegar e usar a ajuda continuam funcionando;
- cada linha leva um selo encadeado (SHA-256); `verificarIntegridadeAuditoria` aponta qualquer linha editada, apagada ou inserida à mão;
- uma aba por ano (`EVENTOS_<ano>`, `ALTERACOES_<ano>`); de madrugada, `SESSOES` e `RESUMO_DIARIO` são consolidadas para um futuro painel de auditoria;
- a aba `AUDITORIA_REGRAS_CURRICULARES` continua e ganha a coluna `evento_id`; o histórico de revisões não muda;
- nada é apagado automaticamente; prazo de guarda a validar institucionalmente.

Primeiro sistema auditado: o núcleo `Auditoria.gs` é o modelo para os outros ([docs/auditoria](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/auditoria/README.md)). Central de Ajuda: "O painel registra o que eu faço?" e o problema "A auditoria está indisponível". Novo teste `testar_auditoria.js` (na CI).

**Implantação:** ainda não implantada. Antes, criar a planilha e a chave no `ID_INDEX` e rodar `prepararAuditoriaPainel` ([manual, passo 2d](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/painel-servidores/MANUAL_OPERACAO.md#instalar-ou-atualizar)). Esta Release marca o código do repositório; ela não atualiza o Apps Script.

Detalhes: [docs/sistemas/painel-servidores/README.md](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/painel-servidores/README.md).
