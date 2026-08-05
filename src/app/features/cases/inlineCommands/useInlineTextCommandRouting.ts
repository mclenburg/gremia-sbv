import type { TextCommandToken } from "@services/textCommandPolicy";
import type { TextCommandTextareaChange } from "../../../shared/textCommands/TextCommandTextarea";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";
import type { ProtocolTextTarget } from "./inlineCommandTypes";

export function useInlineTextCommandRouting(runtime: InlineCommandRuntime, openCommand: (target: ProtocolTextTarget, token: TextCommandToken, markerIndex: number, commandValue?: string) => void, hasOpenOverlay: () => boolean) {
  const { setContent, setNextSteps, setNoteInfo } = runtime;
  function handleProtocolTextChange(target: ProtocolTextTarget, value: string) {
    setNoteInfo("");
    if (target === "content") setContent(value);
    else setNextSteps(value);
  }

  function handleProtocolTextCommand(
    target: ProtocolTextTarget,
    command: TextCommandTextareaChange,
  ) {
    setNoteInfo("");
    if (hasOpenOverlay()) return;
    openCommand(target, command.token, command.index, command.value);
  }


  return { handleProtocolTextChange, handleProtocolTextCommand };
}
