# Video demo de Tiendita (Remotion)

Video de ~78 s, 1920×1080, armado con capturas reales de tienditawapu.vercel.app:
zoom de cámara, cursor animado, subtítulos y placas de texto.

## Volver a generarlo

```bash
cd video
npm install

# Este Ubuntu no trae libnss3/libnspr4 ni la fuente de emojis. Se extrajeron
# sin root en .libs/ (apt-get download + dpkg -x). Si las tenés instaladas
# en el sistema, no hacen falta estas dos variables.
export LD_LIBRARY_PATH=$PWD/.libs/root/usr/lib/x86_64-linux-gnu
export FONTCONFIG_FILE=$PWD/.libs/fonts.conf
BX=$(ls -d ~/.cache/ms-playwright/chromium_headless_shell-*/*/ | head -1)chrome-headless-shell

# 1. Capturas (shoot-flow CREA una tienda demo nueva en producción:
#    cambiá SLUG en el script si ya existe)
node scripts/shoot-public.mjs
node scripts/shoot-flow.mjs

# 2. Previsualizar y editar textos/tiempos (src/Video.tsx)
npx remotion studio src/index.ts --browser-executable=$BX

# 3. Renderizar
npx remotion render src/index.ts Tiendita out/tiendita-demo.mp4 --browser-executable=$BX --concurrency=2 --crf=18
```

## Dónde tocar

- `src/Video.tsx`: orden de escenas, duración (en frames, 30 fps), subtítulos y zoom de cada pantalla.
- `src/Cards.tsx`: placas de texto (intro, problema, "todo pasa solo", sin custodia, cierre).
- `src/ScreenScene.tsx`: estilo de la ventana, cámara, cursor y subtítulos.
