import React from 'react'
import './Canvas.css';

const radius = 10
const lineWidth = 1

let nextVertexID = 0;

class Vertex {
    x: number;
    y: number;
    r: number = radius;
    id: number;
    selected: boolean = false;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.id = nextVertexID;
        nextVertexID++;
    }

    draw(context: CanvasRenderingContext2D) {
        context.fillStyle = this.selected? 'red' : 'black'
        context.beginPath();
        context.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
        context.fill();
        context.closePath();
    }

    clicked(x: number, y: number): boolean {
        return (this.x - x) ** 2 + (this.y - y) ** 2 <= this.r ** 2
    }
}

class Edge {
    v1: Vertex
    v2: Vertex

    constructor(v1: Vertex, v2: Vertex) {
        this.v1 = v1;
        this.v2 = v2;
    }

    draw(context: CanvasRenderingContext2D) {
        context.fillStyle = 'black'
        context.beginPath();
        context.moveTo(this.v1.x, this.v1.y);
        context.lineTo(this.v2.x, this.v2.y);
        context.stroke();
        context.closePath();
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
        const vertices = Array.from(this.state.vertices)
        vertices.splice(clickedVertexIndex, 1)
        this.setState({
            ...this.state,
            vertices,
        })
    }

    addEdge = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        const {x, y} = this.getCoordinate(e);
        const selectedVertex = this.state.vertices.find((v) => v.clicked(x, y));
        if (!selectedVertex) {
            return
        }

        if (!this.state.selectedVertex) {
            selectedVertex.selected = true;
            this.setState({
                ...this.state,
                selectedVertex: selectedVertex,
            });
            return;
        }

        if (selectedVertex.selected) {
            selectedVertex.selected = false;
            this.setState({
                ...this.state,
                selectedVertex: undefined,
            });
            return;
        }

        this.state.selectedVertex.selected = false;

        this.setState({
            ...this.state,
            edges: this.state.edges.concat(new Edge(this.state.selectedVertex, selectedVertex)),
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
        context.lineWidth = lineWidth;

        this.state.edges.forEach((e) => {e.draw(context)})
        this.state.vertices.forEach((v) => {v.draw(context)})
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
