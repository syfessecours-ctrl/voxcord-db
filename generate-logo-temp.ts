import { GoogleGenAI } from "@google/genai";

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: 'A minimalist, modern, circular logo icon of a woman with short black hair and bangs, inspired by Amélie Poulain. The logo should be clean, vector style, flat design, using a vibrant red and deep black color palette. Focus on the iconic hairstyle and a subtle, mysterious smile. Professional logo design, white background, high contrast.',
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      console.log("LOGO_BASE64_START");
      console.log(part.inlineData.data);
      console.log("LOGO_BASE64_END");
    }
  }
}

main();
