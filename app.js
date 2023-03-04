require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const https = require("https");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
	secret: process.env.SECRET,
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// mongoose.connect("mongodb://127.0.0.1/userDB", {useNewUrlParser: true});

const uri = process.env.MONGODB_URI;

mongoose.connect(uri);

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    category: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

var query = "top";
var currentUser = "Hello";

app.get("/", function(req, res){
    res.render("home"); 
});

app.get("/login", function(req, res){
    res.render("login"); 
});

app.get("/register", function(req, res){
    res.render("register"); 
});

app.get("/preferences", function(req, res){
    
    res.set(
        'Cache-Control', 
        'no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0'
    );
    if (req.isAuthenticated()) {

        res.render("preferences");        
    } else {
        res.redirect("/login");
    }  
});

app.get("/logout", function(req,res){
    req.logout((err)=>{
        if(err){
            console.log(err);
        }else{
            res.redirect("/");
        }
    });
});

app.get("/feed", function(req,res) {
    res.set(
        'Cache-Control', 
        'no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0'
    );
    if (req.isAuthenticated()) {

        const apiKey = process.env.API_KEY;
        var url ="https://newsdata.io/api/1/news?apikey=" + apiKey + "&country=us&language=en&category=" + query;

    https.get(url, function(response){
        const chunks = []
        response.on('data', function (chunk) {
            chunks.push(chunk);
        });

        response.on('end', function () {
            const data = Buffer.concat(chunks);
            const got = JSON.parse(data);  
            var newsResults = got.results;

            res.render("feed", {newsArticles: newsResults}); 
        });
    });
  
    } else {
        res.redirect("/login");
    }
});

app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            currentUser = req.body.username;
            passport.authenticate("local")(req, res, function(){
                res.redirect("/feed");	
            });
        }
    });
});

app.post("/login", function(req, res) {
    passport.authenticate("local")(req, res, function(){

        const user = new User({
		    username: req.body.username,
		    password: req.body.password
	    });

	    req.login(user, function(err){
		    if (err) {
			    console.log(err);
		    } else {
                currentUser = req.body.username;
				res.redirect("/feed");	
		    }
	    });
    });
});

app.post("/preferences", function(req, res){
    query = req.body.category.toString();

    User.findOneAndUpdate({username: currentUser}, {category: query}, function (err, docs) {
        if (err){
            console.log(err);
        }
        else {
            res.redirect("/feed");
        }
    });
});

let port = process.env.PORT;

if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
    console.log("Server has started successfully.");
});