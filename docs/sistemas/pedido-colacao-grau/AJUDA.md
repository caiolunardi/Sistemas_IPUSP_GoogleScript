# Ajuda do aluno — Formulário de Pedido de Colação de Grau

**Estado:** Central de Ajuda GRADIP implementada na **2.1.0 (em PR, não homologada nem implantada)**, em [`ColacaoAjuda.html`](../../../sistemas/pedido-colacao-grau/src/ColacaoAjuda.html). Comportamento e estilos são cópias byte-idênticas de `shared/ajuda/` (`ColacaoAjudaUI.html`, `ColacaoAjudaEstilos.html`). Nenhuma chamada ao servidor para abrir, buscar ou navegar.

Este arquivo é o **texto-fonte** da ajuda: ao mudar um texto aqui, mude também em `ColacaoAjuda.html` (e vice-versa). Os IDs de seção são usados pelos gatilhos de `ColacaoApp.html`.

## Regras editoriais

- Público: alunos. Sem nomes de planilhas, pastas, abas, funções, IDs ou detalhes do Apps Script.
- Datas do período não são copiadas: mudam a cada semestre e quem as divulga é o Serviço de Graduação.
- Textos normativos (diploma digital, 2ª via, Código de Ética) ficam só no formulário; a ajuda aponta para eles em vez de repeti-los.
- "Recebido não é deferido": nenhuma resposta promete aprovação, antecipação ou prazo de análise.

## Gatilhos contextuais na página

| Onde | Texto | Seção |
| --- | --- | --- |
| cabeçalho | Ajuda | `ajuda-inicio` |
| topo do formulário | Como preencher? / Quais documentos enviar? / O que acontece depois? | `ajuda-preencher`, `ajuda-documentos`, `ajuda-depois` |
| aviso de cadastro não confirmado | Por que isso aparece? | `ajuda-cadastro` |
| seção Documentos | O arquivo não foi aceito? | `ajuda-documentos` |
| tela de erro | Como resolver? | `ajuda-problemas` |
| formulário fechado | Quando posso pedir? | `ajuda-prazo` |
| pedido já existente | Como funciona a correção? | `ajuda-correcao` |
| pedido recebido | O que acontece agora? | `ajuda-depois` |
| Meus pedidos | O que significa cada situação? | `ajuda-meus-pedidos` |

## Conteúdo

### Comece aqui (`ajuda-inicio`)

- **Para que serve** Este formulário envia ao Serviço de Graduação do Instituto de Psicologia o seu pedido de **colação de grau** do curso que você concluiu no semestre: Formação de Psicólogo(a), Bacharelado ou Licenciatura em Psicologia.
- **Em cinco passos** 1. Confira os seus dados. 2. Anexe o RG/CIN e a Certidão de Nascimento. 3. Marque o curso concluído e responda se continuará matriculado. 4. Preencha telefone, e-mail alternativo, procuração e colação antecipada. 5. Clique em **Enviar Pedido** e guarde o número do protocolo.
- **Use a sua conta USP** O formulário só abre para quem está conectado ao navegador com o e-mail **@usp.br**. O pedido fica ligado a essa conta: é com ela que você acompanha e corrige o pedido depois.
- **Recebido não é deferido** O protocolo confirma que o pedido chegou. Depois disso, o Serviço de Graduação ainda confere os seus dados e documentos.

### Quando posso pedir (`ajuda-prazo`)

- **Só no período aberto** O formulário recebe pedidos apenas no período definido pelo Serviço de Graduação para cada colação. As datas são divulgadas pelo Serviço de Graduação.
- **Apareceu "Formulário fechado no momento"** O período não está aberto agora. Se você já fez um pedido, o botão **Meus pedidos** continua disponível para consultar a situação e reenviar o comprovante.
- **O prazo acabou enquanto eu preenchia** O formulário confere o prazo no envio. Se o prazo terminou com a página aberta, o pedido não é registrado e aparece um aviso. Para qualquer pedido fora do prazo, fale com o Serviço de Graduação.
- **Um pedido por colação** Cada conta tem um pedido por colação. Se você já enviou, a página mostra o seu protocolo e, quando ainda for possível, o botão **Corrigir o pedido**.

### Como preencher (`ajuda-preencher`)

