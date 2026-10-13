import { lintHyperframeHtml } from "@hyperframes/lint";

/** Runs the official HyperFrames linter; returns "code: message" strings. */
export async function lintDeckHtml(html: string): Promise<{ errors: string[]; warnings: string[] }> {
  const result = await lintHyperframeHtml(html);
  const format = (f: { code: string; message: string }) => `${f.code}: ${f.message}`;
  return {
    errors: result.findings.filter((f) => f.severity === "error").map(format),
    warnings: result.findings.filter((f) => f.severity === "warning").map(format),
  };
}
