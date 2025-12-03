import { GoogleGenAI, Type } from "@google/genai";
import { Project, ProjectCritique, LearningPath } from '../types';

let aiClient: GoogleGenAI | null = null;

export const initializeGemini = () => {
  if (process.env.API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
};

export const checkApiKey = (): boolean => {
  return !!process.env.API_KEY;
};

// 1. Analyze Project Metadata
export const analyzeProjectFile = async (fileName: string, fileSize: number): Promise<Partial<Project>> => {
  if (!aiClient) throw new Error("AI not initialized");
  
  const prompt = `
    Analyze a hypothetical code project file with name "${fileName}" and size ${fileSize} bytes.
    Infer a professional Title, a short Description (max 2 sentences), a Complexity Score (0-100), and 3-5 technical Tags.
    Return JSON.
  `;

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            complexity: { type: Type.INTEGER },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "description", "complexity", "tags"]
        }
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("AI Analysis Failed", e);
    // Fallback if AI fails or no key
    return {
      title: fileName,
      description: "Analysis failed. Please check API Key.",
      complexity: 10,
      tags: ["Unknown"]
    };
  }
};

// 2. Generate Curriculum
export const generateCurriculum = async (goal: string): Promise<LearningPath['steps']> => {
  if (!aiClient) throw new Error("AI not initialized");

  const prompt = `Create a 4-step learning curriculum for a student wanting to: "${goal}". Return JSON.`;

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              estimatedHours: { type: Type.INTEGER }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [{ title: "Error", description: "Could not generate path.", estimatedHours: 0 }];
  }
};

// 3. Project Critique (Deep Analysis)
export const critiqueProject = async (project: Project): Promise<ProjectCritique> => {
  if (!aiClient) throw new Error("AI not initialized");

  const prompt = `
    Perform a deep code review of this project: 
    Title: ${project.title}
    Description: ${project.description}
    Tags: ${project.tags.join(', ')}

    1. Provide a Summary.
    2. List 3 key Weaknesses.
    3. Suggest a clear Next Step.
    4. Provide 2 specific "Refactoring Suggestions" including hypothetical code snippets (based on the project tags) that would fix the weaknesses.
    5. Estimate a "Revised Complexity" score if these changes were made (0-100).
    
    Return JSON.
  `;

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            nextSteps: { type: Type.STRING },
            refactoringSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  file: { type: Type.STRING, description: "Filename like App.tsx" },
                  issue: { type: Type.STRING },
                  suggestedCode: { type: Type.STRING }
                }
              }
            },
            revisedComplexity: { type: Type.INTEGER }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    throw e;
  }
};

// 4. Generate Bio
export const generateCandidateBio = async (name: string, skills: string[]): Promise<string> => {
  if (!aiClient) throw new Error("AI not initialized");
  
  const response = await aiClient.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Write a short, professional single-paragraph recruiter bio for ${name} who is skilled in ${skills.join(', ')}.`,
  });
  return response.text || "Bio generation failed.";
};

// 5. Ideation Analysis
export const analyzeIdeaSkills = async (ideaDescription: string): Promise<{skills: string[], roles: string[]}> => {
  if (!aiClient) throw new Error("AI not initialized");

  const prompt = `
    Analyze this project idea: "${ideaDescription}". 
    1. List 4 required technical skills.
    2. List 3 specific Team Roles needed (e.g., "Frontend Engineer", "Data Scientist").
    Return JSON.
  `;

  const response = await aiClient.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                roles: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        }
    }
  });
  return JSON.parse(response.text || "{ \"skills\": [], \"roles\": [] }");
};

// 6. Chat Assistant
export const chatWithAssistant = async (message: string, history: {role: string, parts: string}[]): Promise<string> => {
  if (!aiClient) return "I need an API Key to think.";

  const chat = aiClient.chats.create({
      model: 'gemini-2.5-flash',
      config: {
          systemInstruction: "You are EduChanakya, a helpful AI assistant for a Virtual College platform. When asked for learning resources, ALWAYS recommend specific, high-quality external resources (Coursera, edX, YouTube channels like FreeCodeCamp, official documentation) from around the world. Do not limit your answers to internal data. Be concise and encouraging."
      }
  });

  const result = await chat.sendMessage({ message });
  return result.text || "";
};