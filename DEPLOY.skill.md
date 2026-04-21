# 🚀 SKILL: Deploy Nueva Versión — TFC MultiChat Streamer

> **Última versión desplegada:** v1.0.2

> Cuando el usuario diga "lee el deploy" o similar, ejecuta estos pasos EN ORDEN, sin pedir confirmación entre ellos. Al final, reporta un resumen.

---

## VARIABLES A PREGUNTAR ANTES DE EMPEZAR

Antes de arrancar, pregunta al usuario:
1. **¿Cuál es el número de la nueva versión?** (ej: `1.0.1`, `1.1.0`, `2.0.0`)
2. **¿Cuál es el mensaje del changelog?** (qué cambios hay en esta versión, ej: "Añadido soporte para raids en Twitch")

---

## PASOS DE EJECUCIÓN

### PASO 1 — Actualizar la versión en package.json
- Abre `e:\MULTI CHAT APP 2026\package.json`
- Cambia el campo `"version"` al número que el usuario indicó.

### PASO 2 — Commit del nuevo código
Ejecuta estos comandos en orden:
```
git add .
git commit -m "release: v{VERSION} - {CHANGELOG}"
git push origin main
```
*(Reemplaza `{VERSION}` y `{CHANGELOG}` con los datos del usuario)*

### PASO 3 — Build del ejecutable
Ejecuta en `e:\MULTI CHAT APP 2026`:
```
npm run package
```
Espera a que termine. El archivo resultante estará en:
`e:\MULTI CHAT APP 2026\dist\TFC-MultiChat.exe`

### PASO 4 — Crear el GitHub Release
Informa al usuario que debe hacer este paso MANUALMENTE (no tengo acceso directo a la API de GitHub Releases):

> ⚠️ **ACCIÓN MANUAL REQUERIDA:**
> 1. Ve a: https://github.com/abytotfclab/tfc-multichat/releases/new
> 2. En "Choose a tag", escribe `v{VERSION}` y selecciona "Create new tag".
> 3. En "Release title", escribe: `TFC MultiChat v{VERSION}`
> 4. En la descripción, pega el changelog: `{CHANGELOG}`
> 5. Sube el archivo: `dist\TFC-MultiChat.exe`
> 6. Pulsa **"Publish release"**.

### PASO 5 — Verificación final
- Confirma que el build terminó sin errores.
- Confirma que el `package.json` tiene la versión correcta.
- Informa al usuario que cuando sus clientes abran la app, el auto-updater detectará la nueva versión en el próximo arranque.

---

## RESUMEN FINAL (reportar al usuario)

Al terminar, genera un resumen como este:

```
✅ Deploy completado — TFC MultiChat v{VERSION}

📦 Build:     dist/TFC-MultiChat.exe
🐙 GitHub:    https://github.com/abytotfclab/tfc-multichat/releases
🔄 Updater:   Los usuarios recibirán la actualización en el próximo arranque

⚠️ Recuerda publicar el Release en GitHub con el .exe para activar el auto-updater.
```

---

## NOTAS
- El repositorio es: `https://github.com/abytotfclab/tfc-multichat`
- El target de build es Windows x64 Portable (`TFC-MultiChat.exe`)
- El auto-updater usa `electron-updater` y busca en GitHub Releases automáticamente.
- El `package.json` debe tener la sección `"publish"` con `"provider": "github"`.
