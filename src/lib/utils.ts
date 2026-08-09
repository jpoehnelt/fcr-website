import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn-svelte class combinator: clsx conditions + Tailwind conflict merge. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/*
 * Prop-type helpers the shadcn-svelte registry components import from
 * `$lib/utils.js`. Copied from the shadcn-svelte scaffold verbatim.
 */
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
  ref?: U | null;
};

export type WithoutChildren<T> = T extends { children?: unknown }
  ? Omit<T, "children">
  : T;

export type WithoutChild<T> = T extends { child?: unknown }
  ? Omit<T, "child">
  : T;

export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
