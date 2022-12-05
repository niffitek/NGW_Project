const express = require('express')
const expressHandlebars = require('express-handlebars')

const fs = require('fs')
const $rdf = require('rdflib')

const turtleString = fs.readFileSync('experts.ttl').toString()

const store = $rdf.graph()

$rdf.parse(
    turtleString,
    store,
    "http://example.org/",
    "text/turtle"
)

const stringQuery = `
	SELECT
		?id
		?name
	WHERE {
		?category a <http://example.org/category> .
		?category <http://example.org/id> ?id .
		?category <http://example.org/name> ?name .
	}
`

const query = $rdf.SPARQLToQuery(stringQuery, false, store)

// To see what we get back as result:
// console.log(store.querySync(query))

const categories = store.querySync(query).map(
    categoryResult => {
        return {
            id: categoryResult['?id'].value,
            name: categoryResult['?name'].value,
        }
    }
)

console.log(categories)

const app = express()

app.engine('hbs', expressHandlebars.engine({
    defaultLayout: "main.hbs"
}))

app.get("/layout.css", function(request, response) {
    response.sendFile("layout.css", {root: "."})
})

app.get("/", function (request, response){

    const model = {
        categories: categories
    }

    response.render("start.hbs", model)
})

app.listen(8080)