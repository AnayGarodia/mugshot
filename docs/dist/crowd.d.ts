import { type FaceOptions } from "./index.js";
export interface CrowdOptions extends Pick<FaceOptions, "color" | "background"> {
    paper?: string;
    width?: number;
}
export declare function crowd(seeds: string[], options?: CrowdOptions): string;
