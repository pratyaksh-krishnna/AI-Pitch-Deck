# The Orchestrator is a fixed workflow, not an LLM agent

The Orchestrator is a deterministic background workflow that runs the Slide Builder, Image Agent and Feedback Agent in a fixed order and decides Revision Rounds from Slide Scores. An LLM orchestrator calling the other agents as tools was considered and rejected: the sequence never varies between Decks, so model-driven routing would add cost and nondeterminism and make failures harder to retry and inspect, without adding flexibility we need.
