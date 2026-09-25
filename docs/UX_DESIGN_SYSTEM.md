# GRADIP UI — Diretriz Visual dos Sistemas IPUSP

Versão: 1.1 — 2026-09-25

Este documento define a base visual comum para os Web Apps do Serviço de Graduação do IPUSP. O objetivo não é tornar todos os sistemas idênticos, mas garantir coerência de identidade, legibilidade, acessibilidade e comportamento entre Light Mode e Dark Mode.

Para implementação prática dos componentes, consulte também `UX_COMPONENT_RECIPES.md`. O contrato técnico de preferência e resolução de tema está em `THEME_IMPLEMENTATION.md`.

---

## 1. Princípios

### 1.1 Institucional antes de decorativo
A interface deve parecer um serviço institucional: clara, sóbria, previsível e orientada à tarefa.

### 1.2 Light e Dark são o mesmo produto
Dark Mode não é uma segunda interface. Estrutura, hierarquia, informação e comportamento permanecem iguais. Mudam apenas tokens visuais.

### 1.3 Tema padrão = Sistema
Sem escolha anterior do usuário, o Web App acompanha `prefers-color-scheme`.

### 1.4 Regra de negócio não conhece tema
Tema é responsabilidade do frontend. Não deve criar dependência de Apps Script server-side, planilha, banco, sessão ou e-mail.

### 1.5 Semântica antes da cor
Estados como aberto/fechado, sucesso/erro, pendente/concluído devem sempre ter texto, ícone ou outro sinal além da cor.

---

## 2. Marca IPUSP

A fonte institucional usada neste repositório é a pasta:

**Identidade Visual IPUSP | Aprovada pelo CTA de junho de 2024**

Os ativos web mantidos em `assets/ipusp/` preservam a geometria da marca institucional.

### Fundo claro
Usar a marca IPUSP azul.

Arquivo:
`assets/ipusp/logo-ipusp-azul.svg`

O SVG institucional de origem usa o azul:
`#00509D`

### Fundo escuro
Usar a marca IPUSP em negativo/branco.

Arquivo:
`assets/ipusp/logo-ipusp-branco.svg`

Não aplicar `filter: invert()`, `brightness()` ou filtros equivalentes sobre a versão azul.

### Restrições
- não deformar;
- não alterar proporção;
- não aplicar sombra decorativa;
- não adicionar contorno;
- não recolorir com cores do sistema;
- não usar a versão azul sobre superfície escura com contraste insuficiente;
- preservar área de respiro no cabeçalho.

A procedência detalhada está em `assets/ipusp/README.md`.

---

## 3. Paleta base

### 3.1 Cor institucional fixa

| Token conceitual | Valor |
|---|---|
| Azul IPUSP | `#00509D` |

Essa cor é identidade de marca. Tokens interativos podem assumir variações mais claras no Dark Mode para garantir contraste.

### 3.2 Light Mode

| Papel | Token | Valor |
|---|---|---|
| Fundo da página | `--gradip-bg` | `#F5F6F7` |
| Superfície principal | `--gradip-surface` | `#FFFFFF` |
| Superfície secundária | `--gradip-surface-2` | `#F8FAFC` |
| Superfície elevada | `--gradip-surface-elevated` | `#FFFFFF` |
| Texto principal | `--gradip-text` | `#1F2933` |
| Texto secundário | `--gradip-text-muted` | `#5F6B76` |
| Borda | `--gradip-border` | `#D8DEE4` |
| Borda forte | `--gradip-border-strong` | `#B8C2CC` |
| Link | `--gradip-link` | `#005AA9` |
| Link hover | `--gradip-link-hover` | `#00457F` |
| Foco | `--gradip-focus` | `#00509D` |
| Header | `--gradip-header-bg` | `#FFFFFF` |
| Barra institucional | `--gradip-header-accent` | `#00509D` |

### 3.3 Dark Mode

A base escura usa azul-petróleo, evitando preto absoluto.

| Papel | Token | Valor |
|---|---|---|
| Fundo da página | `--gradip-bg` | `#081219` |
| Header profundo | `--gradip-header-bg` | `#0B1822` |
| Superfície principal | `--gradip-surface` | `#101E28` |
| Superfície secundária | `--gradip-surface-2` | `#172630` |
| Superfície elevada | `--gradip-surface-elevated` | `#1A2A35` |
| Texto principal | `--gradip-text` | `#F7F3EF` |
| Texto secundário | `--gradip-text-muted` | `#B9AFA7` |
| Borda | `--gradip-border` | `#2D3D48` |
| Borda forte | `--gradip-border-strong` | `#405461` |
| Link | `--gradip-link` | `#66B5F2` |
| Link hover | `--gradip-link-hover` | `#8CC8F5` |
| Foco | `--gradip-focus` | `#7CC4FF` |
| Barra institucional | `--gradip-header-accent` | `#2D8AD1` |

### 3.4 Estados semânticos

