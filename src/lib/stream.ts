import "server-only";
import type { Citation } from "../db/schema";
import { answerQuestionStream } from "./deepseek";

// Wire protocol: a first line of JSON metadata ({ citations }), then the answer
// text streamed as it's generated. `onDone` receives the full text to persist.
function respond(
  citations: Citation[],
  produce: (push: (delta: string) => void) => Promise<string>,
  onDone: (full: string) => Promise<void>
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(JSON.stringify({ citations }) + "\n"));
      let full = "";
      try {
        full = await produce((delta) => {
          controller.enqueue(encoder.encode(delta));
        });
      } catch (err) {
        const msg = "\n\n(The answer was cut off — please try again.)";
        full += msg;
        controller.enqueue(encoder.encode(msg));
        console.error("answer stream error", err);
      }
      controller.close();
      try {
        await onDone(full);
      } catch (e) {
        console.error("answer persist error", e);
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Stream an LLM answer over the given context.
export function streamingAnswer(
  question: string,
  context: string,
  citations: Citation[],
  onDone: (full: string) => Promise<void>
): Response {
  return respond(
    citations,
    async (push) => {
      let full = "";
      for await (const delta of answerQuestionStream(question, context)) {
        full += delta;
        push(delta);
      }
      return full;
    },
    onDone
  );
}

// Stream a fixed message (e.g. "not transcribed yet") in the same protocol.
export function streamText(
  text: string,
  citations: Citation[],
  onDone: (full: string) => Promise<void>
): Response {
  return respond(
    citations,
    async (push) => {
      push(text);
      return text;
    },
    onDone
  );
}
