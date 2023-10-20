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
    canvasOnClick?: React.MouseEventHandler<HTMLCanvasElement>,
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

class PerfectMatchings {
    private pms: Array<PerfectMatching>
    private currentIndex: number
    private fixedIndex: number | undefined

    constructor(
        pms: Array<PerfectMatching>,
        currentIndex: number,
        fixedIndex: number | undefined
    ) {
        this.pms = pms
        if (currentIndex < 0 || pms.length <= currentIndex) {
            throw new Error(`currentIndex ${currentIndex} is out of bound`)
        }
        this.currentIndex = currentIndex
        this.fixedIndex = fixedIndex
    }

    hasNext(): boolean {
        return this.currentIndex < this.pms.length - 1
    }
    next(): PerfectMatchings {
        return new PerfectMatchings(this.pms, this.currentIndex + 1, this.fixedIndex)
    }
    hasPrev(): boolean {
        return this.currentIndex > 0
    }
    prev(): PerfectMatchings {
        return new PerfectMatchings(this.pms, this.currentIndex - 1, this.fixedIndex)
    }

    isIncludedInCurrent(e: Edge): boolean {
        return this.pms[this.currentIndex].has(e)
    }

    currentPos(): string {
        return `${this.currentIndex + 1}/${this.pms.length}`
    }

    fix(): PerfectMatchings {
        return new PerfectMatchings(this.pms, this.currentIndex, this.currentIndex)
    }

    unFix(): PerfectMatchings {
        return new PerfectMatchings(this.pms, this.currentIndex, undefined)
    }

    isIncludedInFixed(e: Edge): boolean {
        if (this.fixedIndex === undefined) {
            return false
        }
        return this.pms[this.fixedIndex].has(e)
    }

    isCurrentFixed(): boolean {
        return this.currentIndex === this.fixedIndex
    }
}

type CanvasState = {
    vertices: Array<Vertex>;
    edges: Array<Edge>;
    selectedVertex?: Vertex;
    buttons: Array<ButtonConfig>;
    selectedButton: ButtonConfig;
    perfectMatchings?: PerfectMatchings;
    width: number;
    height: number;
}

type CanvasData = {
    width: number;
    height: number;
    vertices: Array<{x:number, y:number}>;
    edges: Array<{v1: number, v2: number}>;
}

function isCanvasData(arg: any): arg is CanvasData {
    const isNumber = (arg: any) => typeof arg === 'number'
    return arg &&
      typeof arg === 'object' &&
      'width' in arg && isNumber(arg.width) &&
      'height' in arg && isNumber(arg.height) &&
      'vertices' in arg && Array.isArray(arg.vertices) && arg.vertices.every((e:any) => typeof e === 'object' && 'x' in e && isNumber(e.x) && 'y' in e && isNumber(e.y)) &&
      'edges' in arg && Array.isArray(arg.edges) && arg.edges.every((e:any) => typeof e === 'object' && 'v1' in e && isNumber(e.v1) && 'v2' in e && isNumber(e.v2))
}

class Canvas extends React.Component<{}, CanvasState, any> {
    private canvas: HTMLCanvasElement | null = null
    private fileInput: HTMLInputElement | null = null;

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

        const buttons: Array<ButtonConfig> = [
            makeExclusiveButton('add vertex', this.addVertex),
            makeExclusiveButton('delete vertex', this.deleteVertex),
            makeExclusiveButton('add edge', this.addEdge),
            {
                text: 'save file',
                buttonOnClick: () => {this.saveFile()},
            },
            {
                text: 'load file',
                buttonOnClick: () => {if (this.fileInput) this.fileInput.click()},
            },
            makeExclusiveButton('calculate perfect matching', () => {}, this.calculatePerfectMatching),
        ]

        this.state = {
            vertices: [],
            edges: [],
            buttons,
            selectedButton: buttons[0],
            width: window.innerWidth,
            height: window.innerHeight,
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

    calculatePerfectMatching: () => Partial<CanvasState> = () => {
        const vertices = this.state.vertices.map((v) => v.id);
        const edges = this.state.edges.map((e) => ({v1: e.v1.id, v2: e.v2.id}));
        const pms = calculatePerfectMatching(vertices, edges);

        return {
            perfectMatchings: new PerfectMatchings(pms.map((pm) => new PerfectMatching(pm)), 0, undefined)
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
            let color: string
            const pms = this.state.perfectMatchings
            if (pms && pms.isIncludedInCurrent(e)) {
                color = 'red'
            } else if (pms && pms.isIncludedInFixed(e)) {
                color = 'green'
            } else {
                color = 'black'
            }
            e.draw(context, color);
        })
        this.state.vertices.forEach((v) => {
            v.draw(context, this.state.selectedVertex && v.id === this.state.selectedVertex.id? 'red' : 'black')
        })
    }

