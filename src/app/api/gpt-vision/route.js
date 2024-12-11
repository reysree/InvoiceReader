import { NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "@/app/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getInvoiceDetails } from "@/lib/firebase-processing";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Server-side environment variable
});

const firstPrompt = `From the image extract only the company name and return it as a String`;

export async function POST(req) {
  try {
    const { base64Image, invoiceDetails } = await req.json();
    let keys = ["companyName", "invoiceNumber", "invoiceDate"];

    const first_response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: firstPrompt,
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

    const rawCompanyName = first_response.choices[0]?.message?.content;
    const companyName = rawCompanyName.replace(/^"|"$/g, "");

    if (companyName) {
      try {
        //console.log("The company Name is : ", companyName);
        const data = await getInvoiceDetails(companyName); // Fetch the data
        if (data && data.keys) {
          keys = data.keys; // Update keys with those from Firestore if available
        }
        //console.log("Retrieved Data:", data);
      } catch (error) {
        console.error("Error fetching invoice details:", error);
      }
    }

    const secondPrompt = `Extract the following fields from this image: ${keys.join(
      ", "
    )}. Respond ONLY with valid JSON, without extra formatting. Use this format:
    {
      ${keys.map((key) => `"${key}": "string"`).join(",\n    ")}
    }`;

    const second_response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: secondPrompt,
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

    const result = second_response.choices[0]?.message?.content;
    console.log("The final result format is : ", result);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Error in OpenAI API call:", error);
    return NextResponse.json(
      { error: "Failed to process the request" },
      { status: 500 }
    );
  }
}