- **Nome completo** Escreva o nome exatamente como está na Certidão de Nascimento, com os acentos. Ele será usado no Certificado de Colação de Grau, no Histórico Escolar Final e no Diploma.
- **Nome e Nº USP sem edição** Quando o seu cadastro é confirmado, nome e Nº USP vêm dele e não podem ser mudados no formulário. Se algo estiver errado, descreva no campo **O seu nome ou nº USP está errado?**: o pedido é recebido do mesmo jeito e a equipe confere.
- **Nº RG/CIN** Digite como está no documento, com pontos e traços.
- **Curso concluído** Marque o curso ou complemento que você concluiu neste semestre. Se concluiu mais de um, marque todos.
- **Vai continuar matriculado?** Responda se no próximo semestre você continuará matriculado no IPUSP. Se sim, marque as habilitações que continuará cursando; a lista mostra só as que você não marcou como concluídas.
- **Telefone celular** Com DDD e sem espaços, por exemplo 11999999999. Se for preciso, a equipe entra em contato por WhatsApp nesse número.
- **E-mail alternativo** Informe um e-mail pessoal, diferente do e-mail USP. Depois que você deixa de ter vínculo com a USP, o e-mail institucional é desativado, e a equipe usa o alternativo para falar com você.
- **Colação por procuração** Marque **Sim** se outra pessoa vai colar grau por você e informe o nome e o RG/CIN dela. A procuração, com firma reconhecida, deve ser entregue ao Serviço de Graduação até três dias úteis antes da data da colação.
- **Colação antecipada** É só para quem precisa do certificado antes da colação regular por causa de concurso, processo seletivo, residência, aprimoramento, pós-graduação ou posse em vaga pública, quando o edital exigir. Cada pedido é analisado pela equipe; marcar **Sim** não garante a antecipação.
- **Campo marcado em vermelho** Ao clicar em **Enviar Pedido**, o formulário confere os campos. O primeiro com problema fica marcado, com a explicação logo abaixo, e o cursor vai até ele. Corrija e clique em Enviar de novo.

### Documentos (`ajuda-documentos`)

- **O que anexar** Dois documentos são obrigatórios: o **RG ou CIN** (um só documento, o mais recente, fora do plástico e aberto, com tudo legível) e a **Certidão de Nascimento**, usada para conferir a grafia do nome.
- **Formato e tamanho** Arquivos em **PDF, JPG ou PNG**, com até **10 MB** cada. Arraste o arquivo para a área tracejada ou clique nela para escolher.
- **O arquivo não foi aceito** Confira se é mesmo PDF, JPG ou PNG e se tem até 10 MB. O formulário confere o conteúdo do arquivo, não só o nome: um arquivo de outro tipo renomeado para .pdf é recusado. Se for uma foto grande, diminua a resolução ou salve como PDF.
- **Documento já enviado** Na correção, os documentos já enviados aparecem como **Já enviado neste pedido**. Escolha outro arquivo só se quiser trocá-lo; os que você não trocar continuam valendo.

### Seu cadastro (`ajuda-cadastro`)

- **Apareceu "Não conseguimos confirmar o seu cadastro automaticamente"** O formulário não encontrou o seu cadastro de aluno ligado a esta conta. Preencha nome, Nº USP e ano de ingresso. O pedido é recebido normalmente, com protocolo, e a equipe confere o cadastro depois.
- **Cadastro em conferência** Quer dizer que a equipe ainda vai conferir os dados que você informou. Isso não impede o recebimento do pedido. Se o cadastro não for aprovado, a situação em **Meus pedidos** pede que você fale com o Serviço de Graduação.
- **Causa comum** Estar conectado com um e-mail USP diferente do que consta no cadastro. Se tiver mais de uma conta USP, use a principal.

### Depois de enviar (`ajuda-depois`)

- **Protocolo** A tela **Pedido recebido** mostra o número do protocolo, a data e a hora do recebimento. O protocolo só aparece depois que o pedido está registrado. Guarde o número para falar com o Serviço de Graduação.
- **Comprovante por e-mail** Você recebe no e-mail USP um comprovante com os dados enviados. Ele confirma o recebimento; não é a resposta do pedido. Se não chegar, reenvie pelo botão em **Meus pedidos**.
- **O que acontece agora** O Serviço de Graduação confere os seus dados e documentos. Acompanhe a situação em **Meus pedidos** e, se for preciso, a equipe fala com você pelo e-mail ou pelo telefone informados.

