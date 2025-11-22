import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, currentResume } = await req.json();

  // Using the verified stable model ID: gemini-2.5-flash-lite
  const model = google('gemini-2.5-flash-lite');

  const result = streamText({
    model,
    messages,
    system: `You are an expert resume builder AI assistant. Your goal is to help the user create a perfect resume.

    You have access to the user's current resume data. You can answer questions about it, suggest improvements, and modify it directly using the 'updateResume' tool.

    The current resume data is:
    ${JSON.stringify(currentResume, null, 2)}

    When the user asks to change something, ALWAYS use the 'updateResume' tool to apply the changes.
    If the user asks for suggestions, provide them in text, and then offer to apply them.

    Be concise, professional, and encouraging.`,
    tools: {
      updateResume: tool({
        description: 'Update the resume data. You can update any field in the resume.',
        parameters: z.object({
          personalInfo: z.object({
            name: z.string().optional(),
            title: z.string().optional(),
            phone: z.string().optional(),
            email: z.string().optional(),
            linkedin: z.string().optional(),
            location: z.string().optional(),
          }).optional(),
          summary: z.string().optional(),
          experience: z.array(z.object({
            title: z.string(),
            company: z.string(),
            location: z.string(),
            startDate: z.string(),
            endDate: z.string(),
            description: z.string(),
            responsibilities: z.array(z.string()),
          })).optional(),
          education: z.array(z.object({
            degree: z.string(),
            institution: z.string(),
            location: z.string(),
            startDate: z.string(),
            endDate: z.string(),
          })).optional(),
          skills: z.array(z.string()).optional(),
          certifications: z.array(z.object({
            title: z.string(),
            issuer: z.string(),
            date: z.string(),
            link: z.string().optional(),
            skills: z.string().optional(),
          })).optional(),
          projects: z.array(z.object({
            title: z.string(),
            description: z.string(),
            technologies: z.string(),
          })).optional(),
          languages: z.array(z.object({
            name: z.string(),
            level: z.string(),
          })).optional(),
        }),
        execute: async (newData) => {
             // Return data for client-side application
             return newData;
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
