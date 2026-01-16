import { useCallback, useRef, useState } from "react";
import type { Message, MessageType } from "../components/ui/MessagePopup";

const AUTO_DISMISS_MS = 15_000;

export type AddMessageFuncType = (message: string, type: MessageType) => string;

export function useToast() {
  const [messages, setMessages] = useState<Message[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((t) => t.id !== id));

    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const addMessage = useCallback(
    (message: string, type: MessageType) => {
      const id = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        { id, message, type },
      ]);

      const timer = window.setTimeout(() => {
        removeMessage(id);
      }, AUTO_DISMISS_MS);

      timers.current.set(id, timer);

      return id;
    },
    [removeMessage]
  );

  const clearAll = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    setMessages([]);
  }, []);

  return {
    messages,
    addMessage,
    removeMessage,
    clearAll,
  };
}
