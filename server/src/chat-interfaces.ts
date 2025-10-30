// Role for a chat message
export type Role = "system" | "user" | "assistant" | "tool";

// The classic message type OpenAI expects
export interface ChatMessage {
  role: Role;
  content: string | null;
  name?: string; // For "tool" role (optional)
  tool_call_id?: string; // For tool result mapping
  tool_calls?: ToolFunctionCall[]; // Assistant includes this for function_call
}

// Partial OpenAI tool call function format
export interface ToolFunctionCall {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string // json
  };
}

// Tool execution result for reply
export interface ToolResponseMessage {
  role: "tool"
  content: string
  tool_call_id: string
}



export type LLMConfig = {
    id: number
    provider: string // e.g. 'openai'
    model: string // e.g. 'gpt-4o'
    hasTools: boolean
    hasJsonSchema: boolean
};

export interface GameDefinition {
    code: string
    title: string
    bg_url: string
    bg_image: string | null
    prompt: string
    llmid: number
    extra?: string | null
    author: string
    justme: boolean
    hasJsonSchema: boolean
}
