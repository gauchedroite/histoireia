// Role for a chat message
export type Role = "system" | "user" | "assistant" | "tool";

// The classic message type OpenAI expects
export interface ChatMessage {
  role: Role;
  content: string | null;
  name?: string; // For "tool" role (optional)
  tool_call_id?: string; // For tool result mapping
  tool_calls?: ToolFunctionCall[]; // Assistant includes this for function_call
  // You can add additional OpenAI properties if needed.
}

// Partial OpenAI tool call function format
export interface ToolFunctionCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // Arguments as JSON stringified
  };
}

// Tool execution result for reply
export interface ToolResponseMessage {
  role: "tool";
  content: string;
  tool_call_id: string;
}



export type LLMConfig = {
    id: string;
    provider: string; // e.g. 'openai'
    model: string; // e.g. 'gpt-4o'
    hasTools: boolean
};

export type GameMetadata = {
    llmid: string;
};
