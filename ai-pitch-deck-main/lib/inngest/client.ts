import { Inngest } from "inngest";

export type InngestEvents = {
  "deck/generate": {
    data: {
      deckId: string;
    };
  };
  "slide/generate": {
    data: {
      slideId: string;
    };
  };
};

export const inngest = new Inngest({
  id: "ai-pitch-deck",
});
