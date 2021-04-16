import { createTemplate } from "./node_modules/@sanjo/web-components/index.js";

const template = createTemplate(`
  <template>
    <style>
      .area-wrapper {
        display: inline-block;
        position: relative;
      }
    
      .area {
        display: inline-block;
      }
      
      .selection {
        position: absolute;
        left: 0;
        top: 0;
        width: 11px;
        height: 11px;
        border-radius: 50%;
        box-sizing: border-box;
        border: 1px solid white;
      }
      
      .scale-wrapper {
        display: inline-block;
      }
      
      .scale {
        display: inline-block;
        position: realtive;
      }
      
      .scale-selection {
        position: relative;
        width: 39px;
        height: 10px;
        left: -10px;
        top: 5px;
      }
      
      .scale-selection-arrow-right {
        position: absolute;
        left: 0;
        width: 0;
        height: 0;
        border-top: 5px solid transparent;
        border-left: 10px solid black;
        border-bottom: 5px solid transparent;
      }
      
      .scale-selection-arrow-left {
        position: absolute;
        right: 0;
        width: 0;
        height: 0;
        border-top: 5px solid transparent;
        border-right: 10px solid black;
        border-bottom: 5px solid transparent;
      }
    </style>
  
    <div class="color-picker">
      <div class="area-wrapper">
        <div class="selection"></div>
        <canvas class="area"></canvas>
      </div>
      <div class="scale-wrapper">
        <div class="scale-selection">
          <div class="scale-selection-arrow-right"></div>
          <div class="scale-selection-arrow-left"></div>
        </div>
        <canvas class="scale"></canvas>
      </div>
    </div>
    
    <button>Export</button>
  </template>
`)

function toBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve))
}

export class ColorPicker extends HTMLElement {
  constructor() {
    super()
    const templateContent = template.content
    const shadowRoot = this.attachShadow({mode: 'closed'})
    this._shadowRoot = shadowRoot
    shadowRoot.appendChild(templateContent.cloneNode(true))
    this.color = {
      hue: 0,
      saturation: 1,
      lightness: 0.5
    }

    const area = this.getArea()
    this._area = area
    area.width = 256
    area.height = 256

    this._areas = new Array(359)
    const exportAreas = async () => {
      const directoryHandle = await showDirectoryPicker()
      for (let hue = 0; hue < 360; hue++) {
        this._areas[hue] = this.paintAreaForHue(hue)
        const blob = await toBlob(this._areas[hue])
        const fileHandle = await directoryHandle.getFileHandle(`${hue}.png`, {
          create: true
        })
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
      }
    }

    const button = this._shadowRoot.querySelector('button')
    button.addEventListener('click', () => {
      exportAreas()
    })

    this._areaContext = area.getContext('2d')

    this.paintArea()
    this.paintScale()

    this.onStartSelect = this.onStartSelect.bind(this)
    this.onSelect = this.onSelect.bind(this)
    this.onEndSelect = this.onEndSelect.bind(this)
    this.isSelecting = false

    this.onStartSelectScale = this.onStartSelectScale.bind(this)
    this.onSelectScale = this.onSelectScale.bind(this)
    this.onEndSelectScale = this.onEndSelectScale.bind(this)
    this.isSelectingScale = false
  }

  connectedCallback() {
    const area = this.getArea()
    area.addEventListener('mousedown', this.onStartSelect)
    window.addEventListener('mousemove', this.onSelect)
    window.addEventListener('mouseup', this.onEndSelect)

    const scale = this.getScale()
    scale.addEventListener('mousedown', this.onStartSelectScale)
    window.addEventListener('mousemove', this.onSelectScale)
    window.addEventListener('mouseup', this.onEndSelectScale)
  }

  disconnectedCallback() {
    const area = this.getArea()
    area.removeEventListener('mousedown', this.onStartSelect)
    window.removeEventListener('mousemove', this.onSelect)
    window.removeEventListener('mouseup', this.onEndSelect)

    const scale = this.getScale()
    scale.removeEventListener('mousedown', this.onStartSelectScale)
    window.removeEventListener('mousemove', this.onSelectScale)
    window.removeEventListener('mouseup', this.onEndSelectScale)
  }

  onStartSelect() {
    this.isSelecting = true
  }

  onSelect(event) {
    if (this.isSelecting) {
      event.preventDefault()
      const selection = this._shadowRoot.querySelector('.selection')
      const area = this.getArea()
      selection.style.left = `${Math.min(Math.max(0, event.offsetX), area.clientWidth) - 5}px`
      selection.style.top = `${Math.min(Math.max(0, event.offsetY), area.clientHeight) - 5}px`
    }
  }

  onEndSelect() {
    this.isSelecting = false
  }

  onStartSelectScale() {
    this.isSelectingScale = true
  }

  onSelectScale(event) {
    if (this.isSelectingScale) {
      event.preventDefault()
      const selection = this._shadowRoot.querySelector('.scale-selection')
      const scale = this.getScale()
      const {top} = scale.getBoundingClientRect()
      const top2 = Math.min(Math.max(0, event.clientY - top), scale.clientHeight)
      const hue = Math.round(360 / scale.height * top2)
      const isDifferentHue = (hue !== this.color.hue)
      this.color.hue = hue
      selection.style.top = `${top2 + 5}px`
      if (isDifferentHue) {
        this.paintArea()
      }
    }
  }

  onEndSelectScale() {
    this.isSelectingScale = false
  }

  getArea() {
    return this._shadowRoot.querySelector('.area')
  }

  getScale() {
    return this._shadowRoot.querySelector('.scale')
  }

  paintArea() {
    const hue = this.color.hue % 360
    if (!this._areas[hue]) {
      this._areas[hue] = this.paintAreaForHue(hue)
    }
    this._areaContext.drawImage(this._areas[hue], 0, 0)
  }

  paintAreaForHue(hue) {
    const area = document.createElement('canvas')
    area.width = this._area.width
    area.height = this._area.height
    const context = area.getContext('2d')
    let x = 0
    let y = 0
    for (let lightness = 1; lightness >= 0; lightness -= 1 / area.height) {
      for (let saturation = 0; saturation <= 1; saturation += 1 / area.width) {
        context.fillStyle = `hsl(${hue}, ${saturation * 100}%, ${lightness * 100}%)`
        context.fillRect(x, y, 1, 1)
        x += 1
      }
      y += 1
      x = 0
    }
    return area
  }

  paintScale() {
    const scale = this.getScale()
    scale.width = 19
    scale.height = 256
    const context = scale.getContext('2d')
    let y = 0
    for (let hue = 0; hue <= 360; hue += 360 / scale.height) {
      context.fillStyle = `hsl(${hue}, 100%, 50%)`
      context.fillRect(0, y, scale.width, 1)
      y++
    }
  }
}
