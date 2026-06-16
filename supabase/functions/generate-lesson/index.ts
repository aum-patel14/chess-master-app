import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { course_id, topic, level, category } = await req.json();

    if (!course_id || !topic) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: course_id, topic" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY secret is not set in Supabase" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase Client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const systemPrompt = `You are an expert chess grandmaster and coach. Generate a structured chess lesson about the topic "${topic}" for a ${level} level player (category: ${category}).

Your output must be a valid JSON object matching this schema:
{
  "title": "A short, engaging lesson title",
  "summary": "A 1-2 sentence summary of what this lesson covers",
  "steps": [
    // Array of steps. You must provide between 3 to 5 steps.
    // Each step can be of type "theory", "challenge", or "quiz".
    {
      "type": "theory",
      "title": "Title of the theory slide",
      "content": "Descriptive instructional text in Markdown. Explain the concept clearly, citing piece coordination, pawn structure, or tactical patterns. Keep it clean and readable.",
      "fen": "A valid FEN string highlighting the key position. Ensure it's legal and correct.",
      "arrows": [
        // Optional. Visual overlay arrows. Maximum 3.
        { "from": "e2", "to": "e4", "color": "green" } // colors can be "green", "red", "blue", "yellow"
      ],
      "highlights": [
        // Optional. Highlighted squares. Maximum 4.
        { "square": "e4", "color": "yellow" } // colors can be "green", "red", "blue", "yellow"
      ]
    },
    {
      "type": "challenge",
      "title": "Title of the interactive challenge",
      "content": "Instructions for the challenge in Markdown. Example: 'Find the winning tactical move for White.' or 'Deliver checkmate in 2.' Make sure to specify whose turn it is.",
      "fen": "A valid starting FEN string. The side to move in the FEN MUST match the solver's side.",
      "solution_moves": [
        // Sequential moves in UCI format (e.g. 'e2e4') to solve the challenge.
        // It must have at least 1 move. It can support replies:
        // Move 0: Player's move, Move 1: Opponent's automatic reply, Move 2: Player's next move...
        // Ensure all moves are legal and match the FEN and turns.
        "d1h5", "g7g6", "h5c5"
      ],
      "hint": "A helpful hint if they get stuck.",
      "explanation": "Markdown text explaining why this solution is correct and the tactical/strategic reason behind it."
    },
    {
      "type": "quiz",
      "title": "Title of the quiz question",
      "content": "The multiple-choice quiz question with exactly 4 options. Use the format:\n\n[Question text here]\n\nA) [Option A]\nB) [Option B]\nC) [Option C]\nD) [Option D]\n\n[CORRECT: C]",
      "explanation": "Markdown text explaining why the correct option is right and others are wrong."
    }
  ]
}

Make sure to include a mix of steps (at least one theory, one challenge, and one quiz). All moves in solution_moves must be legal and strictly follow chess rules. FENs must be legal chess positions.
Output only the JSON. Do not include any pre-text or post-text. You must complete the JSON object.`;

    const requestBody = {
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate the lesson JSON for topic: "${topic}" in course ID: ${course_id}`
        },
        {
          role: "assistant",
          content: "{"
        }
      ]
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `Claude API request failed: ${errText}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const responseData = await response.json();
    let textContent = responseData.content[0].text;
    
    // Add the pre-filled bracket back
    if (!textContent.startsWith("{")) {
      textContent = "{" + textContent;
    }

    // Parse JSON
    let parsedLesson;
    try {
      parsedLesson = JSON.parse(textContent);
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: "Failed to parse JSON response from Claude",
          raw: textContent,
          parseError: e.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Fetch the next position index for the course
    const { data: positionData, error: positionError } = await supabase
      .from("lessons")
      .select("position")
      .eq("course_id", course_id)
      .order("position", { ascending: false })
      .limit(1);

    if (positionError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch lesson position list", details: positionError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const nextPosition = positionData && positionData.length > 0 ? positionData[0].position + 1 : 1;

    // 3. Insert the Lesson
    const { data: lessonData, error: lessonError } = await supabase
      .from("lessons")
      .insert({
        course_id,
        position: nextPosition,
        title: parsedLesson.title,
        summary: parsedLesson.summary,
        xp_reward: 20,
      })
      .select("id")
      .single();

    if (lessonError) {
      return new Response(
        JSON.stringify({ error: "Failed to insert lesson", details: lessonError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const lessonId = lessonData.id;

    // 4. Insert Lesson Steps
    const stepsToInsert = parsedLesson.steps.map((step: any, index: number) => ({
      lesson_id: lessonId,
      position: index + 1,
      type: step.type,
      title: step.title,
      content: step.content,
      fen: step.fen || null,
      solution_moves: step.solution_moves || null,
      hint: step.hint || null,
      explanation: step.explanation || null,
      arrows: step.arrows || null,
      highlights: step.highlights || null,
    }));

    const { error: stepsError } = await supabase
      .from("lesson_steps")
      .insert(stepsToInsert);

    if (stepsError) {
      // Clean up the created lesson if steps fail to insert
      await supabase.from("lessons").delete().eq("id", lessonId);
      
      return new Response(
        JSON.stringify({ error: "Failed to insert lesson steps", details: stepsError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        lesson_id: lessonId,
        title: parsedLesson.title,
        summary: parsedLesson.summary,
        stepCount: parsedLesson.steps.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
