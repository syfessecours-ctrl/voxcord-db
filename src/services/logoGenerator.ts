import { GoogleGenAI } from "@google/genai";

async function generateLogo(imageBuffer: Buffer) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: 'image/jpeg',
          },
        },
        {
          text: 'Create a minimalist, modern, circular logo icon based on this character. The logo should be clean, using a limited color palette (maybe red and black like her outfit), suitable for a fitness/communication app called FitCord. Focus on her iconic hairstyle and mysterious smile. Vector style, flat design, no text.',
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      }
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }
  return null;
}
