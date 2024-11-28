import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Server-side environment variable
});

export async function POST(req) {
  try {
    const { base64Image } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract the company name, invoice number, and invoice date from this image. Respond ONLY with valid JSON, without extra formatting. Use this format:
              {
                "companyName": "string",
                "invoiceNumber": "string",
                "invoiceDate": "string"
              }`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    });

    const result = response.choices[0]?.message?.content;

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Error in OpenAI API call:", error);
    return NextResponse.json(
      { error: "Failed to process the request" },
      { status: 500 }
    );
  }
}
