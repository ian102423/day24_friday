const express = require("express");
const mustacheExpress = require("mustache-express");
const expressValidator = require("express-validator");
const bodyParser = require("body-parser");
const session = require("express-session");
const sessionConfig = require("./sessionConfig");
const fs = require("file-system");
const app = express();
const port = process.env.port || 8080;
const words = fs
  .readFileSync("/usr/share/dict/words", "utf-8")
  .toLowerCase()
  .split("\n");

// SET VIEW ENGINE
app.engine("mustache", mustacheExpress());
app.set("views", "./public");
app.set("view engine", "mustache");

// MIDDLEWARE
app.use("/", express.static("./public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session(sessionConfig));
app.use(expressValidator());

app.use(function(req, res, next) {
  var game = req.session.game;
  if (!game) {
    game = req.session.game = {};
    game.mode = "";
    game.guessesLeft = 8;
    game.lettersGuessed = [];
    game.btnText = "Play game";
    game.status = "";
    game.lose = false;
    game.playing = false;
    game.message = "";
    game.display = "";
  }
  next();
});

// ROUTES
app.get("/", function(req, res) {
  if (req.session.game.playing || req.session.game.btnText != "Play game") {
    req.session.game.display = buildDisplay(req.session.game);
  }
  res.render("index", { game: req.session.game });
});

app.post("/", function(req, res) {
  var game = req.session.game;
  if (game.playing) {
    req.checkBody("guessLetter", "Put your geuss").notEmpty().isAlpha();
    var errors = req.validationErrors();
    console.log("errors: ", errors);
    if (errors) {
      game.message = errors[0].msg;
    } else {
      console.log("lettersGuessed: ", game.lettersGuessed);

      if (
        game.lettersGuessed.indexOf(req.body.guessLetter.toUpperCase()) > -1
      ) {
        game.message =
          "Are you kidding... " + req.body.guessLetter.toUpperCase();
      } else {
        var n = game.word.indexOf(req.body.guessLetter.toUpperCase());
        if (n == -1) {
          game.message = "You just lost a one chance";
          game.guessesLeft -= 1;
          game.lettersGuessed.push(req.body.guessLetter.toUpperCase());
          if (game.guessesLeft == 0) {
            game.message = "";
            game.btnText = "Try again?";
            game.status = "You are DONE";
            game.playing = false;
            game.lose = true;
          }
        } else {
          game.lettersGuessed.push(req.body.guessLetter.toUpperCase());
          game.message = "";
          req.session.game.display = buildDisplay(req.session.game);
          if (game.display.indexOf(" ") == -1) {
            game.message = "";
            game.btnText = "Try again...?";
            game.status = "You win...";
            game.playing = false;
            game.lose = false;
          }
        }
      }
    }
  } else {
    game.playing = true;
    game.btnText = "Any guess?";
    game.mode = req.body.mode;
    game.word = searchRandomWord(game.mode);
    game.lose = false;
    game.guessesLeft = 8;
    game.lettersGuessed = [];
  }

  console.log("session", req.session);

  res.redirect("/");
});

function buildDisplay(game) {
  var showText = [];
  for (let i = 0; i < game.word.length; i++) {
    if (game.lettersGuessed.indexOf(game.word[i]) > -1) {
      showText.push(game.word[i].toUpperCase());
    } else {
      if (game.lose == true) {
        showText.push(game.word[i].toUpperCase());
      } else {
        showText.push(" ");
      }
    }
  }
  return showText;
}

function searchRandomWord(mode) {
  var randomWord;
  var wordLength = 0;
  var wordFound = false;

  while (!wordFound) {
    var randomNumber = Math.floor(Math.random() * words.length - 1 + 1);
    randomWord = words[randomNumber];
    wordLength = randomWord.length;
    switch (mode) {
      case "easy":
        if (wordLength >= 4 && 6 >= wordLength) {
          wordFound = true;
        }
        break;
      case "normal":
        if (wordLength >= 6 && 8 >= wordLength) {
          wordFound = true;
        }
        break;
      case "hard":
        if (wordLength >= 8) {
          wordFound = true;
        }
        break;
      default:
        wordFound = true;
        break;
    }
  }
  return randomWord.toUpperCase();
}

// LISTEN
app.listen(port, function() {
  console.log("You are on the PORT: ", port);
});
