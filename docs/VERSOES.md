# Versões e Releases

Cada sistema tem a própria versão, porque cada um é um projeto Apps Script independente. No GitHub, uma versão vira uma **tag** e uma **Release**: a aba **Releases** do repositório mostra, por sistema, o que mudou e qual commit tem o código daquela versão.

Uma Release **marca o código do repositório**. Ela não publica nada no Google, e o GitHub não sabe o que está implantado. Quem implanta registra isso na Release (seção 4).

## 1. Formato da tag

`<sistema>-v<versão>`, com o nome da pasta em `sistemas/`:

| Sistema | Exemplo de tag |
|---|---|
| Painel de Solicitações | `painel-solicitacoes-v1.5` |
| Painel de Sistemas (servidores) | `painel-servidores-v1.1` |
| Grade Horária visual | `grade-horaria-visual-v2.0` |
| Estrutura Curricular e Grade Horária | `estrutura-curricular-v1.11.3` |
| Comunidade IPUSP | `busca-alunos-v1.3` |
| Exclusão de Disciplinas (formulário) | `exclusao-disciplinas-v1.2` |
| Trancamento Parcial (formulário) | `trancamento-parcial-v1.2` |
| Trancamento Total (formulário) | `trancamento-total-v1.3` |
| Gerenciador de Trancamento Total | `trancamento-total-gerenciador-v1.1` |
| Planilha das secretarias | `planilha-secretarias-v1.1` |

Gerenciadores usam o sufixo `-gerenciador` (código em `sistemas/<sistema>/gerenciador/`). Os formulários com gerenciador usam o nome do sistema sem sufixo.

A **Planilha das secretarias** tem código em `sistemas/estrutura-curricular/planilha-grade/` e documentação em `docs/sistemas/planilha-grade-secretarias/`; o workflow conhece esse caminho.

## 2. Quando subir a versão

O número é o mesmo do código (constante ou rodapé, quando existir) e dos documentos do sistema ([roteiro](ATUALIZAR_DOCUMENTACAO.md#2-em-todo-sistema-alterado)).

- **Último número** (1.11.2 → 1.11.3): correção ou ajuste que não muda o uso.
- **Número do meio** (1.4 → 1.5): função nova, tela nova ou mudança de regra que quem usa percebe.
- **Primeiro número** (1.x → 2.0): o sistema foi refeito, ou a mudança exige outra planilha, outra configuração ou outro modo de uso.

Mudança só em documentação ou em testes não sobe a versão nem gera tag.

## 3. Como criar uma versão

1. Termine a mudança, a documentação e os testes, e confira que a [CI](CI.md) ficou ✓ no commit.
2. Escreva `notas-de-versao/<tag>.md` (veja os existentes): o que mudou para quem usa, o que copiar para o Apps Script e a linha **Implantação: ainda não implantada**. Commit e push.
3. Crie a tag de um destes jeitos:
   - **Pelo GitHub, sem linha de comando:** **Actions → Release → Run workflow**, escreva a tag (por exemplo `exclusao-disciplinas-v1.3`; várias, separadas por espaço) e clique em **Run workflow**. A tag é criada no último commit do `main`.
   - **Pelo git**, num commit específico:

     ```bash
     git tag -a exclusao-disciplinas-v1.3 -m "Exclusão de Disciplinas 1.3"
     git push origin exclusao-disciplinas-v1.3
     ```

     Envie no máximo três tags por push: com mais que isso o GitHub não dispara o workflow.

4. O workflow [`.github/workflows/release.yml`](../.github/workflows/release.yml) confere o formato da tag e a pasta do sistema e cria a Release com o texto das notas. Se o arquivo de notas não existir, a Release lista os commits do sistema desde a tag anterior. Rodar de novo com uma tag que já tem Release não muda nada.

A tag precisa apontar para um commit que já tenha o `release.yml`. Não mova nem apague uma tag já enviada; se algo saiu errado, crie a versão seguinte.

## 4. Quando a versão for implantada no Google

Edite a Release no GitHub (**Releases → a versão → editar**) e troque a linha de implantação por **Implantada em DD/MM/AAAA** (e, se houver, "homologada no `/exec` de homologação em …"). Atualize também o README do sistema em `docs/sistemas/<sistema>/`, que é onde o estado de implantação fica registrado.

## 5. Primeiras tags (20/10/2026)

As tags abaixo foram criadas de uma vez pelo **Run workflow**, quando o versionamento começou, e todas apontam para o mesmo commit do `main` (posterior ao `release.yml`). As notas de cada uma dizem em que commit anterior a versão foi concluída. As versões seguintes apontam para o próprio commit.

| Tag | Versão concluída no commit |
|---|---|
| `painel-solicitacoes-v1.5` | `6d702d3` |
| `painel-servidores-v1.0` | `8ba2026` (primeiro número dado a este painel) |
| `grade-horaria-visual-v2.0` | `a01b8ec` |
| `estrutura-curricular-v1.11.3` | `4ce9137` |
| `busca-alunos-v1.3` | `226d8c0` |
| `exclusao-disciplinas-v1.2` | `d127b0c` |
| `trancamento-parcial-v1.2` | `d127b0c` |
| `trancamento-total-v1.3` | `d127b0c` |
| `trancamento-total-gerenciador-v1.1` | `519ee25` |
