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
const big = face("ada@example.com", { size: 240, background: "#f4f1ea" });
```

Faces come in muted colored inks with occasional colored caps, headphones and blush.
Pass `color: false` (or a fixed `ink`) for classic black.

### Moods

The same seed keeps its identity — head, hair, nose — but you can change its mood:

![one face, seven moods](moods.png)

```js
face(user.id, { mood: "grumpy" });   // build failing
face(user.id, { mood: "happy" });    // build green again
```

`mood: "auto" | "happy" | "sad" | "grumpy" | "sleepy" | "surprised" | "wink" | "calm"` —
`auto` (default) picks a resting expression from the seed. Avatars that react to
state: CI status, error pages, empty inboxes, loading screens.

Drop it anywhere SVG goes:

```js
el.innerHTML = face(user.id);
// or as an <img>:
img.src = "data:image/svg+xml;utf8," + encodeURIComponent(face(user.id));
```

## Alive

`face()` gives you a static SVG. `<mug-shot>` gives you a character:

```html
<script type="module">import "mugshot-avatars/element"</script>

<mug-shot seed="ada@example.com" size="160"></mug-shot>
```

It blinks. Its pupils follow your cursor. When the user focuses an input, it
watches them type. Leave it alone for 30s and it falls asleep (`idle` attribute,
ms, `0` to disable). And it reacts:

```js
document.querySelector("mug-shot").react("grumpy");   // build failed
document.querySelector("mug-shot").react("happy");    // build green
```

Attributes: `seed`, `mood`, `size`, `color`, `ink`, `idle`. All reactive.

## Why

Identicons are ugly. Faces are not. Every seed gets a face with its own head shape,
hair (solid, hatched, curls, spikes, bald...), eyes, nose, brows, glasses, mustache —
drawn with a wobbly ink line so it reads as doodled, not generated.

## API

`face(seed: string, options?)` → SVG string

| option | default | |
|---|---|---|
| `size` | `120` | width/height in px |
| `mood` | `"auto"` | expression override, identity unchanged |
| `color` | `true` | muted color palette; `false` = black ink |
| `ink` | — | force one stroke color (implies `color: false`) |
| `background` | `"transparent"` | any CSS color |

Determinism note: a given seed is stable within a major version. Grammar improvements
that change faces only ship as majors.

## Demo

```
npm run build && npx serve .
```
then open http://localhost:3000/demo.html — type your name, click the grid to reroll.
(A plain file:// open won't work; browsers block module imports from disk.)

MIT
