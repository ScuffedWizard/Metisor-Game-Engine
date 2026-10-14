export async function onRequestPost(context) {
  const { request, env } = context;
  const userAgent = request.headers.get("User-Agent") || "";

  // 1. Define allowed AI crawlers/agents
  const allowedBots = [
    "GPTBot",
    "OAI-SearchBot",
    "ClaudeBot",
    "PerplexityBot",
    "Google-Extended"
  ];

  const isAllowedBot = allowedBots.some(bot => 
    userAgent.toLowerCase().includes(bot.toLowerCase())
  );

  // 2. Bypass Turnstile for AI crawlers
  if (isAllowedBot) {
    return new Response(JSON.stringify({
      message: "Hello AI Agent, access granted.",
      status: "success"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 3. For regular human users, verify the Turnstile token
  try {
    const body = await request.formData();
    const token = body.get("cf-turnstile-response");
    const ip = request.headers.get("CF-Connecting-IP");

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing Turnstile token." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    let formData = new FormData();
    formData.append('secret', env.TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    formData.append('remoteip', ip);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      body: formData,
      method: 'POST',
    });

    const outcome = await result.json();

    if (!outcome.success) {
      return new Response(JSON.stringify({ error: "Turnstile verification failed." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Success: Human verified
    return new Response(JSON.stringify({ message: "Verification successful!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid request structure." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}
