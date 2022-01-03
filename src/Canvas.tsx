import React from 'react'
import './Canvas.css';

const radius = 10
const vertexLineWidth = 1

let nextVertexID = 0;

class Vertex {
    x: number;
    y: number;
    r: number = radius;
    id: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.id = nextVertexID;
        nextVertexID++;
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

    draw(context: CanvasRenderingContext2D) {
        context.fillStyle = 'black'
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

type Button = {
    text: string,
    buttonOnClick: React.MouseEventHandler<HTMLButtonElement>,
    canvasOnClick: React.MouseEventHandler<HTMLCanvasElement>,
}

type CanvasState = {
    vertices: Array<Vertex>;
    edges: Array<Edge>;
    selectedVertex?: Vertex;
    buttons: Array<Button>;
    selectedButton: Button;
}

class Canvas extends React.Component<{}, CanvasState, any> {
    private canvas: HTMLCanvasElement | null = null

    constructor(props: React.ClassAttributes<{}>) {
        super(props);

        const makeExclusiveButton = (text: string, onClick: (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => void): Button => {
            const b: Button = {
                text,
                buttonOnClick: () => {
                    this.setState({
                        ...this.state,
                        selectedVertex: undefined,
                        selectedButton: b,
                    })
                },
                canvasOnClick: (e) => onClick(e),
            }

            return b;
        }

        const buttons = [
            makeExclusiveButton('add vertex', this.addVertex),
            makeExclusiveButton('delete vertex', this.deleteVertex),
            makeExclusiveButton('add edge', this.addEdge),
        ]

        this.state = {
            vertices: [],
            edges: [],
            buttons,
            selectedButton: buttons[0],
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
            ...this.state,
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
            ...this.state,
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
                ...this.state,
                selectedVertex: selectedVertex,
            });
            return;
        }

        if (selectedVertex.id === this.state.selectedVertex.id) {
            this.setState({
                ...this.state,
                selectedVertex: undefined,
            });
            return;
        }

        const edge = new Edge(this.state.selectedVertex, selectedVertex);
        if (this.state.edges.some((e) => e.equals(edge))) {
            return
        }

        this.setState({
            ...this.state,
            edges: this.state.edges.concat(edge),
            selectedVertex: undefined,
        })
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

        this.state.edges.forEach((e) => {e.draw(context)})
        this.state.vertices.forEach((v) => {
            v.draw(context, this.state.selectedVertex && v.id === this.state.selectedVertex.id? 'red' : 'black')
        })
    }

    render(): React.ReactNode {
        return (
            <div>
                <div>
                    {
                        this.state.buttons.map((b) => {
                            return (<Button text={b.text} onClick={b.buttonOnClick} selected={b.text === this.state.selectedButton.text} />)
                        })
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
