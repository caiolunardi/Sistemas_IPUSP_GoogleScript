#!/usr/bin/env node
// Confere que as cópias de shared/ dentro de sistemas/ continuam idênticas à
// origem (tema GRADIP, Central de Ajuda e núcleo da auditoria). Um arquivo com nome de cópia que
// não é idêntico precisa estar em "proprios" de ferramentas/copias_shared.json,
// com o motivo. Uso: node ferramentas/verificar_copias_shared.js  (código 1 se achar algo)
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'copias_shared.json'), 'utf8'));
const ler = f => fs.readFileSync(path.join(RAIZ, f));

const arquivos = execFileSync('git', ['ls-files', '-z', 'sistemas'], { cwd: RAIZ, encoding: 'utf8' })
  .split('\0').filter(f => /\/src\//.test(f));

const falhas = [];
let iguais = 0, proprios = 0;
for (const f of arquivos) {
  const padrao = CFG.padroes.find(p => new RegExp(p.nome).test(path.basename(f)));
  if (!padrao) continue;
  const igual = ler(f).equals(ler(padrao.origem));
  if (CFG.proprios[f]) {
    proprios++;
    if (igual) falhas.push(`${f}: está em "proprios" mas é idêntico a ${padrao.origem}; tire-o da lista`);
  } else if (igual) {
    iguais++;
  } else {
    falhas.push(`${f}: difere de ${padrao.origem}. Copie a origem de novo, ou, se a diferença for de propósito, registre o motivo em "proprios"`);
  }
}
for (const f of Object.keys(CFG.proprios)) {
  if (!arquivos.includes(f)) falhas.push(`${f}: listado em "proprios" mas não existe; tire-o da lista`);
}

if (falhas.length) {
  console.log(`FALHA: ${falhas.length} cópia(s) de shared/ fora do lugar.\n`);
  falhas.forEach(x => console.log('  ' + x));
  process.exit(1);
}
console.log(`ok: ${iguais} cópias idênticas a shared/ e ${proprios} implementações próprias registradas.`);
