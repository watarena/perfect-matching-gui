import React from 'react'

const radius = 50
const lineWidth = 1

let nextVertexID = 0;

class Vertex {
    x: number;
    y: number;
    id: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.id = nextVertexID;
        nextVertexID++;
    }
}

type CanvasState = {
    vertices: Array<Vertex>;
}

class Canvas extends React.Component<{}, CanvasState, any> {
    private canvas: HTMLCanvasElement | null = null

    constructor(props: React.ClassAttributes<Canvas>) {
        super(props);
        this.state = {
            vertices: [],
        }
    }

    getCoordinate = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        if (!this.canvas) {
            throw new Error('getCoordinate: canvas is null')
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

    componentDidUpdate() {
        this.draw();
    }

    draw() {
        if (!this.canvas) {
            throw new Error('draw: canvas is null')
        }

        const context = this.canvas.getContext('2d');
        if (!context) {
            throw new Error('draw: context is null')
        }
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
            <canvas
                width={window.innerWidth}
                height={window.innerHeight}
                ref={(canvas) => {this.canvas = canvas}}
                onClick={(e) => {console.log('clicled'); this.addVertex(e); console.log(this.state.vertices)}}
            >
                キャンバスの表示内容を説明する代替テキストです。
            </canvas>
        )
    }
}

export default Canvas
