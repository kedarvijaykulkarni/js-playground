# LinkedIn Bot with Ollama
Examples created with Ollama LLM API for the integration with LinkedIn platforms.
## Prerequisites

You will need the following things properly installed on your computer.

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/)


## Running / Development

### update the environment variable file using ManitumAI credentials

Please rename the **sample.env** with **.env**, and update the secrets and required values.
- You will need the ManitumAI credentials.
- Save secrets/variable in .env (environment variable).

to obtain MantiumAI key register yourself with  MantiumAI refer [Quick Integration](https://developer.mantiumai.com/docs/quick-integration)

### Run the server

- `npm start` or `node server.js`
if you added the **PORT** in the **.env** then please use that port in the following URL

- Visit your app at [http://localhost:8000](http://localhost:8000).

## Further Reading / Useful Links

- https://mantiumai.com/
- https://developer.mantiumai.com/docs/quick-integration
- https://developer.mantiumai.com/docs/getting-started

## Git Repository for MantiumAI library
- https://github.com/mantiumai/mantiumclient-js

## NPM Package for MantiumAI library
- https://www.npmjs.com/package/@mantium/mantiumapi

## Good to know
https://www.linkedin.com/pulse/linkedin-bots-spam-algorithms-tyler-robertson/

https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/getting-started?tabs=http

https://attacomsian.com/blog/node-http-post-request

https://docs.microsoft.com/en-us/linkedin/shared/api-guide/concepts/error-handling

https://gabrieleromanato.name/nodejs-how-to-publish-a-post-on-linkedin-via-api-with-expressjs

## to save the code
https://github.com/bnoguchi/everyauth
https://codeburst.io/how-i-nailed-a-job-with-this-nodejs-linkedin-bot-6fcada2afbe1


## blog prompt design
https://github.com/skolo-online/ai-blog-writer-openai/blob/main/blog.py
https://www.youtube.com/watch?v=jZW4W02iRBA

Generate Blog Sections

Challenges facing new startup


in window run addtional command + Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy RemoteSigned
```

```shell
playwright install
```


create virtual environment
```shell
python -m venv venv
```

activate
```shell
venv\Scripts\activate
```

install requirement
```shell
pip install -r requirements.txt
```

need to run following command
```shell
playwright install
```

```shell
$env:LINKEDIN_EMAIL="your_email@example.com"
$env:LINKEDIN_PASSWORD="your_password_here"
```

To Run
```shell
python linkedin_birthday_bot.py
```


check schedule posts: https://www.linkedin.com/feed/?shareActive=true&view=management


You're welcome 😊

You are an expert content researcher who comes up with great content ideas about Al topics. I want you to do an extensive research finding out all the Linkedin post about Al tools that are going viralel want the new Al tools that are going viral on Twitter so that I can learn about them. Can you please read hundreds of Linkedin post out there? See which Linkedin post have gone viral, which are about Al tools or new products that have launched, and give me the list of tools from the last seven days that I can learn about.


You are an expert content researcher who comes up with great content ideas about Al topics. I want you to do an extensive research finding out all the Linkedin post about Al tools that are going viralel and related to my profile so that I can learn about them. Can you please read hundreds of Linkedin post out there? See which LinkedIn post have gone viral, which are about Al tools or new products that have launched, and give me the list of topics that most discussed or have comments in the LinkedIn community from the last seven days that I can learn about.




------------


Act as a Senior Port Engineer and Technical Thought Leader. Your goal is to write a high-impact LinkedIn post based on the provided topic that bridges the gap between high-level AI trends and practical, "on-the-ground" operational reality.

The Content Strategy:

The Hook: Start with a "contrarian" or "hard truth" opening within the first 140 characters to stop the scroll.

The "So What?": Explain why this matters for operations, not just as a tech demo.

The Framework: Provide one actionable mental model or "checklist" (e.g., The 3-Step Agent Framework).

The Value: Ensure a mid-career professional learns something they can mention in a meeting tomorrow.

Structural Constraints:

Format: Plain text only. No markdown, no bolding, no bullet symbols (use simple dashes "-" if needed), no emojis.

Flow: Use frequent line breaks. Max 2 sentences per paragraph.

Tone: Authoritative yet conversational. Think "briefing a Board of Directors," not "writing a blog."

Length: Strictly under 2,600 characters.

Hard Rules:

No "AI clichés" (e.g., "In today's fast-paced world," "Unleash the power," "Game changer").

Focus on "Operations" over "Innovation"—talk about governance, risk, and repeatable workflows.

End with a clinical, thought-provoking question that invites expert-level comments.

Include 3-5 relevant hashtags at the very end.

Topic and Data to Process: