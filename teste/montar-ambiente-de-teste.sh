#!/usr/bin/env bash
# Monta a pasta "ambiente-de-teste": o MESMO código do sistema, mas ligado a um banco
# de mentira que roda dentro do navegador (sem Supabase, sem internet, dados fictícios).
# Uso:  bash teste/montar-ambiente-de-teste.sh [pasta-de-destino]
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-$RAIZ/../ambiente-de-teste}"
mkdir -p "$DEST"; find "$DEST" -mindepth 1 -delete
# copia o sistema (sem banco, docs, git e arquivos de desenvolvimento)
tar -C "$RAIZ" --exclude=.git --exclude=supabase --exclude=docs --exclude=.github \
    --exclude='teste/_*' --exclude='teste/*.md' --exclude='teste/*.sh' -cf - . | tar -C "$DEST" -xf -
# troca a configuração real pelo carregador do banco de mentira (teste/teste.js),
# que entra ANTES dos outros scripts, tanto na casca quanto dentro dos módulos
cat > "$DEST/config.js" <<'JS'
/* CONFIGURAÇÃO DO AMBIENTE DE TESTES (gerado por teste/montar-ambiente-de-teste.sh) */
(function () {
  var src = document.currentScript.src;
  var raiz = src.slice(0, src.lastIndexOf('/') + 1);
  document.write('<script src="' + raiz + 'teste/teste.js"><\/script>');
})();
JS
echo "Ambiente de teste pronto em: $DEST"
