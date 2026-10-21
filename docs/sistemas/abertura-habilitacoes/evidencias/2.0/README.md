# Capturas — Gerenciador de Abertura de Habilitações, v2.0

Geradas em 21/10/2026 pela suíte [`testar_navegador.js`](../../../../../sistemas/abertura-habilitacoes/gerenciador/testes/testar_navegador.js) (Playwright/Chromium), com `google.script.run` simulado. **Todos os dados são fictícios**: nomes inventados, e-mails do domínio reservado `.invalid`, Nº USP na faixa 9000xxx. Nenhuma planilha real foi lida e nenhum e-mail foi enviado. O pedido com nome `<img src=x …>` é proposital: confere que dados da planilha aparecem como texto.

O teste roda sem rede: a marca USP externa do tema claro aparece como um retângulo azul. São capturas da fonte do repositório, **não** da versão implantada (a 2.0 não está implantada).

Para regenerar, na pasta `testes/`: `EVIDENCIAS=../../../../docs/sistemas/abertura-habilitacoes/evidencias/2.0 node testar_navegador.js`. A suíte grava mais capturas do que as guardadas aqui (temas escuros de todas as telas e outras larguras); só esta seleção foi versionada.

### Pendentes, menu lateral, tema claro

Dois pedidos sem identificador utilizável continuam na lista, marcados e sem ação (o de cima pode ser preparado por quem administra).

![Pendentes, menu lateral, tema claro](pendentes-light.png)

### Pendentes, tema escuro

![Pendentes, tema escuro](pendentes-dark.png)

### Detalhe de um pedido pendente

![Detalhe, tema claro](detalhe-light.png)

![Detalhe, tema escuro](detalhe-dark.png)

### Confirmação antes do e-mail

![Confirmação antes de avisar o aluno](confirmacao-light.png)

### Pedido salvo, e-mail não enviado

![E-mail que falhou](email-falhou-light.png)

### Pedido alterado em outra sessão

O texto digitado continua na tela; "Recarregar pedido" mostra as observações atuais.

![Conflito de versão](conflito-light.png)

### Concluídos e busca no histórico (inclui 2021–2022, só consulta)

![Histórico](historico-light.png)

### Relatórios

![Relatórios](relatorios-light.png)

### Navegação por abas

![Abas](abas-light.png)

### Central de Ajuda

![Central de Ajuda](ajuda-light.png)

### Perfil LEITOR (sem ações de gravação)

![Detalhe para LEITOR](leitor-detalhe.png)

### Larguras

![360 px](largura-360.png)

![360 px, detalhe](largura-360-detalhe.png)

![768 px](largura-768.png)

### Conta sem acesso (nenhum dado é enviado)

![Sem acesso](sem-acesso-light.png)