### Corrigir o pedido (`ajuda-correcao`)

- **Quando dá para corrigir** Enquanto o prazo estiver aberto e a equipe ainda não tiver começado a conferir o seu pedido. Abra o formulário de novo e clique em **Corrigir o pedido**.
- **O que muda na correção** O protocolo e a data e a hora do pedido continuam os originais. Mude só o que precisa e clique em **Enviar correção**. Os documentos que você não trocar continuam os já enviados.
- **Apareceu "Nada mudou em relação ao pedido"** A correção só é registrada quando algo muda. Altere o que precisa corrigir e envie de novo.
- **Não aparece o botão de corrigir** A equipe já começou a conferir o seu pedido ou o prazo terminou. Para corrigir alguma informação, fale com o Serviço de Graduação.

### Meus pedidos (`ajuda-meus-pedidos`)

- **O que aparece** Os pedidos de colação feitos com a sua conta, com protocolo, colação, data do recebimento, situação do cadastro e andamento.
- **Andamento** **Aguardando encaminhamento à equipe**: o pedido foi recebido e ainda não chegou à conferência. **Em análise pela equipe** ou **Em conferência pela equipe**: a equipe está conferindo. **Correção em conferência pela equipe**: a sua correção chegou e está sendo conferida.
- **Envio incompleto** O seu último envio não terminou. Abra o formulário, anexe os documentos de novo e clique em **Enviar Pedido**: ele continua de onde parou, com a data e a hora em que começou, e não cria pedido duplicado.
- **Reenviar o comprovante** O botão envia o comprovante de novo para o seu e-mail USP. A mensagem aparece logo abaixo do botão. Depois de um reenvio, o próximo fica disponível em 2 minutos.

### Problemas comuns (`ajuda-problemas`)

- **O formulário não abre ou pede login** Uma causa comum é estar conectado com uma conta Google pessoal (por exemplo, @gmail.com) em vez da conta @usp.br, ou com várias contas ao mesmo tempo. Tente: sair das outras contas ou abrir o link numa janela anônima, entrar só com o e-mail USP e abrir a página de novo.
- **Apareceu "Não foi possível abrir o formulário"** Recarregue a página. Se o erro continuar, tente de novo em alguns minutos. Persistindo, avise o Serviço de Graduação.
- **O envio não terminou** Leia a mensagem no topo da página. Se ela pedir para enviar de novo, clique no mesmo botão: o pedido não é duplicado. Enquanto não aparecer a tela **Pedido recebido** com o protocolo, o pedido não está registrado.
- **O comprovante não chegou** Confira a caixa de spam ou lixo eletrônico do e-mail USP. O pedido continua registrado mesmo sem o comprovante; você pode reenviá-lo em **Meus pedidos**.

### Aparência (`ajuda-aparencia`)

- **Claro, Escuro ou Sistema** Use o seletor **Aparência** no topo. **Sistema** acompanha a configuração do seu computador ou celular. A escolha fica salva só neste navegador.

### Perguntas frequentes (`ajuda-faq`)

- **Ter o protocolo garante a colação?** Não. O protocolo confirma que o pedido foi recebido. O Serviço de Graduação ainda confere os seus dados e documentos.
- **Cliquei em enviar de novo. Ficou duplicado?** Não. Reenviar pelo mesmo botão continua o mesmo pedido. Cada conta tem um pedido por colação.
- **O diploma será impresso?** A orientação em vigor está no texto do campo **Certidão de Nascimento**, no próprio formulário. Em caso de dúvida, fale com o Serviço de Graduação.
- **Quem vê o que eu envio?** O pedido e os documentos vão para o Serviço de Graduação, que os usa para a colação de grau e a emissão dos documentos de conclusão. Neste formulário, cada aluno vê só os próprios pedidos.
- **Como volto ao Painel de Solicitações?** Quando você já tem um pedido, a página mostra o botão **Voltar ao Painel de Solicitações**, quando ele estiver disponível.

## Conferir na homologação

Duplicações inevitáveis com textos da página: limite de 10 MB e formatos, intervalo de 2 minutos do reenvio, prazo de três dias úteis da procuração e as situações de "Meus pedidos". Se um deles mudar no formulário ou no servidor, mude aqui e em `ColacaoAjuda.html`.
