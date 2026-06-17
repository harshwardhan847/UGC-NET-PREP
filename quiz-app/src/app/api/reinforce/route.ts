import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const apiKey = process.env.GEMINI_API_KEY || ""
const genAI = new GoogleGenerativeAI(apiKey)

export async function POST(req: NextRequest) {
  try {
    const { questionContext, userChoice } = await req.json()

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Please set GEMINI_API_KEY in your environment." },
        { status: 500 }
      )
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    const prompt = `You are a supportive AI computer science tutor. A student has answered a UGC NET exam question incorrectly.
Your goal is to guide them through the specific concept they got wrong by explaining it simply and asking them a simpler follow-up question.

INCORRECT QUESTION CONTEXT:
Question:
${questionContext.question}

Options:
(A) ${questionContext.options.A}
(B) ${questionContext.options.B}
(C) ${questionContext.options.C}
(D) ${questionContext.options.D}

Correct Answer: ${questionContext.answer}
User's Selected Answer: ${userChoice}

Official Explanation:
${questionContext.solution}

Syllabus Area: ${questionContext.unit_name}

YOUR TASK:
1. Analyze where the student went wrong based on their selected answer (${userChoice}) versus the correct answer (${questionContext.answer}).
2. Provide a 2-3 sentence concept breakdown explaining the core logic (e.g. key formula, process step, or rule) in a very easy-to-understand way.
3. Generate a new, simpler multiple-choice question (with options A, B, C, D) testing this core concept.
   - The question must be a multiple-choice question.
   - The question should be direct and test the prerequisite understanding.
   - Specify which option (A, B, C, or D) is the correct answer to the new question.

You must return your response as a JSON object matching this schema:
{
  "gapAnalysis": "A brief sentence identifying why the user's choice was incorrect.",
  "explanation": "A simple 2-3 sentence explanation of the correct concept.",
  "reinforcementQuestion": {
    "question": "The new simpler question text.",
    "options": {
      "A": "Option A text",
      "B": "Option B text",
      "C": "Option C text",
      "D": "Option D text"
    },
    "answer": "A" or "B" or "C" or "D",
    "explanation": "Explanation for why this new question's answer is correct."
  }
}
`

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      }
    })

    const responseText = result.response.text()
    const parsedData = JSON.parse(responseText)

    return NextResponse.json(parsedData)
  } catch (error: any) {
    console.error("Gemini API Error in reinforcement:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate reinforcement content from Gemini." },
      { status: 500 }
    )
  }
}
