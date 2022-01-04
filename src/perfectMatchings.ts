export type vertex = number
export type edge = {
    v1: vertex
    v2: vertex
}

function separateEdgesJoinedVertex(edges: Array<edge>, vertex: vertex): {joined: Array<edge>, rest: Array<edge>} {
    const joined: Array<edge> = []
    const rest: Array<edge> = []

    edges.forEach(e => {
        if (e.v1 === vertex || e.v2 === vertex) {
            joined.push(e)
        } else {
            rest.push(e)
        }
    })

    return {joined, rest}
}

function deleteVertices(_vertices: Array<vertex>, _edges: Array<edge>, ...vs: Array<vertex>): {vertices: Array<vertex>,edges: Array<edge>} {
    const vertices = _vertices.filter((v) => !vs.includes(v))
    const edges = _edges.filter((e) => !vs.includes(e.v1) && !vs.includes(e.v2))
    return {vertices, edges}
}

export function calculatePerfectMatching(vertices: Array<vertex>, edges: Array<edge>): Array<Array<edge>> {
    if (vertices.length < 2) {
        return []
    }
    if (vertices.length === 2) {
        const e = edges.find((e) => (e.v1 === vertices[0] && e.v2 === vertices[1]) || (e.v1 === vertices[1] && e.v2 === vertices[0]))
        if (e) {
            return [[e]]
        } else {
            return []
        }
    }
    const v = vertices[0]
    const {joined, rest: _restEs} = separateEdgesJoinedVertex(edges, v)
    return joined.flatMap((e) => {
        const _v = e.v1 === v? e.v2 : e.v1
        const {vertices: restVs, edges: restEs} = deleteVertices(vertices, _restEs, v, _v)
        const pms = calculatePerfectMatching(restVs, restEs)
        pms.forEach((pm) => pm.push(e))
        return pms
    })
}
