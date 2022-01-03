import assert from 'assert'
import { vertex, edge, calculatePerfectMatching } from './perfectMatchings'

function makeEdge(v1: vertex, v2: vertex): edge {
    return {v1, v2}
}

function include(s1: Array<edge>, s2: Array<edge>): boolean {
    for (const e1 of s1) {
        if (!s2.some((e2) => (e1.v1 === e2.v1 && e1.v2 === e2.v2) || (e1.v1 === e2.v2 && e1.v2 === e2.v1))) {
            return false
        }
    }
    return true
}

function equalAsSet(s1: Array<edge>, s2: Array<edge>): boolean {
    return include(s1, s2) && include(s2, s1)
}

describe('calculatePerfectMatching', () => {
    const testCases = [
        {
            /*
             * 0-1-2
             * |/| |
             * 3-5-6
             */
            vertices: [0,1,2,3,5,6],
            edges: [
                makeEdge(0,1),
                makeEdge(0,3),
                makeEdge(1,2),
                makeEdge(1,3),
                makeEdge(1,5),
                makeEdge(2,6),
                makeEdge(3,5),
                makeEdge(5,6),
            ],
            expected: [
                [
                    makeEdge(0,1),
                    makeEdge(3,5),
                    makeEdge(2,6),
                ],
                [
                    makeEdge(0,3),
                    makeEdge(1,5),
                    makeEdge(2,6),
                ],
                [
                    makeEdge(0,3),
                    makeEdge(1,2),
                    makeEdge(5,6),
                ],
            ],
        },
        {
            /*
             * 1-2 3
             */
            vertices: [1,2,3],
            edges: [
                makeEdge(1,2),
            ],
            expected: [],
        },
    ]

    it.each(testCases)('', ({vertices, edges, expected}) => {
        const pms = calculatePerfectMatching(vertices, edges)
        while (pms.length > 0) {
            const pm = pms.pop()
            if (!pm) {
                assert(false)
            }
            const i = expected.findIndex((pm_) => equalAsSet(pm, pm_))
            expect(i).not.toBe(-1)
            expected.splice(i, 1)
        }
        expect(expected.length).toBe(0)
    })
})

