**Grade Horária visual** — versão de 15/10/2026, no `main` em 20/10/2026.

Depois de editar a planilha das secretarias, a próxima recarga da página já mostra a edição (antes, a versão antiga ficava 1 a 2 minutos, mesmo com CTRL+F5). A grade atual deixou de ir para o cache; só a referência a ela (qual planilha e o semestre) fica 10 minutos. Grades anteriores continuam com cache de 6 horas.

**No Apps Script:** trocar `Codigo.gs` e `GradeAjuda.html` e publicar nova versão da implantação existente.

**Implantação:** ainda não homologada no `/exec`. Esta Release marca o código do repositório; ela não atualiza o Apps Script. Quando a versão for publicada no Google, edite esta Release e registre a data.

Detalhes, instalação e histórico: [docs/sistemas/grade-horaria-visual/README.md](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/grade-horaria-visual/README.md).
