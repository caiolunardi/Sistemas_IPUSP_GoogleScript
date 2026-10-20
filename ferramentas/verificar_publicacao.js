#!/usr/bin/env node
// Varredura de dados sensíveis antes de publicar (roda na CI a cada push e
// pode rodar localmente). Confere os arquivos versionados pelo Git:
//   - credenciais (chave privada, tokens do Google, GitHub, Slack, OpenAI);
//   - IDs de implantação (AKfyc…) fora da lista de implantações públicas;
//   - IDs de planilha ou pasta do Drive em links fora da lista pública;
//   - e-mails fora da lista de permitidos e dos domínios fictícios;
//   - planilhas, PDFs e documentos versionados (podem ter dados reais);
//   - imagens fora de evidencias/ e assets/.
// Os valores permitidos ficam em ferramentas/publicos.json, cada grupo com o
// motivo. Uso: node ferramentas/verificar_publicacao.js  (código 1 se achar algo)
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const PUB = JSON.parse(fs.readFileSync(path.join(__dirname, 'publicos.json'), 'utf8'));

const implantacoes = new Set(PUB.implantacoes_publicas.ids);
const pastas = new Set(PUB.pastas_drive_publicas.ids);
const emails = new Set(PUB.emails_permitidos.enderecos.map(e => e.toLowerCase()));
const dominios = PUB.emails_permitidos.dominios_ficticios.map(d => d.toLowerCase());
const ignorados = new Set(PUB.arquivos_ignorados.caminhos);

const CREDENCIAIS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'chave privada'],
  [/AIza[0-9A-Za-z_-]{35}/, 'chave de API do Google'],
  [/ya29\.[0-9A-Za-z_-]{20,}/, 'token OAuth do Google'],
  [/gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}/, 'token do GitHub'],
  [/xox[abprs]-[A-Za-z0-9-]{10,}/, 'token do Slack'],
  [/\bsk-[A-Za-z0-9_-]{20,}/, 'chave de API'],
  [/"client_secret"\s*:/, 'client_secret'],
  [/"private_key"\s*:/, 'chave de service account']
];
const DOCUMENTOS = /\.(csv|tsv|xlsx?|ods|pdf|docx?|odt|pptx?|zip)$/i;
const IMAGENS = /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i;
const BINARIOS = /\.(png|jpe?g|gif|webp|bmp|tiff?|ico|woff2?|ttf|otf|eot|traineddata)$/i;

function dominioPermitido(email) {
  const d = email.split('@').pop();
  return dominios.some(f => d === f || d.endsWith('.' + f));
}

const arquivos = execFileSync('git', ['ls-files', '-z'], { cwd: RAIZ, encoding: 'utf8' })
  .split('\0').filter(Boolean);

const achados = [];
const achar = (arquivo, linha, motivo, trecho) =>
  achados.push(`${arquivo}${linha ? ':' + linha : ''}  ${motivo}${trecho ? '  [' + trecho + ']' : ''}`);
// Mostra só o começo do valor, para o log da CI não republicar o dado.
const resumo = v => v.length > 12 ? v.slice(0, 8) + '…' : v;

for (const arquivo of arquivos) {
  if (DOCUMENTOS.test(arquivo)) { achar(arquivo, 0, 'documento ou planilha versionado (pode ter dados reais)'); continue; }
  if (IMAGENS.test(arquivo) && !/(^|\/)(evidencias|assets)\//.test(arquivo)) {
    achar(arquivo, 0, 'imagem fora de evidencias/ ou assets/ (prints só com dados fictícios, em evidencias/)');
  }
  if (BINARIOS.test(arquivo) || ignorados.has(arquivo)) continue;
  let texto;
  try { texto = fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'); } catch (e) { continue; }
  if (texto.includes('\0')) continue;

  texto.split('\n').forEach((linha, i) => {
    const n = i + 1;
    for (const [re, motivo] of CREDENCIAIS) if (re.test(linha)) achar(arquivo, n, motivo);

    for (const m of linha.matchAll(/AKfyc[A-Za-z0-9_-]{20,}/g)) {
      if (!implantacoes.has(m[0])) achar(arquivo, n, 'ID de implantação fora da lista pública', resumo(m[0]));
    }
    for (const m of linha.matchAll(/(?:\/d\/|\/folders\/|[?&]id=)([A-Za-z0-9_-]{25,})/g)) {
      if (!pastas.has(m[1])) achar(arquivo, n, 'ID de planilha ou pasta do Drive', resumo(m[1]));
    }
    for (const m of linha.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
      const email = m[0].toLowerCase();
      if (!emails.has(email) && !dominioPermitido(email)) achar(arquivo, n, 'e-mail fora da lista de permitidos', resumo(email));
    }
  });
}

if (achados.length) {
  console.log(`FALHA: ${achados.length} achado(s). Remova o dado ou, se for deliberadamente público, inclua-o em ferramentas/publicos.json com o motivo.\n`);
  achados.forEach(a => console.log('  ' + a));
  process.exit(1);
}
console.log(`ok: ${arquivos.length} arquivos versionados sem credencial, ID interno, e-mail fora da lista ou documento com dados.`);
