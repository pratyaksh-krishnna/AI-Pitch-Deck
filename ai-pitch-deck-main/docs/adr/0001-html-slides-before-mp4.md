# Slides are live HTML compositions; MP4 is a later export

Each Slide is a HyperFrames-style HTML composition played live in the deck viewer, not a rendered MP4, even though HyperFrames is built for video. A deck is primarily clicked through, and live HTML keeps the build → score → revise loop fast and free of server-side Chrome/FFmpeg rendering. MP4 Export will render the same compositions on demand once a Deck is complete, so the core pipeline does not change when it is added.
