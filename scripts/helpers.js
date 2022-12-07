const getPropertyDataDbpedia = async (resource, property) => {
    let result = {
        property: property,
        values: []
    }
    const query = `SELECT ?object  WHERE { dbr:${resource} ${property} ?object . }`
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
const getPropertyDataWikidata = async (artist_name, property) => {
    let result = {
        property: property,
        values: []
    }
    const query = `SELECT ?object  WHERE { wd:${WikidataIds[artist_name]} wdt:${WikidataIds[property]} ?object . }`
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