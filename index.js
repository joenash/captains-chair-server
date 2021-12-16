require("dotenv").config();
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

const nunjucks = require("nunjucks");
nunjucks.configure("views", {
  autoescape: true,
  express: app,
});

const axios = require("axios");

const tokenGenerator = require("./src/tokenGenerator");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const tqToken = process.env.TQ_TOKEN;
const client = require("twilio")(accountSid, authToken);

app.get("/token/:id?", (req, res) => {
  const id = req.params.id;
  const token = tokenGenerator(id);
  console.log(`Created token for ${token.identity}: ${token.token}`);
  res.send(token);
});

app.get("/team/:guid", async (req, res) => {
  const guid = req.params.guid;
  const path = `https://twilioquest-prod.web.app/quest/api/trusted/users/${guid}`;
  const config = {
    method: "get",
    url: path,
    headers: {
      Authorization: `Bearer ${tqToken}`,
    },
  };

  const response = await axios(config);
  const teams = response.data.data.data.teams;
  console.log(`Teams: ${teams}`);
  const teamsToReturn = [];
  for await (const team of teams) {
    console.log(`For ${team}:`);
    const document = await client.sync
      .services(process.env.TWILIO_SYNC_SERVICE_SID)
      .documents(team)
      .fetch();
    console.log(`Document for team found: ${document.uniqueName}`);
    teamsToReturn.push(document);
  }
  console.log("teams to return:", teamsToReturn);
  res.send(teamsToReturn);
});

app.post("/team", (req, res) => {
  const teamId = req.body.teamid;
  client.sync
    .services(process.env.TWILIO_SYNC_SERVICE_SID)
    .documents.create({ uniqueName: teamId })
    .then((document) => {
      console.log(`Document created: ${document.sid}`);
      document.update({ data: { players: [] } });
    });
  res.sendStatus("200");
});

app.get("/", (req, res) => {
  const token = tokenGenerator(0);
  res.render("index.html", { token });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
