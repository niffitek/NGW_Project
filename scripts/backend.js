const fs = require('fs')
const $rdf = require('rdflib')

const turtleString = fs.readFileSync('game-resources.ttl').toString()

const store = $rdf.graph()

$rdf.parse(
    turtleString,
    store,
    "http://gameverse.com/owl/games",
    "text/turtle"
)

const stringQuery = `
	SELECT
		?id
		?name
	WHERE {
		?category a <http://example.org/category> .
		?category <http://example.org/id> ?id .
		?category <http://example.org/id> ?name .
	}
`

const query = $rdf.SPARQLToQuery(stringQuery, false, store)

// To see what we get back as result:
console.log(store.querySync(query))

const categories = store.querySync(query).map(
    categoryResult => {
        return {
            id: categoryResult['?id'].value,
            name: categoryResult['?name'].value,
        }
    }
)