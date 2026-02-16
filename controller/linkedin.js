import {} from "dotenv/config";

import fs from "fs";

// import mantiumAi from '@mantium/mantiumapi';

// const prompt_id = process.env.MANTIUM_LINKEDIN_PROMPT_ID;
const client_id = process.env.LINKEDIN_CLIENTID;
const client_secret = process.env.LINKEDIN_CLIENT_SECRET;
const client_ollam_model = process.env.OLLAMA_MODEL || "deepseek-r1:14b";
// const credentials = {
//   username: process.env.MANTIUM_USER_NAME,
//   password: process.env.MANTIUM_PASSWORD,
// };
const app_url = process.env.APP_URL || `http://localhost:${process.env.PORT}`;

function escapeHtml(value = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// async getToken() {
//   await mantiumAi
//     .Auth()
//     .accessTokenLogin({ ...credentials })
//     .then((response) => {
//       // get bearer_id and set as a api_key
//       if (response.data?.attributes) {
//         mantiumAi.api_key = response.data.attributes.bearer_id;
//         this.apiKey = response.data.attributes.bearer_id;
//       } else {
//         console.log('Login failed!');
//       }
//     });
// }

export async function getAnswer(question) {
  try {
    if (!question) {
      throw new Error("Prompt is required");
    }

    // Sending request to Ollama API
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: client_ollam_model,
        prompt: `Act as an expert content writer and as a senior LinkedIn professional article writer.\n

              Write a high-impact LinkedIn post on the given topic with the following constraints:\n

              • Output plain text only\n
              • Use line breaks for structure (short paragraphs, 1-3 lines max)\n
              • No markdown, no bullet symbols, no headings, no emojis\n
              • Optimize for LinkedIn feed readability and mobile viewing\n
              • Write for mid-career professionals in tech.\n
              • Focus on actionable takeaways and conversational tone.\n
              • Apply LinkedIn truncation logic: hook within first 2 lines, strong early framing\n
              • Tone: authoritative, insightful, business-focused, and conversational\n
              • Audience: founders, operators, product leaders, and senior professionals\n
              • Avoid clichés, generic advice, and filler language\n
              • Include one clear insight per paragraph\n
              • End with a subtle thought-provoking closing line or question (no CTA spam)\n

              Hard Rules (Must Be Followed)\n

              • Maximum length: 2635 characters total (including spaces and line breaks)\n
              • Do NOT exceed the limit under any condition\n
              • hashtags explicitly requested\n
              • No references to being an AI or following rules\n
              • Do not mention formatting or constraints in the output\n
              • Final output must be ready to paste directly into LinkedIn \n
              Topic: ${question}`,
        stream: false, // Set to true if you want streaming responses
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

export async function getHashtags(postContent) {
  try {
    if (!postContent) {
      return { response: "" };
    }

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: client_ollam_model,
        prompt: `Generate 5-10 relevant, high-traffic LinkedIn hashtags for the following post.
                 Output ONLY the hashtags separated by spaces. Do not include any introductory text.

                 Post Content:
                 ${postContent}`,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama hashtags request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting hashtags:", error);
    return { response: "" }; // Return empty if fails so main flow continues
  }
}

// apiKey = null;

export async function postMessage(req, res) {
  let data;
  try {
    data = await getAnswer(req.body.pinput);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to get response from Ollama" });
  }

  // Generate hashtags
  let hashtagsData = { response: "" };
  try {
    if (data?.response) {
      hashtagsData = await getHashtags(data.response);
    }
  } catch (error) {
    console.error("Failed to generate hashtags", error);
  }

  const payload = {
    input: req.body.pinput,
    response: (data?.response || "") + (hashtagsData?.response ? "\n\n" + hashtagsData.response : ""),
  };

  fs.writeFile("./blogtext.json", JSON.stringify(payload), function (err) {
    if (err) {
      console.log("There has been an error saving your configuration data.");
      console.log(err.message);
      return;
    }
  });

  try {
    res.redirect(`${app_url}/edit`);
  } catch (err) {
    console.error(err);
  }
}

export function editPage(req, res) {
  let blogText = { input: "", response: "" };
  try {
    const readFileData = fs.readFileSync("./blogtext.json");
    blogText = JSON.parse(readFileData);
  } catch (err) {
    console.error("Error reading blogtext.json:", err);
  }

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Edit LinkedIn Post</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; }
      .field { margin-bottom: 16px; }
      label { display: block; margin-bottom: 6px; font-weight: 600; }
      input, textarea { width: 100%; padding: 8px; font-size: 14px; }
      textarea { min-height: 220px; }
      button { padding: 10px 16px; font-size: 14px; cursor: pointer; }
    </style>
  </head>
  <body>
    <h1>Edit LinkedIn Post</h1>
    <form action="/publish" method="post">
      <div class="field">
        <label for="input">Title / Topic</label>
        <input id="input" name="input" value="${escapeHtml(
          blogText.input || "",
        )}" />
      </div>
      <div class="field">
        <label for="response">Post Text</label>
        <textarea id="response" name="response">${escapeHtml(
          blogText.response || "",
        )}</textarea>
      </div>

      <button type="submit">Post to LinkedIn</button>
    </form>
  </body>
</html>`;

  res.status(200).send(html);
}

export function publishPost(req, res) {
  const payload = {
    input: req.body.input || "",
    response: req.body.response || "",
  };

  fs.writeFile("./blogtext.json", JSON.stringify(payload), function (err) {
    if (err) {
      console.log("There has been an error saving your configuration data.");
      console.log(err.message);
      return res.status(500).send("Failed to save post content.");
    }
    res.redirect(`${app_url}/linkedin`);
  });
}

export async function auth(req, res) {
  const redirectUri = `${app_url}/auth`;
  const data = {
    grant_type: "authorization_code",
    code: req.query.code,
    client_id,
    client_secret,
    redirect_uri: redirectUri,
  };

  const config = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  let response = "";

  try {
    const tokenResponse = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: config.headers,
        body: new URLSearchParams(data).toString(),
      },
    );
    if (!tokenResponse.ok) {
      throw new Error(`LinkedIn token request failed: ${tokenResponse.status}`);
    }
    response = await tokenResponse.json();
  } catch (err) {
    console.error(err);
  }

  // Retrieving Member ID via LinkedIn profile endpoint
  let meRes = "";
  if (response) {
    try {
      const meResponse = await fetch(
        "https://api.linkedin.com/v2/me?projection=(id)",
        {
          headers: {
            Authorization: `Bearer ${response.access_token}`,
          },
        },
      );
      if (!meResponse.ok) {
        throw new Error(
          `LinkedIn profile request failed: ${meResponse.status}`,
        );
      }
      meRes = await meResponse.json();
    } catch (err) {
      console.error(err);
    }
  }

  // Fallback to OpenID userinfo if /v2/me is unavailable
  if (!meRes?.id && response) {
    try {
      const meResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${response.access_token}`,
        },
      });
      if (!meResponse.ok) {
        throw new Error(
          `LinkedIn profile request failed: ${meResponse.status}`,
        );
      }
      meRes = await meResponse.json();
    } catch (err) {
      console.error(err);
    }
  }

  // post on linkedin
  if (response && meRes) {
    var readFileData = fs.readFileSync("./blogtext.json"),
      blogText;

    try {
      blogText = JSON.parse(readFileData);
      console.dir(blogText);
    } catch (err) {
      console.log("There has been an error parsing your JSON.");
      console.log(err);
    }

    const shareText = blogText.response;
    // (blogText.input ? blogText.input + "\n" : "") +
    // blogText.response +
    // "\n\nContent generated by (non-human) AI language model.\n";
    const maxShareLength = 3000;
    const safeShareText =
      shareText.length > maxShareLength
        ? shareText.slice(0, maxShareLength)
        : shareText;

    let body = {
      author: "urn:li:person:" + (meRes.id || meRes.sub),
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: safeShareText,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    let headers = {
      "Content-Type": "application/json",
      "cache-control": "no-cache",
      "X-Restli-Protocol-Version": "2.0.0",
      "x-li-format": "json",
      Authorization: `Bearer ${response.access_token}`,
    };

    const url = "https://api.linkedin.com/v2/ugcPosts";

    try {
      const postResponse = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!postResponse.ok) {
        const errorText = await postResponse.text();
        console.error("LinkedIn share error response:", errorText);
        throw new Error(
          `LinkedIn share failed: ${postResponse.status} ${errorText}`
        );
      }
      console.log("Posted successfully to LinkedIn!");
    } catch (err) {
      console.error("err ::", err);
    }

    res.status(200).send(blogText);
  }
}

export function accessToken(req, res) {
  res.status(200).send("done");
}

export function linkedin(req, res) {
  const scope =
    "r_verify openid profile email r_profile_basicinfo w_member_social";
  const url = "https://www.linkedin.com/oauth/v2/authorization";
  const redirectURL = `${app_url}/auth`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id,
    redirect_uri: redirectURL,
    state: "2022",
    scope,
  });
  res.redirect(`${url}/?${params.toString()}`);
}
