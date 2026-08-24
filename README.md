# mugshot

Deterministic hand-drawn doodle face avatars. Hash any string into a charming ink-sketched face.

![48 mugshot faces](grid.png)

Zero dependencies. Pure SVG. Same string, same face, forever.

## Use

```
npm install mugshot-avatars
```

```js
import { face } from "mugshot-avatars";

const svg = face("ada@example.com");          // -> "<svg ...>...</svg>"
const big = face("ada@example.com", { size: 240, ink: "#222", background: "#f4f1ea" });
```

Drop it anywhere SVG goes:

```js
el.innerHTML = face(user.id);
// or as an <img>:
img.src = "data:image/svg+xml;utf8," + encodeURIComponent(face(user.id));
```

## Why

Identicons are ugly. Faces are not. Every seed gets a face with its own head shape,
hair (solid, hatched, curls, spikes, bald...), eyes, nose, brows, glasses, mustache —
drawn with a wobbly ink line so it reads as doodled, not generated.

## API

`face(seed: string, options?)` → SVG string

| option | default | |
|---|---|---|
| `size` | `120` | width/height in px |
| `ink` | `"#1c1b1a"` | stroke color |
| `background` | `"transparent"` | any CSS color |

Determinism note: a given seed is stable within a major version. Grammar improvements
that change faces only ship as majors.

## Demo

Open `demo.html` after `npm run build` — type your name, click the grid to reroll.

MIT
