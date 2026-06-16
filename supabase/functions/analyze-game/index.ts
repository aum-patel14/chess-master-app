import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { history, accuracies, counts } = await req.json();

    if (!history) {
      return new Response(
        JSON.stringify({ error: "Missing required history field" }),
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

    // Compile moves summary
    const gameSummary = history.map((m: any, idx: number) => {
      const turn = Math.floor(idx / 2) + 1;
      const color = m.color === 'w' ? 'White' : 'Black';
      return `Turn ${turn} - ${color} played ${m.san} (Stockfish: ${m.classification || 'Neutral'}, score: ${m.score})`;
    }).join("\n");

    const systemPrompt = `You are an expert chess grandmaster and friendly coach. Analyze the completed chess game provided and write a short, highly engaging, and helpful commentary (max 3-4 sentences) summarizing the critical turning points. Help the player understand where they went wrong or what they did right.

Keep your commentary encouraging and educational. Use Markdown formatting.`;

    const requestBody = {
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 400,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Please analyze this game:\n\nWhite accuracy: ${accuracies.w}%\nBlack accuracy: ${accuracies.b}%\nWhite stats: ${JSON.stringify(counts.w)}\nBlack stats: ${JSON.stringify(counts.b)}\n\nMoves Log:\n${gameSummary}`
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
    const commentary = responseData.content[0].text;

    return new Response(
      JSON.stringify({ commentary }),
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
