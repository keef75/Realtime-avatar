import { RealtimeItem, tool } from '@openai/agents/realtime';


import {
  exampleAISolutions,
  exampleBusinessRequirements,
  exampleImplementationPaths,
} from './sampleData';

export const supervisorAgentInstructions = `You are an expert AI consulting supervisor agent, tasked with providing real-time guidance to Mario, an AI solutions advisor that's chatting directly with potential clients. You will be given detailed response instructions, tools, and the full conversation history so far, and you should create a correct next message that Mario can read directly.

# Instructions
- You can provide an answer directly, or call a tool first and then answer the question
- If you need to call a tool, but don't have the right information, you can tell Mario to ask for that information in your message
- Your message will be read verbatim by Mario, so feel free to use it like you would talk directly to the user

==== Domain-Specific Agent Instructions ====
You are a knowledgeable AI solutions consultant working for Cocoa AI, helping potential clients understand how AI can benefit their business while adhering closely to provided guidelines.

# Instructions
- Mario (the junior agent) will handle the initial greeting: "Hi, I'm Mario from Cocoa AI. How can I help you with your AI needs today?"
- Always call a tool before answering factual questions about the company, its AI solutions, services, or implementation strategies. Only use retrieved context and never rely on your own knowledge for any of these questions.
- Focus on understanding the client's business challenges and explaining how AI can provide solutions.
- Maintain a professional, consultative tone that demonstrates expertise in AI and business transformation.
- Escalate to a human AI consultant if the user requests or if the inquiry requires detailed technical scoping.
- Do not discuss prohibited topics (politics, religion, controversial current events, medical, legal, or financial advice, personal conversations, internal company operations, or criticism of any people or company).
- Rely on sample phrases whenever appropriate, but never repeat a sample phrase in the same conversation. Feel free to vary the sample phrases to avoid sounding repetitive and make it more appropriate for the user.
- Always follow the provided output format for new messages, including citations for any factual statements from retrieved documentation.

# Response Instructions
- Maintain a professional and concise tone in all responses.
- Respond appropriately given the above guidelines.
- The message is for a voice conversation, so be very concise, use prose, and never create bulleted lists. Prioritize brevity and clarity over completeness.
    - Even if you have access to more information, only mention a couple of the most important items and summarize the rest at a high level.
- Do not speculate or make assumptions about capabilities or information. If a request cannot be fulfilled with available tools or information, politely refuse and offer to escalate to a human representative.
- If you do not have all required information to call a tool, you MUST ask the user for the missing information in your message. NEVER attempt to call a tool with missing, empty, placeholder, or default values (such as "", "REQUIRED", "null", or similar). Only call a tool when you have all required parameters provided by the user.
- Do not offer or attempt to fulfill requests for capabilities or services not explicitly supported by your tools or provided information.
- Only offer to provide more information if you know there is more information available to provide, based on the tools and context you have.
- When possible, please provide specific numbers or dollar amounts to substantiate your answer.

# Sample Phrases
## Deflecting a Prohibited Topic
- "I'm sorry, but I'm unable to discuss that topic. Is there something else I can help you with regarding your AI needs?"
- "That's not something I'm able to provide information on, but I'm happy to help with any questions about AI solutions for your business."

## If you do not have a tool or information to fulfill a request
- "That's a great question, but I'd like to connect you with one of our senior AI consultants who can provide more detailed guidance. Would that work for you?"
- "I'm not able to provide specific details on that, but I can arrange for a consultation with our technical team. Would you be interested?"

## Before calling a tool
- "Let me pull up some information about that for you."
- "Great question—let me look into our AI solutions for that use case."
- "I'll get the details on that for you right away."

## If required information is missing for a tool call
- "To give you the most relevant information, could you tell me more about your [required info, e.g., industry, current challenges]?"
- "I'll need to understand your [required info] to provide the best recommendations. Could you share that with me?"

# User Message Format
- Always include your final response to the user.
- When providing factual information from retrieved context, always include citations immediately after the relevant statement(s). Use the following citation format:
    - For a single source: [NAME](ID)
    - For multiple sources: [NAME](ID), [NAME](ID)
- Only provide information about this company, its policies, its products, or the customer's account, and only if it is based on information provided in context. Do not answer questions outside this scope.

# Example (tool call)
- User: What AI solutions does Cocoa AI offer for customer service?
- Supervisor Assistant: lookupAISolutions(topic="customer service AI solutions")
- lookupAISolutions(): [
  {
    id: "ID-010",
    name: "Conversational AI Solutions",
    topic: "customer service",
    content:
      "Cocoa AI provides intelligent chatbot and voice assistant solutions that can handle customer inquiries 24/7. Our solutions integrate with existing CRM systems and can reduce response times by 40-60% while improving customer satisfaction by 30%. Typical ROI is achieved within 6-8 months.",
  },
  {
    id: "ID-011",
    name: "AI-Powered Support Automation",
    topic: "customer service automation",
    content:
      "Our AI support automation includes ticket routing, sentiment analysis, and predictive support. The system learns from historical data to proactively identify customer issues before they escalate. Implementation typically takes 8-12 weeks with full integration support.",
  },
];
- Supervisor Assistant:
# Message
Cocoa AI offers comprehensive customer service AI solutions, including 24/7 chatbots and voice assistants that can reduce response times by 40-60% while improving satisfaction by 30% [Conversational AI Solutions](ID-010). We also provide intelligent ticket routing and predictive support that learns from your data [AI-Powered Support Automation](ID-011).

# Example (Refusal for Unsupported Request)
- User: Can you build a custom AI model for me right now?
- Supervisor Assistant:
# Message
That's exactly the type of project we specialize in, but I'd like to connect you with one of our senior AI consultants who can discuss your specific requirements and provide a detailed proposal. Would you like me to arrange a consultation?
`;

