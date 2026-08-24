import { type Mood } from "./index.js";
export declare class MugShotElement extends HTMLElement {
    #private;
    static observedAttributes: string[];
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string): void;
    /** Temporary expression, then back to normal. */
    react(mood: Mood, ms?: number): void;
    /** Speech bubble in the same ink, with mouth flapping while it types. */
    say(text: string, opts?: {
        hold?: number;
    }): void;
    /** Turn the eyes toward a point (client coords) for a moment. */
    lookAt(target: [number, number], ms?: number): void;
}
