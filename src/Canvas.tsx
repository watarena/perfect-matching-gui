import React from 'react'
import './Canvas.css';
import { edge, calculatePerfectMatching } from './perfectMatchings'

const radius = 10
const vertexLineWidth = 1

class Vertex {
    static #nextVertexID = 0
    x: number;
    y: number;
    r: number = radius;
    id: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.id = Vertex.#nextVertexID;
        Vertex.#nextVertexID++;
    }

    draw(context: CanvasRenderingContext2D, color: string) {
        context.fillStyle = color;
        context.lineWidth = vertexLineWidth;
        context.beginPath();
        context.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
        context.fill();
        context.closePath();
    }

    clicked(x: number, y: number): boolean {
        return (this.x - x) ** 2 + (this.y - y) ** 2 <= this.r ** 2
    }
}

const edgeWidth = 3
class Edge {
    v1: Vertex
    v2: Vertex

    constructor(v1: Vertex, v2: Vertex) {
        this.v1 = v1;
        this.v2 = v2;
    }

    draw(context: CanvasRenderingContext2D, color: string) {
        context.strokeStyle = color;
        context.lineWidth = edgeWidth;
        context.beginPath();
        context.moveTo(this.v1.x, this.v1.y);
        context.lineTo(this.v2.x, this.v2.y);
        context.stroke();
        context.closePath();
    }

    equals(e: Edge): boolean {
        return (this.v1.id === e.v1.id && this.v2.id === e.v2.id) || (this.v2.id === e.v1.id && this.v1.id === e.v2.id)
    }
}

type ButtonProp = {
    onClick: React.MouseEventHandler<HTMLButtonElement>;
    text: string;
    selected: boolean;
};

function Button({text, onClick, selected}: ButtonProp): JSX.Element {
    return (
        <button type="button" className="button" onClick={onClick} disabled={selected}>
            {text}
        </button>
    )
}

type ButtonConfig = {
    text: string,
    buttonOnClick: React.MouseEventHandler<HTMLButtonElement>,
    canvasOnClick: React.MouseEventHandler<HTMLCanvasElement>,
}

class PerfectMatching {
    private edges: Set<string> = new Set()

    static edge2string(e: edge) {
        if (e.v1 < e.v2) {
            return `${e.v1},${e.v2}`
        }
        return `${e.v2},${e.v1}`
    }

    constructor(edges: Array<edge>) {
        edges.forEach((e) => this.edges.add(PerfectMatching.edge2string(e)))
    }

    has(e: Edge): boolean {
        return this.edges.has(PerfectMatching.edge2string({v1: e.v1.id, v2: e.v2.id}))
    }
}

type CanvasState = {
    vertices: Array<Vertex>;
    edges: Array<Edge>;
    selectedVertex?: Vertex;
    buttons: Array<ButtonConfig>;
    selectedButton: ButtonConfig;
    perfectMatchings?: Array<PerfectMatching>
    perfectMatchingsIndex: number
}

class Canvas extends React.Component<{}, CanvasState, any> {
    private canvas: HTMLCanvasElement | null = null