| Estado | Light | Dark |
|---|---|---|
| Sucesso | `#15803D` | `#4ADE80` |
| Aviso | `#B45309` | `#FBBF24` |
| Erro/perigo | `#B91C1C` | `#F87171` |
| Informação | `#2F6F9E` | `#7BA3BD` |

O texto sobre fundos semânticos deve ser escolhido por contraste, não apenas por convenção.

### 3.5 Ações, superfícies semânticas e estado disabled

Esses tokens evitam que cada sistema invente uma segunda paleta para botões e caixas de estado.

| Papel | Light | Dark |
|---|---|---|
| Primário — fundo | `#00509D` | `#2D8AD1` |
| Primário — hover | `#00457F` | `#4DA3E6` |
| Texto sobre primário | `#FFFFFF` | `#081219` |
| Sucesso — fundo sutil | `#ECFDF3` | `#10251A` |
| Sucesso — borda | `#86EFAC` | `#2E6B46` |
| Aviso — fundo sutil | `#FFF7E6` | `#2A220F` |
| Aviso — borda | `#F4C46B` | `#7A5D19` |
| Erro — fundo sutil | `#FEF2F2` | `#2B1719` |
| Erro — borda | `#FCA5A5` | `#7A343A` |
| Informação — fundo sutil | `#EFF6FF` | `#10232F` |
| Informação — borda | `#93C5FD` | `#355F78` |
| Disabled — fundo | `#EEF1F4` | `#172630` |
| Disabled — texto | `#5F6B76` | `#8F9BA3` |

Os nomes CSS correspondentes estão em `shared/GradipTema.html`. Para botões destrutivos sólidos, use `--gradip-danger` com `--gradip-on-danger`.

---

## 4. Tokens: regra obrigatória

Novos componentes devem usar tokens CSS semânticos, e não cores literais.

Preferir:

```css
.card {
  background: var(--gradip-surface);
  color: var(--gradip-text);
  border: 1px solid var(--gradip-border);
}
```

Evitar:

```css
.card {
  background: #fff;
  color: #222;
  border: 1px solid #ddd;
}
```

Cores específicas de domínio podem existir, mas devem ser documentadas e ter equivalente para ambos os temas.

---

## 5. Cabeçalho

O cabeçalho é o principal elemento institucional compartilhado.

### Deve conter
- marca IPUSP;
- nome do sistema;
- identificação "Serviço de Graduação — IPUSP", quando aplicável;
- ações globais realmente necessárias, como Ajuda e preferência de tema.

### Light Mode
- fundo claro;
- marca azul;
- texto escuro;
- barra inferior azul institucional.

### Dark Mode
- fundo `#0B1822`;
- marca branca;
- texto `#F7F3EF`;
- texto secundário `#B9AFA7`;
- barra inferior em azul visível no fundo escuro.

### Mobile
O cabeçalho não pode gerar rolagem horizontal nem expulsar ações para fora da viewport.

---

## 6. Cards e painéis

### Light
Cards podem usar sombra discreta e borda leve.

### Dark
A hierarquia deve vir principalmente de:
1. mudança de superfície;
2. borda;
3. espaçamento.

Sombras muito fortes ou "glow" não fazem parte da linguagem GRADIP.

Recomendação:
- página: `#081219`;
- card: `#101E28`;
- card secundário/hover: `#172630` ou `#1A2A35`;
- borda: `#2D3D48`.

---

## 7. Botões e links

### Botão primário
Pode manter fundo azul institucional com texto claro quando o contraste for adequado.

### Links no Dark Mode
Não usar `#00509D` como texto pequeno diretamente sobre `#081219`. Usar `--gradip-link` do tema escuro.

### Estados obrigatórios
- normal;
- hover;
- focus-visible;
- disabled;
- loading, quando aplicável.

A aparência disabled não pode depender apenas de reduzir opacidade a níveis ilegíveis.

---

## 8. Inputs, selects e textareas

Devem usar tokens de:
- superfície;
- texto;
- borda;
- placeholder;
- foco.

Dark Mode:
- fundo não deve ser preto puro;
- placeholder precisa continuar legível;
- autofill do navegador deve ser verificado;
- foco deve ser claramente visível.

Não remover outline sem substituto acessível.

---

## 9. Tabelas

Tabelas devem privilegiar leitura.

### Light
- cabeçalho levemente destacado;
- linhas com divisores suaves.

### Dark
- cabeçalho em superfície secundária;
- linhas em superfície principal;
- hover sutil;
- bordas visíveis;
- evitar zebra muito contrastante.

Badges dentro da tabela seguem tokens semânticos.

---

## 10. Alertas, avisos e badges

Usar cor + texto/ícone.

Exemplos:
- "Aberto" + indicador verde;
- "Fechado" + indicador vermelho;
- "Pendente" + texto e cor;
- "Atenção" + ícone e cor.

Em Dark Mode, não reutilizar o mesmo fundo pastel do Light Mode. Usar superfície escura com borda/ícone/texto semanticamente coloridos.

---

## 11. Modais e Central de Ajuda

O overlay deve escurecer o plano de fundo sem perder referência espacial.

