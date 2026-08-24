export type Mood = "auto" | "happy" | "sad" | "grumpy" | "sleepy" | "surprised" | "wink" | "calm";
export interface FaceOptions {
    size?: number;
    background?: string;
    ink?: string;
    color?: boolean;
    mood?: Mood;
    paper?: string;
    style?: "auto" | "fem" | "masc";
    bust?: boolean;
    backdrop?: boolean;
}
type Pt = [number, number];
/** Deterministic per-seed random stream, for building on top of mugshot. */
export declare function seededRng(seed: string, tag?: string): () => number;
export interface FaceParts {
    svg: string;
    ink: string;
    accent: string;
    style: "fem" | "masc";
    eyes: {
        left: Pt;
        right: Pt;
        r: number;
        leftOpen: boolean;
        rightOpen: boolean;
    };
}
export declare function face(seed: string, options?: FaceOptions): string;
export declare function faceParts(seed: string, options?: FaceOptions): FaceParts;
/**
 * Browser-only: render a face straight to a PNG data URL (e.g. 512px for a
 * GitHub profile picture). Portrait defaults: bust + backdrop + paper.
 */
export declare function facePng(seed: string, options?: FaceOptions): Promise<string>;
export {};
