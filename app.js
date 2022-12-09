import ParsingClient from "sparql-http-client/ParsingClient.js";
import express from "express";
import expressHandlebars from "express-handlebars";
import fs from "fs"
import $rdf from "rdflib"

const getPropertyDataDbpedia = async (resource, property, languageFilter) => {
    let result = {
        property: property,
        values: []
    }
    let query = ""
    if (languageFilter) {
        query = `SELECT ?object  WHERE { dbr:${resource} ${property} ?object . FILTER (langMatches(lang(?object),"en"))}`
    } else {
        query = `SELECT ?object  WHERE { dbr:${resource} ${property} ?object . }`
    }
    const client = new ParsingClient({
        endpointUrl: 'http://dbpedia.org/sparql',
        headers: {
            "Accept": "application/json",
            "User-Agent": 'Next-Generation-Web-GroupZ/1.0 (scni22yp@student.ju.se) NGW-Project/1.0'}
    })
    const bindings = await client.query.select(query)
    bindings.forEach(row =>
        Object.entries(row).forEach(([_, value]) => {
            result.values.push(value.value)
        })
    )
    return result
}

const getPropertyDataWikidata = async (person_name, property) => {
    let result = {
        property: property,
        values: []
    }
    const query = `SELECT ?object  WHERE { wd:${person_name} wdt:${property} ?object . }`
    const client = new ParsingClient({
        endpointUrl: 'https://query.wikidata.org/sparql',
        headers: {
            "Accept": "application/json",
            "User-Agent": 'Next-Generation-Web-GroupZ/1.0 (scni22yp@student.ju.se) NGW-Project/1.0'
        }
    })
    const bindings = await client.query.select(query)
    bindings.forEach(row =>
        Object.entries(row).forEach(([_, value]) => {
            result.values.push(value.value)
        })
    )
    return result
}

const turtleString = fs.readFileSync('experts.ttl').toString()

const store = $rdf.graph()

$rdf.parse(
    turtleString,
    store,
    "http://example.org/",
    "text/turtle"
)

const stringQueryCategory = `
	SELECT
		?id
		?name
	WHERE {
		?category a <http://example.org/category> .
		?category <http://example.org/id> ?id .
		?category <http://example.org/name> ?name .
	}
`
const stringQueryExperts = `
	SELECT
		?id
		?name
	WHERE {
		?expert a <http://example.org/expert> .
		?expert <http://example.org/id> ?id .
		?expert <http://example.org/name> ?name .
	}
`

const stringQueryPersons = `
	SELECT
		?dbrID
		?wdID
		?categoryID
		?categoryName
		?expertID
		?expertName
	WHERE {
		?person a <http://example.org/person> .
		?person <http://example.org/dbrID> ?dbrID .
		?person <http://example.org/wdID> ?wdID .
		?person <http://example.org/category> ?category .
		?category <http://example.org/id> ?categoryID .
		?category <http://example.org/name> ?categoryName .
		?person <http://example.org/expert> ?expert .
		?expert <http://example.org/id> ?expertID .
		?expert <http://example.org/name> ?expertName .
	}
`

const queryCategory = $rdf.SPARQLToQuery(stringQueryCategory, false, store)
const queryExperts = $rdf.SPARQLToQuery(stringQueryExperts, false, store)
const queryPersons = $rdf.SPARQLToQuery(stringQueryPersons, false, store)

// To see what we get back as result:
// console.log(store.querySync(query))

const categories = store.querySync(queryCategory).map(
    categoryResult => {
        return {
            id: categoryResult['?id'].value,
            name: categoryResult['?name'].value,
        }
    }
)

const experts = store.querySync(queryExperts).map(
    expertResult => {
        return {
            id: expertResult['?id'].value,
            name: expertResult['?name'].value,
        }
    }
)

let persons = []

const app = express()

app.engine('hbs', expressHandlebars.engine({
    defaultLayout: "main.hbs"
}))

app.get("/layout.css", function(request, response) {
    response.sendFile("layout.css", {root: "."})
})

app.get("/", async (request, response) => {

    const model = {
        categories: categories,
        experts: experts,
        persons: persons,
        activePersons: [],
        json: function(obj) {
            return JSON.stringify(obj);
        }
    }

    response.render("start.hbs", model)
})

app.listen(8080, async () => {
    const queryPersons = $rdf.SPARQLToQuery(stringQueryPersons, false, store)
    persons = []
    let result = store.querySync(queryPersons)
    for (let person of result) {
        const name = (await getPropertyDataDbpedia(person['?dbrID'].value, "dbp:name", true)).values[0]
        const description = (await getPropertyDataDbpedia(person['?dbrID'].value, "dbo:abstract", true)).values[0]
        const imgSrc = (await getPropertyDataDbpedia(person['?dbrID'].value, "dbo:thumbnail", false)).values[0]
        console.log(imgSrc)
        persons.push({
            dbrID: person['?dbrID'].value,
            wdID: person['?wdID'].value,
            imgSrc: imgSrc,
            name: name,
            description: description,
            categoryID: person['?categoryID'].value,
            categoryName: person['?categoryName'].value,
            expertID: person['?expertID'].value,
            expertName: person['?expertName'].value
        })
    }
})