O modal deve:
- usar `--gradip-surface-elevated`;
- possuir borda visível;
- bloquear scroll do body quando aberto, se já fizer parte do componente;
- preservar focus trap, ESC e retorno de foco;
- manter o mesmo conteúdo nos dois temas.

A Central de Ajuda deve receber o mesmo tema da aplicação; não deve parecer uma aplicação separada.

---

## 12. Tipografia

A tipografia atual de cada sistema pode ser preservada se for legível e coerente.

Diretrizes:
- corpo normalmente 14–16 px;
- texto secundário não deve depender de fonte pequena demais;
- títulos devem usar hierarquia por peso/tamanho antes de usar cores;
- evitar caixa alta em parágrafos;
- usar caixa alta apenas em pequenos rótulos quando fizer sentido.

---

## 13. Espaçamento e raio

Não existe obrigação de reescrever projetos antigos apenas para padronizar números, mas novos componentes devem manter uma linguagem consistente.

Referência:
- raio pequeno: 6 px;
- raio padrão: 8 px;
- raio card: 10–12 px;
- espaço interno mínimo de controles: confortável para toque;
- alvo de toque de ações importantes: aproximadamente 44 × 44 px.

---

## 14. Responsividade

Toda mudança visual deve ser verificada em:

- 360 px;
- 390 px;
- 480 px;
- 768 px;
- desktop.

Critérios:
- zero overflow horizontal involuntário;
- texto sem corte;
- badges podem quebrar linha;
- botões importantes continuam alcançáveis;
- header permanece íntegro;
- modal/ajuda continua utilizável;
- tabelas largas devem ter estratégia explícita.

---

## 15. Acessibilidade

Obrigatório:
- para texto normal, contraste alvo mínimo de 4,5:1;
- para texto grande, contraste alvo mínimo de 3:1, conforme definição WCAG;
- componentes de interface, bordas significativas e indicadores de foco devem atingir contraste perceptível adequado, usando 3:1 como referência quando o critério WCAG correspondente se aplicar;
- validar a combinação efetivamente renderizada; não assumir que um token isolado garante contraste;
- foco visível;
- teclado;
- labels associadas a campos;
- controles nativos quando possível;
- estados não comunicados apenas por cor;
- contraste adequado;
- `aria-expanded`, `aria-controls`, `role` e demais ARIA apenas quando semanticamente necessários;
- respeitar `prefers-reduced-motion`.

Animações do tema devem ser discretas e desabilitáveis.

---

## 16. Tema: comportamento esperado

Preferências disponíveis:

- **Sistema**
- **Claro**
- **Escuro**

Regras:
1. primeira visita = Sistema;
2. Sistema resolve via `prefers-color-scheme`;
3. Claro/Escuro são persistidos em `localStorage`;
4. se o usuário voltar para Sistema, mudança do SO deve refletir com a página aberta;
5. preferência de tema não exige login;
6. nenhuma preferência é enviada ao servidor;
7. quando houver controle manual, ele deve mostrar `Sistema` enquanto a preferência for `system`, mesmo que o tema resolvido naquele instante seja claro ou escuro;
8. mudanças feitas em outra aba da mesma origem podem ser sincronizadas via evento `storage`.

Contrato técnico em `THEME_IMPLEMENTATION.md`.

---

## 17. Migração de sistemas existentes

Não tentar converter todo o CSS de um sistema de uma vez se isso aumentar risco.

Ordem recomendada:
1. adicionar `GradipTema.html`;
2. mapear cores hardcoded;
3. substituir primeiro estrutura global por tokens;
4. adaptar header;
5. adaptar cards;
6. adaptar inputs/tabelas;
7. adaptar badges/alertas;
8. adaptar modais/ajuda;
9. revisar estados raros;
10. homologar mobile e ambos os temas.

Overrides específicos de `[data-theme="dark"]` são aceitáveis como etapa de migração, mas novos componentes devem nascer usando tokens.

---

## 18. O que não fazer

- duplicar toda a página em uma versão dark;
- criar lógica de tema no backend;
- salvar tema em planilha;
- aplicar `filter: invert` na aplicação;
- inverter imagens;
- usar preto `#000` como fundo principal;
- usar branco `#FFF` para todo texto dark sem necessidade;
- alterar logo para "combinar" com status;
- esconder informação no dark;
- introduzir gradientes/3D/glow sem decisão explícita de design;
- alterar regra funcional durante uma rodada visual sem necessidade comprovada.

---

## 19. Critério de aceite

Uma atualização visual está pronta quando:
- Light continua correto;
- Dark está completo;
- Sistema acompanha o SO;
- troca manual persiste;
- mudança do SO em modo Sistema atualiza a tela;
- marca correta é exibida por tema;
- não há overflow nas larguras-alvo;
- foco/teclado continuam funcionando;
- não houve regressão funcional;
- combinações principais de texto/fundo atendem aos critérios de contraste definidos neste documento;
- controles nativos (`input`, `select`, `textarea`) permanecem coerentes com `color-scheme` nos dois temas.
