const express = require('express')
const expressHandlebars = require('express-handlebars')

const app = express()

app.engine('hbs', expressHandlebars.engine({
    defaultLayout: "main.hbs"
}))

app.get("/layout.css", function(request, response) {
    response.sendFile("layout.css", {root: "."})
})

app.get("/", function (request, response){
    response.render("start.hbs")
})

app.listen(8080)