# Testes locais — Painel dos servidores

Não copie esta pasta para o Apps Script. Os testes não acessam planilhas reais nem a internet e usam apenas dados sintéticos (formulários e rulesets fictícios, contadores inventados, e-mails `@usp.br` inventados).

| Script | O que confere |
|---|---|
| `testar_acesso.js` | Controle de acesso (`AcessoPainel.gs`) com Session, propriedades, cache e planilhas fictícias: ADMINISTRADOR grava; LEITOR, perfil vazio, desconhecido ou e-mail repetido viram leitor e têm a gravação recusada; quem está fora da aba ou sem conta identificada vê a página de sem acesso; configuração faltando (propriedade, chave no `ID_INDEX`, aba, colunas) fecha o painel e registra o motivo sem e-mail; cache; diagnóstico sem e-mails. Confere também que toda função pública dos `.gs`, menos `doGet`, começa com `exigirAcessoPainel_()` ou `exigirAdminPainel_()` e que as que gravam exigem administrador. |
| `testar_navegador.js` | Página montada com os `include_` resolvidos e `google.script.run` simulado, em Chromium: três modos de tema, persistência e mudança do sistema com a página aberta; marcas; contraste de texto ≥ 4,5:1 nas telas, menu, abas, modais, Regras Curriculares e Central de Ajuda; card Pessoas do IPUSP (posição, nome, endereço, teclado); avisos de pendência, inclusive depois de usar a busca; menu lateral (abre por padrão, `aria-current`, botões Voltar) e abas (`tablist`/`tab`/`tabpanel`, setas, Home/End, Enter); modais de Formulários, Colação e Exclusão; Central de Ajuda (seção contextual, busca com e sem acento, FAQ, atalhos, manual das Regras, ESC, foco, rolagem); 360/390/480/768/1024 px sem rolagem horizontal, menu recolhido em tela estreita e alvos ≥ 44 px; movimento reduzido; perfil LEITOR (aviso fixo, cards e Regras visíveis, recusa do servidor mostrada no modal); página de quem não tem acesso em 360 px e desktop, nos dois temas (marca, contraste, sem rolagem horizontal); ausência de erros de JavaScript. |

```bash
node testar_acesso.js     # só Node
node testar_navegador.js   # requer Playwright com Chromium
```

O PNG externo da marca USP é substituído por um retângulo de mesmo tamanho durante o teste. `window.open` é interceptado, então nenhum sistema real é aberto. Capturas de tela vão para a pasta temporária do sistema e não são versionadas.
