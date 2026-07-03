"use client";

import { createContext, useContext } from "react";

// Shared audio state for a note view. seekTo() scrubs the single <audio>
// element and broadcasts a focus signal the transcript scrolls to — this is
// what makes every note traceable to the moment it was said.

export type FocusSignal = { ms: number; token: number };

export type NoteAudioValue = {
  seekTo: (ms: number, play?: boolean) => void;
  currentMs: number;
  durationMs: number;
  playing: boolean;
  toggle: () => void;
  focus: FocusSignal | null;
};

export const NoteAudioContext = createContext<NoteAudioValue | null>(null);

export function useNoteAudio() {
  const ctx = useContext(NoteAudioContext);
  if (!ctx) throw new Error("useNoteAudio must be used within NoteWorkspace");
  return ctx;
}