export const supervisorAgentTools = [
  {
    type: "function",
    name: "lookupAISolutions",
    description:
      "Tool to look up information about Cocoa AI's solutions, services, and implementation strategies by topic or keyword.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "The AI solution topic, use case, or industry to search for (e.g., 'customer service', 'data analysis', 'process automation').",
        },
      },
      required: ["topic"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "getBusinessRequirements",
    description:
      "Tool to gather and analyze business requirements for AI implementation. This helps understand the client's current state and challenges.",
    parameters: {
      type: "object",
      properties: {
        business_context: {
          type: "string",
          description:
            "Description of the business domain, industry, or specific challenges. MUST be provided by the user.",
        },
      },
      required: ["business_context"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "findImplementationPath",
    description:
      "Tool to determine the recommended implementation approach and timeline for AI solutions based on business needs.",
    parameters: {
      type: "object",
      properties: {
        solution_type: {
          type: "string",
          description: "The type of AI solution needed (e.g., 'conversational AI', 'automation', 'analytics').",
        },
      },
      required: ["solution_type"],
      additionalProperties: false,
    },
  },
];

async function fetchResponsesMessage(body: any) {
  const response = await fetch('/api/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // Preserve the previous behaviour of forcing sequential tool calls.
    body: JSON.stringify({ ...body, parallel_tool_calls: false }),
  });

  if (!response.ok) {
    console.warn('Server returned an error:', response);
    return { error: 'Something went wrong.' };
  }

  const completion = await response.json();
  return completion;
}

function getToolResponse(fName: string, args?: any) {
  switch (fName) {
    case "lookupAISolutions":
      // Filter solutions by topic if provided
      if (args?.topic) {
        const topic = args.topic.toLowerCase();
        const filtered = exampleAISolutions.filter(
          (sol) =>
            sol.topic.toLowerCase().includes(topic) ||
            sol.content.toLowerCase().includes(topic) ||
            sol.name.toLowerCase().includes(topic)
        );
        return filtered.length > 0 ? filtered : exampleAISolutions.slice(0, 2);
      }
      return exampleAISolutions;
    case "getBusinessRequirements":
      return exampleBusinessRequirements;
    case "findImplementationPath":
      // Filter by solution type if provided
      if (args?.solution_type) {
        const solutionType = args.solution_type.toLowerCase();
        const filtered = exampleImplementationPaths.filter(
          (path) => path.solution_type.toLowerCase().includes(solutionType)
        );
        return filtered.length > 0 ? filtered[0] : exampleImplementationPaths[0];
      }
      return exampleImplementationPaths[0];
    default:
      return { result: true };
  }
}

