import React from 'react'

const radius = 50
const lineWidth = 1

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

    draw(context: CanvasRenderingContext2D, color = 'black') {
        context.fillStyle = color
        context.beginPath();
        context.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
        context.fill();
        context.closePath();
    }

    clicked(x: number, y: number): boolean {
        return (this.x - x) ** 2 + (this.y - y) ** 2 <= this.r ** 2
    }
}

type ButtonProp = {
    onClick: React.MouseEventHandler<HTMLButtonElement>;
    text: string;
};

function Button({text, onClick}: ButtonProp): JSX.Element {
    return (
        <button type="button" onClick={onClick}>
            {text}
        </button>
    )
}

type CanvasState = {
    vertices: Array<Vertex>;
}

class Canvas extends React.Component<{}, CanvasState, any> {
    private canvas: HTMLCanvasElement | null = null
    private onClick: React.MouseEventHandler<HTMLCanvasElement> = (e) => {this.addVertex(e)};

    constructor(props: React.ClassAttributes<{}>) {
        super(props);
        this.state = {
            vertices: [],
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

        this.state.vertices.forEach((v) => {
            context.beginPath();
            context.arc(v.x, v.y, radius, 0, 2 * Math.PI);
            context.fill();
            context.closePath();
        })
    }

    render(): React.ReactNode {
        return (
            <div>
                <div>
                    <Button text="add vertex" onClick={() => this.onClick = (e) => this.addVertex(e)} />
                    <Button text="delete vertex" onClick={() => this.onClick = (e) => this.deleteVertex(e)} />
                </div>
                <div>
                    <canvas
                        width={window.innerWidth}
                        height={window.innerHeight}
                        ref={(canvas) => {this.canvas = canvas}}
                        onClick={(e) => {this.onClick(e)}}
                    >
                        キャンバスの表示内容を説明する代替テキストです。
                    </canvas>
                </div>
            </div>
        )
    }
}

export default Canvas
