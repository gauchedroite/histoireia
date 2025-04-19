import type { Request, Response } from "express";
import fs from "fs-extra";
import path from "path";
import { rollPbta, resolvePbta } from "./server_tools";
import { assetsPath, lookupPath, toolsPath } from "./path-names";
import type { 
  ChatMessage, 
  ToolFunctionCall, 
  ToolResponseMessage 
} from "./chat-interfaces";

type LLMConfig = {
  id: string;
  value1: string; // e.g., provider: 'openai'
  value2: string; // e.g., model: 'gpt-3.5-turbo'
};

type GameMetadata = {
  llmid: string;
  // ...others if relevant
};

interface Man {
    endpoint: string
    api_key: string | null
    model: string
    gameid: string
    tools: object[]
    res: Response
}


export const chat03 = async (req: Request, res: Response) => {
  const gameid = req.params.gameid as string;
  try {
    const messages = req.body as ChatMessage[];
  
    const gameMetaPath = path.join(assetsPath, gameid, "metadata.json");
    const metaContent = await fs.readFile(gameMetaPath, "utf8");
    const gameMeta = JSON.parse(metaContent) as GameMetadata;

    const llmid = gameMeta.llmid
    const llmConfigPath = path.join(lookupPath, "llm.json");
    const llmContent = await fs.readFile(llmConfigPath, "utf8");
    const llmList = JSON.parse(llmContent) as LLMConfig[];
    const llm = llmList.find(one => one.id === llmid);
    if (!llm) {
      res.status(500).json({ error: "LLM not found" });
      return;
    }
    const api = llm.value1
    const model = llm.value2

    // Tools
    const toolPath = path.join(toolsPath, "roll_pbta.json");
    const toolContent = await fs.readFile(toolPath, "utf8");
    const tools = [];
    tools.push(JSON.parse(toolContent))
  
    // 2. Model config to switch between ollama and openai
    let endpoint = "http://localhost:11434/v1/chat/completions";
    let apiKey: string | undefined;
    //
    if (api === "openai") {
      endpoint = "https://api.openai.com/v1/chat/completions";
      apiKey = process.env.OPENAI_API_KEY;
    }
  
    // 3. Streaming headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
  
    // 4. Loop: LLM + Tools
    while (true) {
      // (a) Send to LLM
      const fetchBody = {
        model,
        messages,
        stream: true,
        tools
      };
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  
      const aiResp = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(fetchBody),
      });
  
      if (!aiResp.body) throw new Error("No stream body from LLM");
  
      // (b) Parse stream, relay text, collect tool calls
      const toolCalls = await parseStreamAndCollectToolCalls(aiResp, res);
  
      // (c) If none, finish
      if (toolCalls.length === 0) break;
  
      // (d) Execute tool calls and append results
      console.log(toolCalls)
      const toolResults = await Promise.all(toolCalls.map(executeToolCall));
  
      messages.push({
        role: "assistant",
        content: null,
        tool_calls: toolCalls,
      } as ChatMessage);
      toolResults.forEach(tr => messages.push(tr));
    }
  
    res.end();
  } catch (err: any) {
    console.error(`POST /chat/${gameid}`, err);
    // Do not crash the stream mid-flight
    if (!res.headersSent) {
      res.status(500).json({ error: "Unhandled internal error" });
    } else {
      res.write(`\n[ERROR]: ${err.message || "Unexpected error"}\n`);
      res.end();
    }
  }
};

//--- 3. Streaming parser ---//
async function parseStreamAndCollectToolCalls(
  aiStream: globalThis.Response, // fetch Response
  res: Response // Express Response
): Promise<ToolFunctionCall[]> {
  const reader = aiStream.body!.getReader();
  let partial = "";
  const toolCalls: Record<string, ToolFunctionCall> = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    partial += new TextDecoder().decode(value);

    const lines = partial.split("\n");
    partial = lines.pop() ?? "";

    for (let line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.replace("data:", "").trim();

      if (payload === "[DONE]") {
        res.write("\n");
        continue;
      }

      try {
        const data = JSON.parse(payload);
        for (const choice of data.choices ?? []) {
          const delta = choice.delta;

          if (delta?.content) {
            res.write(delta.content);
          }
          if (delta?.tool_calls) {
            for (const t of delta.tool_calls) {
              const id = t.id ?? t.index?.toString();
              if (!id) continue;
              if (!toolCalls[id]) {
                toolCalls[id] = { id: t.id ?? "", type: "function", function: { name: "", arguments: "" } };
              }
              if (t.function?.name) toolCalls[id].function.name = t.function.name;
              if (t.function?.arguments) toolCalls[id].function.arguments += t.function.arguments;
            }
          }
        }
      } catch (err) {
        // Ignore and continue
      }
    }
  }
  return Object.values(toolCalls);
}

//--- 4. Tool executor ---//
async function executeToolCall(tc: ToolFunctionCall): Promise<ToolResponseMessage> {
  if (tc.function.name === "roll_pbta") {
    const parsed = JSON.parse(tc.function.arguments);
    const res = rollPbta(parsed);
    return { role: "tool", content: JSON.stringify(res), tool_call_id: tc.id };
  }
  else if (tc.function.name === "resolve_pbta") {
    const parsed = JSON.parse(tc.function.arguments);
    const res = resolvePbta(parsed);
    return { role: "tool", content: JSON.stringify(res), tool_call_id: tc.id };
  }
  return { role: "tool", content: "Unknown tool", tool_call_id: tc.id };
}