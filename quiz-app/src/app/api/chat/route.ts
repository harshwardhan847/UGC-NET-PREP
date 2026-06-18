import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize Gemini client (will draw key from local env)
const apiKey = process.env.GEMINI_API_KEY || ""
const genAI = new GoogleGenerativeAI(apiKey)

export async function POST(req: NextRequest) {
  try {
    const { messages, questionContext } = await req.json()

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Please set GEMINI_API_KEY in your environment." },
        { status: 500 }
      )
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // Build system instructions with the question context
    const isGeneralPaper = questionContext?.unit === 11 || questionContext?.unit_name === "General Paper 1"
    const tutorRole = isGeneralPaper ? "General Paper 1 professor" : "Computer Science professor"
    const examName = isGeneralPaper ? "General Paper 1" : "Computer Science"
    const subjectTerm = isGeneralPaper ? "General Paper 1 syllabus" : "computer science"

    let systemInstruction = `You are an expert ${tutorRole} tutoring a student preparing for the UGC NET ${examName} exam.
Your responses should be encouraging, clear, and focused on helping the student understand the concepts.

`

    if (questionContext) {
      systemInstruction += `The student is currently looking at this question:
Question:
${questionContext.question}

Options:
(A) ${questionContext.options.A}
(B) ${questionContext.options.B}
(C) ${questionContext.options.C}
(D) ${questionContext.options.D}

Correct Answer Key: ${questionContext.answer}

Official Explanation:
${questionContext.solution}

GUIDELINES:
1. Use the context of the active question to guide your explanations.
2. If the student asks about this question, explain why option ${questionContext.answer} is correct and why other choices are incorrect.
3. If they ask a general question about the ${subjectTerm}, explain it conceptually.
4. Do not give the direct answer immediately if they ask a question that requires them to solve it; guide them step-by-step instead.
5. Use clean formatting and render math formulas clearly using standard text/markdown notation.
`
    }

    // Format chat history for Gemini API
    // Gemini expects parts list: [{ text: "..." }] and role: "user" | "model"
    const contents = []

    // Add system instruction as the very first content prompt or system instruction parameter
    // With generative AI SDK, we can pass systemInstruction directly in configuration
    const chatModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemInstruction
    })

    // Map conversation history
    // Filter/alternate history: Gemini requires history to start with "user" and alternate.
    const history: { role: string; parts: { text: string }[] }[] = []
    for (const msg of messages.slice(0, -1)) {
      const role = msg.role === "user" ? "user" : "model"

      if (history.length === 0) {
        // Skip leading model/assistant messages so history starts with a user message
        if (role === "user") {
          history.push({
            role,
            parts: [{ text: msg.content }]
          })
        }
      } else {
        const lastMsg = history[history.length - 1]
        if (lastMsg.role === role) {
          // Merge consecutive messages of the same role to maintain strict alternation
          lastMsg.parts[0].text += "\n" + msg.content
        } else {
          history.push({
            role,
            parts: [{ text: msg.content }]
          })
        }
      }
    }

    // Start a chat session
    const chat = chatModel.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      }
    })

    const latestMessage = messages[messages.length - 1].content
    const result = await chat.sendMessage(latestMessage)
    const responseText = result.response.text()

    return NextResponse.json({ reply: responseText })
  } catch (error: any) {
    console.error("Gemini API Error in chat:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process chat response from Gemini." },
      { status: 500 }
    )
  }
}
