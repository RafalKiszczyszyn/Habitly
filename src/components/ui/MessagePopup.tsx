import { useState } from "react";

export type MessageType = 'error' | 'warning' | 'success';

const icons = {
  error: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

const colors = {
  error: 'text-red-500',
  warning: 'text-amber-500',
  success: 'text-green-500',
};

interface MessagePopupProps {
  message: Message
  onClose: () => void;
}

function MessagePopup({ message, onClose }: MessagePopupProps) {
  const [expanded, setExpanded] = useState(false);

  const hasDetails = message.details.length > 0;

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-5 h-5 ${colors[message.type]}`}>
          {icons[message.type]}
        </div>

        <p className="flex-1 text-sm text-[var(--color-text)]">
          {message.message}
        </p>

        {hasDetails && (
          <button
              onClick={() => setExpanded((prev) => !prev)}
              className="flex-shrink-0 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors rounded-lg hover:bg-[var(--color-border)]"
            >
            <svg
              className={`w-5 h-5 transform transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors rounded-lg hover:bg-[var(--color-border)]"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
      {expanded && message.details.map((section) => (
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">
                {section.sectionName}
              </p>

              <pre className="bg-[var(--color-border)] rounded-lg p-3 text-xs overflow-x-auto">
                <code>
                  {section.sectionLines.join('\n')}
                </code>
              </pre>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export type MessageDetails = { sectionName: string; sectionLines: string[] }[]

export type Message = {
  id: string;
  message: string;
  details: MessageDetails;
  type: MessageType;
};

export function MessageContainer({
  messages,
  onClose,
}: {
  messages: Message[];
  onClose: (id: string) => void;
}) {
  return (
    <div className="fixed top-16 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col-reverse gap-2 px-4 pointer-events-none">
      {messages.map((msg) => (
        <div key={msg.id} className="pointer-events-auto">
          <MessagePopup
            message={msg}
            onClose={() => onClose(msg.id)}
          />
        </div>
      ))}
    </div>
  );
}
