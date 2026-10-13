import type { DetailedHTMLProps, HTMLAttributes } from "react";

/** JSX typing for the <hyperframes-player> custom element (registered by @hyperframes/player). */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "hyperframes-player": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        "sandbox-origin"?: "opaque";
        srcdoc?: string;
        "range-start"?: string;
        autoplay?: boolean;
      };
    }
  }
}
