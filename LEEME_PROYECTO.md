# 🚀 PROYECTO: TFC MultiChat Streamer - BITÁCORA DE DESARROLLO

Este archivo contiene el estado actual de la aplicación (v1.0.6) y sirve como contexto para iniciar la próxima sesión de trabajo.

## 📋 ESTADO ACTUAL (Funciones Completadas)

1. **Integración Multi-Plataforma (Viewer Mode):**
   - **Twitch (💜):** Integración mediante `tmi.js` (soporte de links completos y handles). Corrección de badges aplicada.
   - **TikTok (🧡):** Uso de `tiktok-live-connector` funcional. Color base unificado a **Naranja vibrante (#FF8C00)** y actualizado con el ícono de corazón 🧡 para no confundir con mods de Twitch.
   - **YouTube (❤️):** Implementado con `youtube-chat`. Permite conectar links `watch?v=`, directos de `/live/` o identificadores de @canal.

2. **Sistema de Actualización Automática (Auto-Updater):**
   - Integrado mediante `electron-updater` apuntando a Github Releases.
   - Actualización mediante botón manual **"🔄 BUSCAR ACTUALIZACIÓN"** colocado en el footer de la app.
   - Proceso depurado en v1.0.6 (sincronizando el aviso de instalación tras el render loading y sin notificaciones duplicadas flotantes), listo para actualizaciones a v1.0.7 de manera estable.
   - Skill interactiva `DEPLOY.skill.md` para automatizar el versionado, empaquetado (NSIS) y directrices para Github.

3. **Sistema de Seguridad y Licencias (HWID):**
   - Activación enlazada al Hardware ID.
   - Conexión a Firebase Firestore para validar llaves de licencia en la nube.
   - Flujo de `LicenseGuard` operativo que bloquea uso sin autorización y vincula un PC con la licencia proporcionada.

4. **TTS y Eventos:**
   - Text-to-Speech incorporado para leer mensajes con filtrado de roles.
   - Pestaña de Sorteos (Tickets y Palabra Oculta) operacionales.
   - Inspección del historial en vivo de los usuarios (Tracker).

## 🛠 TECH STACK
* **Core:** Electron, Vite, Node.js.
* **Frontend:** React, Zustand (estado global) y CSS nativo modularizado.
* **Backend Simulado:** Firebase Firestore (Validación y control).
* **Distribución:** `electron-builder` para `.exe` NSIS unificado.

## 🎯 PRÓXIMO PASO (Para la sesión v1.0.7)
* El usuario ha indicado que hay **nuevos cambios o modificaciones conceptuales/UI** a realizar para desplegar la **versión v1.0.7**. 
* Al iniciar la nueva sesión, lee este documento para ubicar el contexto y espera las instrucciones de los nuevos arreglos.

---
**Nota para Antigravity en la nueva sesión:**
Nos encontramos parados en la base solida de la **v1.0.6**. El ecosistema ya cuenta con licenciamiento de hardware, auto-actualizador 100% funcional y la estética está bien depurada (especialmente el distintivo visual naranja en TikTok). ¡Espera las indicaciones de las nuevas mejoras! 🚀
