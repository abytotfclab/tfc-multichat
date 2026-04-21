# 🚀 SKILL: Deploy Nueva Versión — TFC MultiChat Streamer

> **Última versión desplegada:** v1.0.6

> Cuando el usuario diga "lee el deploy" o similar, ejecuta estos pasos EN ORDEN, sin pedir confirmación entre ellos. Al final, reporta un resumen.

---

## VARIABLES A PREGUNTAR ANTES DE EMPEZAR

Antes de arrancar, pregunta al usuario:
1. **¿Cuál es el número de la nueva versión?** (ej: `1.0.3`, `1.1.0`)
2. **¿Cuál es el mensaje del changelog?** (ej: "Soporte para NSIS y Auto-update")

---

## PASOS DE EJECUCIÓN

### PASO 1 — Actualizar Versionado en el Código
- Abre `e:\MULTI CHAT APP 2026\package.json` y cambia el campo `"version"` al número indicado.
- Abre `e:\MULTI CHAT APP 2026\src\App.jsx` y actualiza `brand__version` (ej: `v1.0.2`).
- Actualiza la línea de "Última versión desplegada" al principio de este archivo (`DEPLOY.skill.md`).

### PASO 2 — Commit y Creación de Tag
Ejecuta estos comandos en orden:
```powershell
git add .
git commit -m "release: v{VERSION} - {CHANGELOG}"
git tag v{VERSION}
git push origin main
git push origin v{VERSION}
```

### PASO 3 — Build del ejecutable e Instalador
Ejecuta en `e:\MULTI CHAT APP 2026` (CMD COMO ADMINISTRADOR si da error de symlinks):
```powershell
npm run package
```
- **IMPORTANTE:** Este comando generará en la carpeta `dist`:
  1. `TFC-MultiChat-{VERSION}.exe` (Instalador NSIS)
  2. `TFC-MultiChat-{VERSION}.exe.blockmap`
  3. `latest.yml` (CRÍTICO para el Auto-Updater)

### PASO 4 — Finalizar Release en GitHub
Informa al usuario que debe subir los 3 archivos a la Release de GitHub:

> ⚠️ **ACCIÓN FINAL REQUERIDA (Auto-Updater):**
> 1. Ve a la release: https://github.com/abytotfclab/tfc-multichat/releases/edit/v{VERSION}
> 2. **SUBE ESTOS 3 ARCHIVOS (Obligatorios):**
>    - `dist/TFC-MultiChat-{VERSION}.exe`
>    - `dist/latest.yml`
>    - `dist/TFC-MultiChat-{VERSION}.exe.blockmap`
> 3. Pulsa **"Update release"**.

---

## RESUMEN FINAL (reportar al usuario)

Al terminar, genera un resumen como este:

```
✅ Deploy iniciado — TFC MultiChat v{VERSION}

📦 Instalador: dist/TFC-MultiChat-{VERSION}.exe
📄 Metadata:   latest.yml (Cargado)
🔗 GitHub:     https://github.com/abytotfclab/tfc-multichat/releases/edit/v{VERSION}

⚠️ Recuerda subir el .exe Y el latest.yml para que el auto-updater funcione.
```

---

## NOTAS
- El instalador NSIS preguntará ahora si se desea crear acceso directo.
- Se ha añadido un botón manual de "Buscar Actualizaciones" en Ajustes.
