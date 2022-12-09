import ParsingClient from "sparql-http-client/ParsingClient.js";
import express from "express";
import expressHandlebars from "express-handlebars";
import fs from "fs"
import $rdf from "rdflib"

const getPropertyDataDbpedia = async (resource, property, languageFilter) => { //function to do a SPARQL query on DBpedia
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

const getPropertyDataWikidata = async (resource, property, languageFilter) => { //Function to do a SPARQL query on Wikidata
    let result = {
        property: property,
        values: []
    }
    let query = ""
    if (languageFilter)
        query = `SELECT ?object  WHERE { wd:${resource} ${property} ?object . FILTER (langMatches(lang(?object),"en"))}`
    else
        query = `SELECT ?object  WHERE { wd:${resource} ${property} ?object . }`
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

// Query string to .ttl file to get all categories
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
// Query string to .ttl file to get all types of experts
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

// Query string to .ttl file to get all persons (UX Designer)
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

//perform the queries
const queryCategory = $rdf.SPARQLToQuery(stringQueryCategory, false, store)
const queryExperts = $rdf.SPARQLToQuery(stringQueryExperts, false, store)
const queryPersons = $rdf.SPARQLToQuery(stringQueryPersons, false, store)

// save categories with ID and name to a list
const categories = store.querySync(queryCategory).map(
    categoryResult => {
        return {
            id: categoryResult['?id'].value,
            name: categoryResult['?name'].value,
        }
    }
)

// save types of experts with ID and name to a list
const experts = store.querySync(queryExperts).map(
    expertResult => {
        return {
            id: expertResult['?id'].value,
            name: expertResult['?name'].value,
        }
    }
)

//declare global variable for persons
let persons = []

const app = express()

// initialize handleBars
app.engine('hbs', expressHandlebars.engine({
    defaultLayout: "main.hbs"
}))

//load CSS from file
app.get("/layout.css", function(request, response) {
    response.sendFile("layout.css", {root: "."})
})

//render website and pass all the data as model to the frontend
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

//launch the app and load all the data for the persons from dbpedia and wikidata asynchronously
//get name, description and picture from dbpedia (if there is none, get it from wikidata)
app.listen(8080, async () => {
    const queryPersons = $rdf.SPARQLToQuery(stringQueryPersons, false, store)
    persons = []
    let result = store.querySync(queryPersons)
    for (let person of result) {
        let name = (await getPropertyDataDbpedia(person['?dbrID'].value, "dbp:name", true)).values[0]
        if (name === undefined)
            name = (await getPropertyDataWikidata(person['?wdID'].value, "rdfs:label", true)).values[0]

        let description = (await getPropertyDataDbpedia(person['?dbrID'].value, "dbo:abstract", true)).values[0]
        if (description === undefined) {
            description = (await getPropertyDataWikidata(person['?wdID'].value, "schema:description", true)).values[0]
        }

        let imgSrc = (await getPropertyDataDbpedia(person['?dbrID'].value, "dbo:thumbnail", false)).values[0]
        if (imgSrc === undefined)
            imgSrc = (await getPropertyDataWikidata(person['?wdID'].value, "wdt:P18", false)).values[0]

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
    console.log("--- All UX Designers loaded ---")
})