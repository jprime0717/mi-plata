# Mi Plata — cómo publicarla e instalarla en tu iPhone

## 1. Subir a GitHub (una sola vez, ~10 min desde el PC)
1. Entra a github.com con tu cuenta → **New repository**.
2. Nombre: `mi-plata`. Visibilidad: **Public** (GitHub Pages gratis lo necesita; tus datos NO van ahí, solo el código).
3. En el repo: **Add file → Upload files** y arrastra TODO el contenido de esta carpeta
   (`index.html`, `sw.js`, `manifest.webmanifest`, la carpeta `icons`). → **Commit changes**.
4. **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → **Save**.
5. En 1–2 minutos queda en: `https://TU-USUARIO.github.io/mi-plata/`

## 2. Instalar en el iPhone
1. Abre ese enlace en **Safari** (no en Chrome).
2. Toca **Compartir** → **Agregar a inicio** → **Agregar**.
3. Ábrela siempre desde el ícono. Funciona sin internet.

## 3. Primeros pasos en la app
- **Cuentas**: edita Efectivo / Banco / Ahorros con su saldo inicial, o crea Nequi, tarjeta, etc.
- **Ajustes → Bloqueo con PIN**, y luego activa **Face ID**.
- **Ajustes → Crear respaldo** cada cierto tiempo y guárdalo en Archivos / iCloud.

## Importante sobre tus datos
Se guardan solo dentro de la app en el iPhone. Si borras la app de la pantalla de inicio
se borran también sus datos: haz respaldo antes. Para pasarte a otro celular: respaldo → restaurar.

## Actualizaciones
Cuando cambiemos algo, se reemplaza el `index.html` en GitHub (y se sube la versión en `sw.js`).
Tus datos no se tocan.