/**
 * Iteratively handles function calls returned by the Responses API until the
 * supervisor produces a final textual answer. Returns that answer as a string.
 */
async function handleToolCalls(
  body: any,
  response: any,
  addBreadcrumb?: (title: string, data?: any) => void,
) {
  let currentResponse = response;

  while (true) {
    if (currentResponse?.error) {
      return { error: 'Something went wrong.' } as any;
    }

    const outputItems: any[] = currentResponse.output ?? [];

    // Gather all function calls in the output.
    const functionCalls = outputItems.filter((item) => item.type === 'function_call');

    if (functionCalls.length === 0) {
      // No more function calls – build and return the assistant's final message.
      const assistantMessages = outputItems.filter((item) => item.type === 'message');

      const finalText = assistantMessages
        .map((msg: any) => {
          const contentArr = msg.content ?? [];
          return contentArr
            .filter((c: any) => c.type === 'output_text')
            .map((c: any) => c.text)
            .join('');
        })
        .join('\n');

      return finalText;
    }

    // For each function call returned by the supervisor model, execute it locally and append its
    // output to the request body as a `function_call_output` item.
    for (const toolCall of functionCalls) {
      const fName = toolCall.name;
      const args = JSON.parse(toolCall.arguments || '{}');
      const toolRes = getToolResponse(fName, args);

      // Since we're using a local function, we don't need to add our own breadcrumbs
      if (addBreadcrumb) {
        addBreadcrumb(`[supervisorAgent] function call: ${fName}`, args);
      }
      if (addBreadcrumb) {
        addBreadcrumb(`[supervisorAgent] function call result: ${fName}`, toolRes);
      }

      // Add function call and result to the request body to send back to realtime
      body.input.push(
        {
          type: 'function_call',
          call_id: toolCall.call_id,
          name: toolCall.name,
          arguments: toolCall.arguments,
        },
        {
          type: 'function_call_output',
          call_id: toolCall.call_id,
          output: JSON.stringify(toolRes),
        },
      );
    }

    // Make the follow-up request including the tool outputs.
    currentResponse = await fetchResponsesMessage(body);
  }
}

export const getNextResponseFromSupervisor = tool({
  name: 'getNextResponseFromSupervisor',
  description:
    'Determines the next response whenever the agent faces a non-trivial decision, produced by a highly intelligent supervisor agent. Returns a message describing what to do next.',
  parameters: {
    type: 'object',
    properties: {
      relevantContextFromLastUserMessage: {
        type: 'string',
        description:
          'Key information from the user described in their most recent message. This is critical to provide as the supervisor agent with full context as the last message might not be available. Okay to omit if the user message didn\'t add any new information.',
      },
    },
    required: ['relevantContextFromLastUserMessage'],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { relevantContextFromLastUserMessage } = input as {
      relevantContextFromLastUserMessage: string;
    };

    const addBreadcrumb = (details?.context as any)?.addTranscriptBreadcrumb as
      | ((title: string, data?: any) => void)
      | undefined;

    const history: RealtimeItem[] = (details?.context as any)?.history ?? [];
    const filteredLogs = history.filter((log) => log.type === 'message');

    const body: any = {
      model: 'gpt-4.1',
      input: [
        {
          type: 'message',
          role: 'system',
          content: supervisorAgentInstructions,
        },
        {
          type: 'message',
          role: 'user',
          content: `==== Conversation History ====
          ${JSON.stringify(filteredLogs, null, 2)}
          
          ==== Relevant Context From Last User Message ===
          ${relevantContextFromLastUserMessage}
          `,
        },
      ],
      tools: supervisorAgentTools,
    };

    const response = await fetchResponsesMessage(body);
    if (response.error) {
      return { error: 'Something went wrong.' };
    }

    const finalText = await handleToolCalls(body, response, addBreadcrumb);
    if ((finalText as any)?.error) {
      return { error: 'Something went wrong.' };
    }

    return { nextResponse: finalText as string };
  },
});
  