**Painel de Sistemas (servidores)** — versão 1.2, de 20/10/2026.

Saudação no cabeçalho: "Bom dia", "Boa tarde" ou "Boa noite" seguido do nome de quem abriu (`SaudacaoPainel.gs`):

- servidor: primeiro nome; setor: nome do setor inteiro; docente: Prof. ou Profª. e o primeiro nome;
- o nome vem dos cadastros `SERVIDORES` e `PLANILHA_DOCENTES` (chaves do `ID_INDEX`), pelo e-mail principal ou secundário;
- o período do dia segue o relógio do computador e troca sozinho com a página aberta;
- quem não está nos cadastros vê só "Bom dia"; um cadastro fora do ar não impede o painel de abrir.
- Central de Ajuda: pergunta sobre a saudação sem nome.
- Novo teste `testar_saudacao.js` (na CI).

**Implantação:** enviada ao editor e conferida no `/dev` em 20/10/2026; publicação no `/exec` pendente. Esta Release marca o código do repositório; ela não atualiza o Apps Script.

Detalhes: [docs/sistemas/painel-servidores/README.md](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/painel-servidores/README.md).
