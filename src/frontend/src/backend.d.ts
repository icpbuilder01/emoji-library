import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Emoji {
    name: string;
    emoji: string;
    category: string;
}
export interface backendInterface {
    getCategories(): Promise<Array<string>>;
    getEmojisByCategory(category: string): Promise<Array<Emoji>>;
    searchEmojis(queryText: string): Promise<Array<Emoji>>;
}
