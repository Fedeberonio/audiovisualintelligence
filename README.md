# Audiovisual Intelligence — Coming Soon

## Archivos
- `index.html`: Landing mínima que muestra un GIF y el texto **Coming Soon**.
- `CNAME`: configura el dominio personalizado `audiovisualintelligence.ai` en GitHub Pages.

## Cómo usar
1. Copia tu GIF a esta carpeta y nómbralo `comingsoon.gif` (o cambia el `src` en `index.html`).
2. Abre **GitHub Desktop** → *Add local repository* → selecciona esta carpeta.
3. **Commit & Publish** a tu cuenta de GitHub (rama `main`).
4. En GitHub → *Settings → Pages*:
   - Source: `Deploy from a branch` → `main` → `/ (root)` → **Save**.
   - Custom domain: `audiovisualintelligence.ai` → **Save** (esto respetará el archivo `CNAME`).
5. En el panel de tu dominio, crea los registros A hacia GitHub Pages (185.199.108.153, .109.153, .110.153, .111.153).

Listo: al propagarse el DNS, `https://audiovisualintelligence.ai` mostrará esta página.