    async loadFile(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files) {
            return
        }
        const file = e.target.files.item(0)
        if (!file) {
            return
        }
        const fileContent = await file.text()
        const canvasData: any = JSON.parse(fileContent)
        if (!isCanvasData(canvasData)) {
            throw new Error('invalid canvas data')
        }
        let height = canvasData.height;
        let width = canvasData.width;
        const vertices = canvasData.vertices.map(({x, y}) => {
            if (width < x) {
                width = x + radius
            }
            if (height < y) {
                height = y + radius
            }
            return new Vertex(x, y)
        })
        const edges = canvasData.edges.map(({v1, v2}) => new Edge(vertices[v1], vertices[v2]))

        this.setState({
            width,
            height,
            vertices,
            edges,
        })
    }

    saveFile() {
        const verticesIndex = new Map<number, number>()
        const vertices = this.state.vertices.map((v, i) => {
            verticesIndex.set(v.id, i)
            return {x: v.x, y: v.y}
        })
        const edges = this.state.edges.reduce<Array<{v1: number, v2: number}>>((acc, e) => {
            const v1 = verticesIndex.get(e.v1.id)
            const v2 = verticesIndex.get(e.v2.id)
            if (v1 != null && v2 != null) {
                acc.push({v1, v2})
            }
            return acc
        }, [])
        const canvasData: CanvasData = {
            width: this.state.width,
            height: this.state.height,
            vertices,
            edges,
        }
        const fileContent = JSON.stringify(canvasData, undefined, 2)
        const downloadURL = URL.createObjectURL(new Blob([fileContent]))
        const pad0To2 = (n: number) => n.toString().padStart(2, '0')
        const now = new Date()
        const [M, d, h, m, s] = [
            now.getMonth() + 1,
            now.getDate(),
            now.getHours(),
            now.getMinutes(),
            now.getSeconds(),
        ].map(pad0To2)
        const a = document.createElement('a')
        a.href = downloadURL
        a.download = `perfect-matching-gui-${now.getFullYear()}${M}${d}-${h}${m}${s}.json`
        a.click()
    }

    render(): React.ReactNode {
        return (
            <div>
                <input type="file" name="file" id="file" ref={(file) => {this.fileInput = file}} style={{display: 'none'}} onChange={(e) => {this.loadFile(e)}}/>
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
                                    key="<"
                                    className="select-button"
                                    disabled={!this.state.perfectMatchings.hasPrev()}
                                    onClick={() => this.setState({perfectMatchings: this.state.perfectMatchings?.prev()})}
                                >
                                    &lt;
                                </button>
                            ),
                            (
                                ` ${this.state.perfectMatchings.currentPos()} `
                            ),
                            (
                                <button 
                                    type="button"
                                    key=">"
                                    className="select-button"
                                    disabled={!this.state.perfectMatchings.hasNext()}
                                    onClick={() => this.setState({perfectMatchings:this.state.perfectMatchings?.next()})}
                                >
                                    &gt;
                                </button>
                            ),
                            (
                                <button 
                                    type="button"
                                    key="fix"
                                    className="select-button"
                                    // disabled={this.state.perfectMatchings.isCurrentFixed()}
                                    onClick={() => {
                                        const pms = this.state.perfectMatchings
                                        if (!pms) { return }
                                        this.setState({
                                            perfectMatchings: pms.isCurrentFixed() ? pms.unFix() : pms.fix()
                                        })
                                    }}
                                >
                                    { this.state.perfectMatchings?.isCurrentFixed() ?  "Unfix" : "Fix" }
                                </button> 
                            )
                        ]
                        : []
                    }
                </div>
                <div>
                    <canvas
                        className='canvas'
                        width={this.state.width}
                        height={this.state.height}
                        ref={(canvas) => {this.canvas = canvas}}
                        onClick={(e) => {
                            if (this.state.selectedButton.canvasOnClick) this.state.selectedButton.canvasOnClick(e)
                        }}
                    >
                        キャンバスの表示内容を説明する代替テキストです。
                    </canvas>
                </div>
            </div>
        )
    }
}

export default Canvas
