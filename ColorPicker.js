import { createTemplate } from "./createTemplate.js";

const template = createTemplate(`
  <template>
    <style>
      :host {
        display: block;
      }
      
      .color-picker {
        display: flex;
        flex-direction: row;
      }
    
      .area-wrapper {
        position: relative;
        background-image: url("areas/0.png");
        margin-right: 12px;
        flex: 0 0 auto;
      }
    
      .area {
        background-image: url("areas.png");
        width: 256px;
        height: 256px;
      }
      
      .selection {
        position: absolute;
        left: 0;
        top: 0;
        width: 11px;
        height: 11px;
        border-radius: 50%;
        box-sizing: border-box;
        border: 1px solid black;
      }
      
      .selection-2 {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        box-sizing: border-box;
        border: 1px solid white;
      }
      
      .selection-3 {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        box-sizing: border-box;
        border: 1px solid black;
      }
      
      .scale-wrapper {
        position: relative;
        width: 19px;
        height: 256px;
        flex: 0 0 auto;
      }
      
      .scale {
        display: inline-block;
      }
      
      .scale-selection {
        position: absolute;
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
        <div class="selection">
          <div class="selection-2">
            <div class="selection-3"></div>
          </div>
        </div>
        <div class="area"></div>
      </div><!--
      --><div class="scale-wrapper">
        <div class="scale-selection">
          <div class="scale-selection-arrow-right"></div>
          <div class="scale-selection-arrow-left"></div>
        </div>
        <canvas class="scale"></canvas>
      </div>
    </div>
  </template>
`)

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

    this._area = this.getArea()

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

  onStartSelect(event) {
    this.isSelecting = true
    this.onSelect(event)
  }

  onSelect(event) {
    if (this.isSelecting) {
      event.preventDefault()
      const selection = this._shadowRoot.querySelector('.selection')
      const area = this.getArea()
      const {left, top} = area.getBoundingClientRect()
      const x = event.clientX - left
      const y = event.clientY - top
      selection.style.left = `${Math.min(Math.max(0, x), area.clientWidth) - 5}px`
      selection.style.top = `${Math.min(Math.max(0, y), area.clientHeight) - 5}px`
      this.color.saturation = x / area.clientWidth
      this.color.lightness = 1 - y / area.clientHeight
      this.dispatchChangeEvent()
    }
  }

  onEndSelect() {
    this.isSelecting = false
  }

  onStartSelectScale(event) {
    this.isSelectingScale = true
    this.onSelectScale(event)
  }

  onSelectScale(event) {
    if (this.isSelectingScale) {
      event.preventDefault()
      const selection = this._shadowRoot.querySelector('.scale-selection')
      const scale = this.getScale()
      const {top} = scale.getBoundingClientRect()
      const top2 = Math.min(Math.max(0, event.clientY - top), scale.clientHeight)
      const hue = 360 - Math.round(360 / scale.height * top2)
      const isDifferentHue = (hue !== this.color.hue)
      this.color.hue = hue
      selection.style.top = `${top2 - 5}px`
      if (isDifferentHue) {
        this.paintArea()
        this.dispatchChangeEvent()
      }
    }
  }

  dispatchChangeEvent() {
    this.dispatchEvent(new CustomEvent('change', {
      detail: {...this.color}
    }))
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
    const area = this.getArea()
    area.style.backgroundPositionX = `${(360 - hue) * 256}px`
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
    let y = scale.height
    for (let hue = 0; hue <= 360; hue += 360 / scale.height) {
      context.fillStyle = `hsl(${hue}, 100%, 50%)`
      context.fillRect(0, y, scale.width, 1)
      y--
    }
  }
}
