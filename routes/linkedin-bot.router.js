import {
  auth,
  editPage,
  linkedin,
  postMessage,
  publishPost,
} from "./../controller/linkedin.js";

export default function linkedinBotRoutes(app) {
  app.get("/auth", (req, res) => auth(req, res));

  app.get("/linkedin", (req, res) => linkedin(req, res));

  app.post("/ollama", (req, res) => postMessage(req, res));

  app.get("/edit", (req, res) => editPage(req, res));
  app.post("/publish", (req, res) => publishPost(req, res));
}
