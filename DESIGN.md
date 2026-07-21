---
name: AVI Learning Platform
description: Plataforma cinematografica de formacion y consultoria en IA audiovisual
colors:
  cinematic-black: "#050505"
  projection-white: "#f5f5f3"
  signal-orange: "#ff8a00"
  graphite: "#121212"
  steel-muted: "#9aa0a6"
  frame-border: "#242424"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  sm: "10px"
  md: "16px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "36px"
  xl: "72px"
components:
  button-primary:
    backgroundColor: "{colors.signal-orange}"
    textColor: "{colors.cinematic-black}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
  button-secondary:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.projection-white}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
  panel:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.projection-white}"
    rounded: "{rounded.md}"
    padding: "28px"
---

# Design System: AVI Learning Platform

## 1. Overview

**Creative North Star: "La sala de proyeccion activa"**

AVI conserva la atmosfera actual: un espacio oscuro, audiovisual y concentrado donde el naranja funciona como senal de orientacion. La plataforma debe sentirse como entrar a una sesion de trabajo dirigida por un profesional de cine, no como navegar una biblioteca academica o una startup de IA.

La evolucion introduce mayor claridad, jerarquia y estructura, pero no cambia el caracter existente. Los videos siguen aportando presencia cinematografica; la interfaz se mantiene sobria para que el contenido, la voz de Federico y el progreso del alumno sean protagonistas.

**Key Characteristics:**

- Oscura, cinematografica y enfocada.
- Naranja reservado para acciones, progreso y orientacion.
- Tipografia fuerte y directa.
- Superficies sobrias con profundidad controlada.
- Movimiento ambiental, nunca imprescindible para comprender o navegar.

## 2. Colors

Una paleta de sala oscura con una unica senal calida y reconocible.

### Primary

- **Signal Orange** (`#ff8a00`): acciones principales, progreso, foco y marcas AVI.

### Neutral

- **Cinematic Black** (`#050505`): fondo principal.
- **Projection White** (`#f5f5f3`): texto de alta prioridad.
- **Graphite** (`#121212`): superficies elevadas y controles secundarios.
- **Steel Muted** (`#9aa0a6`): texto secundario.
- **Frame Border** (`#242424`): divisores y limites sutiles.

**The Signal Rule.** El naranja identifica accion, estado o direccion. No se usa como decoracion extendida.

## 3. Typography

**Display Font:** system UI sans-serif

**Body Font:** system UI sans-serif

**Character:** Directa, tecnica y contemporanea. La escala y el peso crean la jerarquia sin introducir una nueva voz tipografica que rompa la identidad existente.

### Hierarchy

- **Display** (800, `clamp(2.5rem, 6vw, 4.5rem)`, 1.02): heroes y titulos de programa.
- **Headline** (800, `clamp(1.75rem, 4vw, 2.5rem)`, 1.1): secciones principales.
- **Title** (700, `1.25rem`, 1.25): modulos y recursos.
- **Body** (400, `1rem`, 1.6): lectura hasta 72 caracteres.
- **Label** (800, `0.75rem`, `0.12em`, mayusculas): estados y metadatos breves.

**The One Read Rule.** La jerarquia debe poder entenderse en una sola mirada, incluso sobre video.

## 4. Elevation

La profundidad proviene de capas tonales, bordes y oscurecimiento del video. Las sombras son ambientales y se reservan para navegacion flotante, dialogos y estados interactivos.

### Shadow Vocabulary

- **Floating control** (`0 16px 40px rgba(0,0,0,.45)`): menus y dialogos.
- **Interactive lift** (`0 20px 48px rgba(0,0,0,.35)`): feedback sutil de elementos accionables.

**The Flat-at-Rest Rule.** El contenido permanece estable; la elevacion aparece como respuesta a una accion o para separar una capa funcional.

## 5. Components

### Buttons

- **Shape:** capsula (`999px`) para acciones primarias y secundarias.
- **Primary:** naranja con texto negro y `12px 18px` de padding.
- **Hover / Focus:** desplazamiento maximo de 1px y foco visible naranja/blanco.
- **Secondary:** grafito con borde de marco y texto claro.

### Chips

- **Style:** fondo oscuro, borde sutil y texto naranja o claro.
- **State:** el estado activo puede usar naranja como relleno; el inactivo no compite.

### Cards / Containers

- **Corner Style:** `16px`.
- **Background:** grafito solido o negro translucido solo cuando exista un video real detras.
- **Shadow Strategy:** plana por defecto.
- **Border:** `1px solid #242424`.
- **Internal Padding:** entre `20px` y `36px` segun jerarquia.

### Inputs / Fields

- **Style:** fondo grafito, borde de marco, radio `10px`.
- **Focus:** borde naranja y anillo visible.
- **Error / Disabled:** texto explicito ademas del color.

### Navigation

Barra oscura y compacta. Estado activo mediante contraste y `aria-current`; menu movil con control de foco, Escape y estado expandido.

### Learning Path

Lista vertical de modulos con numero, estado, duracion y resultado esperado. El progreso es informacion funcional, no una metrica decorativa.

## 6. Do's and Don'ts

### Do:

- **Do** conservar negro, video, naranja y tipografia fuerte como identidad central.
- **Do** usar contenido estructurado para programas, modulos y recursos.
- **Do** mantener contraste AA y foco visible en todos los controles.
- **Do** explicar la aplicacion audiovisual concreta de cada modulo.
- **Do** ofrecer alternativa estatica cuando el movimiento este reducido.

### Don't:

- **Don't** convertir la plataforma en un LMS escolar o universitario generico.
- **Don't** parecer un marketplace masivo de cursos.
- **Don't** usar neon, gradientes morados, robots o ciencia ficcion superficial como codigo visual de IA.
- **Don't** convertir cada contenido en una tarjeta identica.
- **Don't** usar glassmorphism cuando no exista una razon espacial real.
- **Don't** ocultar la narrativa y la presencia humana de AVI detras de un dashboard administrativo.