    constructor(props: React.ClassAttributes<{}>) {
        super(props);

        const makeExclusiveButton = (
            text: string,
            canvasOnClick: (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => void,
            changeState?: () => object,
        ): ButtonConfig => {
            const b: ButtonConfig = {
                text,
                buttonOnClick: () => {
                    const state = changeState? changeState() : {};
                    this.setState({
                        selectedVertex: undefined,
                        selectedButton: b,
                        perfectMatchings: undefined,
                        ...state,
                    })
                },
                canvasOnClick,
            }

            return b;
        }

        const buttons = [
            makeExclusiveButton('add vertex', this.addVertex),
            makeExclusiveButton('delete vertex', this.deleteVertex),
            makeExclusiveButton('add edge', this.addEdge),
            makeExclusiveButton('calculate perfect matching', () => {}, this.calculatePerfectMatching),
        ]

        this.state = {
            vertices: [],
            edges: [],
            buttons,
            selectedButton: buttons[0],
            perfectMatchingsIndex: -1,
        }
    }

    getCoordinate = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        if (!this.canvas) {
            throw new Error('getCoordinate: canvas is falsy')
        }
        const {top, left} = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - left,
            y: e.clientY - top,
        };
    }

    addVertex = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        const {x, y} = this.getCoordinate(e);
        const clickedVertexIndex = this.state.vertices.findIndex((v) => v.clicked(x, y))
        if (clickedVertexIndex !== -1) {
            return
        }
        this.setState({
            vertices: this.state.vertices.concat(new Vertex(x, y))
        })
    }

    deleteVertex = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        const {x, y} = this.getCoordinate(e);
        const clickedVertexIndex = this.state.vertices.findIndex((v) => v.clicked(x, y))
        if (clickedVertexIndex === -1) {
            return
        }
        const clickedVertexID = this.state.vertices[clickedVertexIndex].id
        const vertices = Array.from(this.state.vertices)
        vertices.splice(clickedVertexIndex, 1)
        this.setState({
            vertices,
            edges: this.state.edges.filter((e) => e.v1.id !== clickedVertexID && e.v2.id !== clickedVertexID),
        })
    }

    addEdge = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        const {x, y} = this.getCoordinate(e);
        const selectedVertex = this.state.vertices.find((v) => v.clicked(x, y));
        if (!selectedVertex) {
            return
        }

        if (!this.state.selectedVertex) {
            this.setState({
                selectedVertex: selectedVertex,
            });
            return;
        }

        if (selectedVertex.id === this.state.selectedVertex.id) {
            this.setState({
                selectedVertex: undefined,
            });
            return;
        }

        const edge = new Edge(this.state.selectedVertex, selectedVertex);
        if (this.state.edges.some((e) => e.equals(edge))) {
            return
        }

        this.setState({
            edges: this.state.edges.concat(edge),
            selectedVertex: undefined,
        })
    }

    calculatePerfectMatching = () => {
        const vertices = this.state.vertices.map((v) => v.id);
        const edges = this.state.edges.map((e) => ({v1: e.v1.id, v2: e.v2.id}));
        const pms = calculatePerfectMatching(vertices, edges);

        return {
            perfectMatchings: pms.map((pm) => new PerfectMatching(pm)),
            perfectMatchingsIndex: 0,
        }
    }

    componentDidUpdate() {
        this.draw();
    }

    componentDidMount() {
        this.draw()
    }

    draw() {
        if (!this.canvas) {
            throw new Error('draw: canvas is falsy')
        }

        const context = this.canvas.getContext('2d');
        if (!context) {
            throw new Error('draw: context is falsy')
        }
        context.clearRect(0, 0, this.canvas.width, this.canvas.height)

        this.state.edges.forEach((e) => {
            if (
                this.state.perfectMatchings &&
                this.state.perfectMatchings[this.state.perfectMatchingsIndex] && 
                this.state.perfectMatchings[this.state.perfectMatchingsIndex].has(e)
            ) {
                e.draw(context, 'red');
            } else {
                e.draw(context, 'black');
            }
        })
        this.state.vertices.forEach((v) => {
            v.draw(context, this.state.selectedVertex && v.id === this.state.selectedVertex.id? 'red' : 'black')
        })
    }

    render(): React.ReactNode {
        return (
            <div>
                <div>
                    {
                        this.state.buttons.map((b, i) => {
                            return (<Button key={`button${i}`} text={b.text} onClick={b.buttonOnClick} selected={b.text === this.state.selectedButton.text} />)
                        })
                    }
                    {
                        this.state.perfectMatchings?
                        [
                            (
                                <button
                                    type="button"
                                    className="select-button"
                                    disabled={this.state.perfectMatchingsIndex === 0}
                                    onClick={() => this.setState({perfectMatchingsIndex:this.state.perfectMatchingsIndex - 1})}
                                >
                                    &lt;
                                </button>
                            ),
                            (
                                ` ${this.state.perfectMatchingsIndex + 1}/${this.state.perfectMatchings.length} `
                            ),
                            (
                                <button 
                                    type="button"
                                    className="select-button"
                                    disabled={!this.state.perfectMatchings || this.state.perfectMatchingsIndex >= this.state.perfectMatchings.length - 1}
                                    onClick={() => this.setState({perfectMatchingsIndex:this.state.perfectMatchingsIndex + 1})}
                                >
                                    &gt;
                                </button>
                            ),
                        ]
                        : []
                    }
                </div>
                <div>
                    <canvas
                        width={window.innerWidth}
                        height={window.innerHeight}
                        ref={(canvas) => {this.canvas = canvas}}
                        onClick={(e) => {this.state.selectedButton.canvasOnClick(e)}}
                    >
                        キャンバスの表示内容を説明する代替テキストです。
                    </canvas>
                </div>
            </div>
        )
    }
}

export default Canvas
