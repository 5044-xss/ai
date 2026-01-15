// components/chat-message.tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Message } from '@/types/globals'


interface ExtendedMessage extends Message {
  extraContent?: React.ReactNode;
}

export function ChatMessage({ role, content, extraContent }: ExtendedMessage) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 my-4",
        role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {/* AI 头像（左侧） */}
      {role === "assistant" && (
        <Avatar className="h-8 w-8">
          {/* <AvatarImage src="/ai-avatar.png" alt="AI" /> */}
          <AvatarFallback>🤖</AvatarFallback>
        </Avatar>
      )}

      {/* 消息气泡 */}
      <div
        className={cn(
          "rounded-lg px-4 py-2 max-w-[80%] whitespace-pre-wrap break-words",
          role === "user"
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-muted-foreground rounded-bl-md"
        )}
      >
        {content}
        {extraContent && <div className="mt-2">{extraContent}</div>}
      </div>

      {/* 用户头像（右侧） */}
      {role === "user" && (
        <Avatar className="h-8 w-8">
          {/* <AvatarImage src="/user-avatar.png" alt="User" /> */}
          <AvatarFallback>👤</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}