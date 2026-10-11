# Verificação da versão 1.10.0 — 11/10/2026

**Resultado local: 169 verificações aprovadas, zero falhas, em oito suítes.** Esta é a verificação da atualização visual sobre a baseline 1.9.3; não é uma nova homologação de todos os serviços reais do Google. As evidências completas da rodada estão em [evidencias/1.10.0](evidencias/1.10.0/README.md).

## Alteração e preservação

A comparação por SHA-256 e bytes confirma **28 arquivos originais idênticos**, **dois alterados** e **quatro novos** em `src/`. `Codigo.gs` muda somente `VERSAO_SISTEMA` de 1.9.3 para 1.10.0. `Painel.html` recebe composição/includes/ID da navegação. Todos os demais scripts `.gs` e controladores de negócio do cliente permanecem idênticos; `Validacoes.gs` da planilha das secretarias também.

Os novos arquivos isolam CSS, controles, ícones e adaptador de navegação. A troca move os mesmos nós e não recria formulários nem faz chamadas de negócio. Não há mudança de esquema/configuração/acionador. O [registro comparativo](evidencias/1.10.0/comparacao_baseline.json) lista hashes de cada arquivo.

## Suítes executadas

| Suíte | Resultado | Alcance |
|---|---|---|
| `testar_navegacao_visual.js` | 21/21 | sidebar padrão, mesma identidade/estado, perfis, rascunho, teclado, temas, reload, motion, toque, contraste e matriz responsiva |
| `testar_ajuda.js` | 50/50 | Central, busca/FAQ, foco/ESC/fundo, sobreposição, respostas atrasadas, perfis e orientação sobre resultados parciais |
| `testar_etapa8_previa_envio.js` | 26/26 | confirmação do conteúdo, prévia desatualizada, pendências e trava |
| `testar_etapa9_auditoria_envio.js` | 8/8 | resposta do envio e auditoria sem link cru |
| `testar_etapa7_trava_auditoria.js` | 19/19 | trava durante envio, ativação e acionadores |
| `testar_navegador_etapa8.js` | 27/27 | prévia, confirmação e envio pela interface real |
| `testar_navegador_etapa9.js` | 5/5 | auditoria e links permitidos do resultado pela interface |
| `testar_navegador_etapa6.js` | 13/13 | ficha, oferta, restauração e rascunhos pela interface |

Todas concluíram com código 0 e zero casos pulados nas contagens acima. Duas execuções iniciais produziram logs sem resumo final; foram descartadas e repetidas até haver resultado completo. O teste visual inicial detectou arredondamento no retângulo durante a animação: a medição final espera a transição e tolera 0,01 px de ponto flutuante. Isso não mudou a altura mínima CSS de 44 px. As evidências publicadas correspondem somente às execuções completas aprovadas.

## Visual e acessibilidade

Verificadas **360, 390, 480, 768 e 1440 px**, nos dois temas e modos, sem overflow global; barras/tabelas podem usar rolagem local. Alvos de navegação com ao menos 44 px. Capturas inspecionadas de desktop claro, abas claro e sidebar escura em desktop/celular. O menu móvel recolhe sem overlay e se reabre ao voltar ao desktop.

Setas verticais na sidebar, horizontais nas abas, Home/End e preservação de foco passaram. Ícones decorativos sem duplicar IDs/alvos ARIA; nove opções fixas de navegação com ícones, mais seletor e abas dinâmicas da prévia. Hover sobe 3 px em pointer fino; reduzido não transforma/anima; toque não aplica elevação.

Tema inicial Sistema, troca de preferência, persistência explícita e mudança do sistema operacional passaram. Reload mantém tema e retorna à sidebar. Nenhuma escrita em storage ou chamada adicional ao servidor durante alternância de layout.

**50 medições de contraste do texto da navegação** nos dois temas/modos: mínimo **5,04:1**, acima do alvo 4,5:1. Essa medição não é uma nova auditoria de todos os tokens/componentes da interface. Foco visível foi verificado; o tema com correção local de borda foi preservado.

Nos testes, a marca IPUSP continua inline; o recurso externo USP é substituído pelo harness por uma imagem de teste. Variantes/códigos de marca não foram alterados, mas o carregamento do recurso USP real precisa ser conferido no Google.

## Limites e homologação pendente

Página real no Chromium; backend real executado no simulador de Apps Script; transporte, planilhas, Drive, usuários e falhas sintéticos. O pacote preserva as suítes e evidências históricas, mas `rodar_suites.sh` completo, OCR de arquivos privados e reproduções de todas as versões antigas **não foram repetidos nesta rodada**.

O simulador não substitui identidade/domínio Workspace, autorização Drive, fórmulas e Tabelas reais, acionadores reais, tempos/quotas e implantação `/exec`. A 1.10.0 ainda não foi implantada por esta rodada.

Em homologação Google: conferir versão no rodapé, acesso admin/leitor/sem acesso, menu inicial, mudança de modo com estado, todos os temas, teclado/mobile e ciclo controlado de importação/grade. Antes de liberar envio operacional, conferir cópia indexada, fórmulas, nome do arquivo e dois acionadores. Dados iguais à prévia não provam conclusão integral. Veja [Instalação](INSTALACAO_E_ATUALIZACAO.md).
