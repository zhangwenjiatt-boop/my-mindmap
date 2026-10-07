import {
  resizeImgSize,
  removeRichTextStyes,
  checkIsRichText,
  isUndef,
  createForeignObjectNode,
  addXmlns,
  generateColorByContent,
  camelCaseToHyphen,
  getNodeRichTextStyles
} from '../../../utils'
import { Image as SVGImage, SVG, A, G, Rect, Text } from '@svgdotjs/svg.js'
import iconsSvg from '../../../svg/icons'
import { noneRichTextNodeLineHeight } from '../../../constants/constant'

// 测量svg文本宽高
const measureText = (text, style) => {
  const g = new G()
  const node = new Text().text(text)
  style.text(node)
  g.add(node)
  return g.bbox()
}

// 计算节点的合理换行宽度，结合单词长度与同级节点协调
const getNodeAutoWrapWidth = (node, text, measureFn) => {
  // 如果用户手动拖拽调整了自定义宽度
  if (node.hasCustomWidth && node.hasCustomWidth()) {
    return node.customTextWidth
  }
  if (node.customTextWidth !== undefined) {
    return node.customTextWidth
  }

  const defaultMaxWidth =
    (node.mindMap && node.mindMap.opt && node.mindMap.opt.textAutoWrapWidth) || 500

  // 提取纯文本单词，过滤掉富文本 HTML 标签和实体
  const extractWords = str => {
    const clean = String(str || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-zA-Z0-9#]+;/g, ' ')
    return clean.match(/[a-zA-Z0-9_\-'.]+/g) || []
  }

  // 1. 测量当前节点文本中的最长英文/数字单词宽度
  let maxWordWidth = 0
  if (text) {
    const words = extractWords(text)
    words.forEach(w => {
      const width = measureFn(w)
      if (width > maxWordWidth) {
        maxWordWidth = width
      }
    })
  }

  // 2. 检查同级节点（同一个父节点下的兄弟节点）
  let siblingMaxWordWidth = maxWordWidth

  if (node.parent && node.parent.nodeData && Array.isArray(node.parent.nodeData.children)) {
    const siblings = node.parent.nodeData.children
    if (siblings.length > 1) {
      siblings.forEach(siblingData => {
        if (!siblingData || !siblingData.data) return
        const sWords = extractWords(siblingData.data.text || '')
        sWords.forEach(w => {
          const width = measureFn(w)
          if (width > siblingMaxWordWidth) {
            siblingMaxWordWidth = width
          }
        })
      })
    }
  }

  // 3. 计算协调目标宽度
  // 基础舒适宽度：对于导图节点，260px 是兼顾中英文双语的最佳排版宽度
  // 必须 >= 最长单词宽度 + 24，确保长单词绝对能在一行容纳，绝不被硬截断
  let targetWidth = Math.max(260, Math.ceil(siblingMaxWordWidth + 24))

  // 如果最长单词未超出 defaultMaxWidth，则以 defaultMaxWidth 为上限
  // 若最长单词自身超出了 defaultMaxWidth，则以单词宽度为准保证完整显示不截断
  if (targetWidth > defaultMaxWidth && siblingMaxWordWidth + 24 <= defaultMaxWidth) {
    targetWidth = defaultMaxWidth
  }

  return targetWidth
}

// 标签默认的样式
const defaultTagStyle = {
  radius: 3, // 标签矩形的圆角大小
  fontSize: 12, // 字号，建议文字高度不要大于height
  fill: '', // 标签矩形的背景颜色
  height: 20, // 标签矩形的高度
  paddingX: 8 // 水平内边距，如果设置了width，将忽略该配置
  //width: 30 // 标签矩形的宽度，如果不设置，默认以文字的宽度+paddingX*2为宽度
}

// 获取图片的真实url
// 因为如果注册了NodeBase64ImageStorage插件，那么节点图片字段保存的实际是一个id，所以如果要获取图片真实的url可以通过该方法
function getImageUrl() {
  const img = this.getData('image')
  return (this.mindMap.renderer.renderTree.data.imgMap || {})[img] || img
}

//  创建图片节点
function createImgNode() {
  let img = this.getImageUrl()
  if (!img) {
    return
  }
  img = (this.mindMap.renderer.renderTree.data.imgMap || {})[img] || img
  const imgSize = this.getImgShowSize()
  const node = new SVGImage().load(img).size(...imgSize)
  // 如果指定了加载失败显示的图片，那么加载一下图片检测是否失败
  const { defaultNodeImage } = this.mindMap.opt
  if (defaultNodeImage) {
    const imgEl = new Image()
    imgEl.onerror = () => {
      node.load(defaultNodeImage)
    }
    imgEl.src = img
  }
  if (this.getData('imageTitle')) {
    node.attr('title', this.getData('imageTitle'))
  }
  node.on('click', e => {
    this.mindMap.emit('node_img_click', this, node, e)
  })
  node.on('dblclick', e => {
    this.mindMap.emit('node_img_dblclick', this, e, node)
  })
  node.on('mouseenter', e => {
    this.mindMap.emit('node_img_mouseenter', this, node, e)
  })
  node.on('mouseleave', e => {
    this.mindMap.emit('node_img_mouseleave', this, node, e)
  })
  node.on('mousemove', e => {
    this.mindMap.emit('node_img_mousemove', this, node, e)
  })
  return {
    node,
    width: imgSize[0],
    height: imgSize[1]
  }
}

//  获取图片显示宽高
function getImgShowSize() {
  const { custom, width, height } = this.getData('imageSize')
  // 如果是自定义了图片的宽高，那么不受最大宽高限制
  if (custom) return [width, height]
  return resizeImgSize(
    width,
    height,
    this.mindMap.themeConfig.imgMaxWidth,
    this.mindMap.themeConfig.imgMaxHeight
  )
}

//  创建icon节点
function createIconNode() {
  let _data = this.getData()
  if (!_data.icon || _data.icon.length <= 0) {
    return []
  }
  let iconSize = this.mindMap.themeConfig.iconSize
  return _data.icon.map(item => {
    let src = iconsSvg.getNodeIconListIcon(
      item,
      this.mindMap.opt.iconList || []
    )
    let node = null
    // svg图标
    if (/^<svg/.test(src)) {
      node = SVG(src)
    } else {
      // 图片图标
      node = new SVGImage().load(src)
    }
    node.size(iconSize, iconSize)
    node.on('click', e => {
      this.mindMap.emit('node_icon_click', this, item, e, node)
    })
    node.on('mouseenter', e => {
      this.mindMap.emit('node_icon_mouseenter', this, item, e, node)
    })
    node.on('mouseleave', e => {
      this.mindMap.emit('node_icon_mouseleave', this, item, e, node)
    })
    return {
      node,
      width: iconSize,
      height: iconSize
    }
  })
}

// 创建富文本节点
function createRichTextNode(specifyText) {
  const hasCustomWidth = this.hasCustomWidth ? this.hasCustomWidth() : false
  let text =
    typeof specifyText === 'string' ? specifyText : this.getData('text')
  let { emptyTextMeasureHeightText } = this.mindMap.opt
  let textAutoWrapWidth
  if (hasCustomWidth) {
    textAutoWrapWidth = this.customTextWidth
  } else {
    textAutoWrapWidth = getNodeAutoWrapWidth(this, text, str => {
      return measureText(str, this.style).width
    })
  }
  const g = new G()
  // 创建富文本结构，或复位富文本样式
  let recoverText = false
  if (this.getData('resetRichText')) {
    delete this.nodeData.data.resetRichText
    recoverText = true
  }
  if (recoverText && !isUndef(text)) {
    if (checkIsRichText(text)) {
      // 如果是富文本那么移除内联样式
      text = removeRichTextStyes(text)
    } else {
      // 非富文本则改为富文本结构
      text = `<p>${text}</p>`
    }
    this.setData({
      text
    })
  }
  // 节点的富文本样式数据
  const nodeTextStyleList = []
  const nodeRichTextStyles = getNodeRichTextStyles(this)
  Object.keys(nodeRichTextStyles).forEach(prop => {
    nodeTextStyleList.push([prop, nodeRichTextStyles[prop]])
  })
  // 测量文本大小
  if (!this.mindMap.commonCaches.measureRichtextNodeTextSizeEl) {
    this.mindMap.commonCaches.measureRichtextNodeTextSizeEl =
      document.createElement('div')
    this.mindMap.commonCaches.measureRichtextNodeTextSizeEl.style.position =
      'fixed'
    this.mindMap.commonCaches.measureRichtextNodeTextSizeEl.style.left =
      '-999999px'
    this.mindMap.el.appendChild(
      this.mindMap.commonCaches.measureRichtextNodeTextSizeEl
    )
  }
  const div = this.mindMap.commonCaches.measureRichtextNodeTextSizeEl
  // 应用节点的文本样式
  nodeTextStyleList.forEach(([prop, value]) => {
    div.style[prop] = value
  })
  div.style.lineHeight = 1.2
  const html = `<div>${text}</div>`
  div.innerHTML = html
  const el = div.children[0]
  el.classList.add('smm-richtext-node-wrap')
  addXmlns(el)
  el.style.wordBreak = 'normal'
  el.style.overflowWrap = 'break-word'
  el.style.maxWidth = textAutoWrapWidth + 'px'
  if (hasCustomWidth) {
    el.style.width = this.customTextWidth + 'px'
  } else {
    el.style.width = ''
  }
  let { width, height } = el.getBoundingClientRect()
  // 如果文本为空，那么需要计算一个默认高度
  if (height <= 0) {
    div.innerHTML = `<p>${emptyTextMeasureHeightText}</p>`
    let elTmp = div.children[0]
    elTmp.classList.add('smm-richtext-node-wrap')
    height = elTmp.getBoundingClientRect().height
    div.innerHTML = html
  }
  width = Math.min(Math.ceil(width) + 1, textAutoWrapWidth) // 修复getBoundingClientRect方法对实际宽度是小数的元素获取到的值是整数，导致宽度不够文本发生换行的问题
  height = Math.ceil(height)
  g.attr('data-width', width)
  g.attr('data-height', height)
  g.attr('data-max-width', textAutoWrapWidth)
  const foreignObject = createForeignObjectNode({
    el: div.children[0],
    width,
    height
  })
  // 应用节点文本样式
  // 进入文本编辑时，这个样式也会同样添加到文本编辑框的元素上
  const foreignObjectStyle = {
    'line-height': 1.2
  }
  nodeTextStyleList.forEach(([prop, value]) => {
    foreignObjectStyle[camelCaseToHyphen(prop)] = value
  })
  foreignObject.css(foreignObjectStyle)
  g.add(foreignObject)
  return {
    node: g,
    nodeContent: foreignObject,
    width,
    height
  }
}

//  创建文本节点
function createTextNode(specifyText) {
  if (this.getData('needUpdate')) {
    delete this.nodeData.data.needUpdate
  }
  // 如果是富文本内容，那么转给富文本函数
  if (this.getData('richText')) {
    return this.createRichTextNode(specifyText)
  }
  const text =
    typeof specifyText === 'string' ? specifyText : this.getData('text')
  if (this.getData('resetRichText')) {
    delete this.nodeData.data.resetRichText
  }
  const g = new G()
  const fontSize = this.getStyle('fontSize', false)
  const textAlign = this.getStyle('textAlign', false)
  // 文本超长自动换行
  let textArr = []
  if (!isUndef(text)) {
    textArr = String(text).split(/\n/gim)
  }
  const hasCustomWidth = this.hasCustomWidth ? this.hasCustomWidth() : false
  const getWidth = str => measureText(str, this.style).width
  const maxWidth = hasCustomWidth
    ? this.customTextWidth
    : getNodeAutoWrapWidth(this, text, getWidth)
  const { emptyTextMeasureHeightText } = this.mindMap.opt
  let isMultiLine = textArr.length > 1
  textArr.forEach((item, index) => {
    // 快速检查：如果当前行未超过最大换行宽度，保持原样
    if (getWidth(item) <= maxWidth) {
      return
    }

    // 智能 Token 拆分：英文字词+标点整体不截断，CJK 汉字按字换行，空格作为自然分界
    const tokenRegex = /([a-zA-Z0-9_\-'.]+[,:;?!]*|[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af][，。、；：？！’”）》\]}]?|\s+|.)/gu
    const tokens = []
    let m
    while ((m = tokenRegex.exec(item)) !== null) {
      tokens.push(m[0])
    }

    const lines = []
    let currentLine = ''

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]

      // 新行开头的纯空格忽略，防止左侧缩进参差不齐
      if (!currentLine && /^\s+$/.test(token)) {
        continue
      }

      const candidate = currentLine + token

      if (getWidth(candidate) <= maxWidth) {
        currentLine = candidate
      } else {
        if (currentLine) {
          // 当前行已满：放入 lines，当前单词移至下一行完整展示（不硬截断单词！）
          lines.push(currentLine.trimEnd())
          currentLine = /^\s+$/.test(token) ? '' : token
        } else {
          // 单个单词本身极其巨大（超过 maxWidth）：仅在极端情况下降级切分
          let chars = token.split('')
          let subLine = ''
          while (chars.length > 0) {
            let ch = chars.shift()
            if (getWidth(subLine + ch) <= maxWidth) {
              subLine += ch
            } else {
              if (subLine) lines.push(subLine)
              subLine = ch
            }
          }
          currentLine = subLine
        }
      }
    }

    if (currentLine && currentLine.trim()) {
      lines.push(currentLine.trimEnd())
    }

    if (lines.length > 1) {
      isMultiLine = true
    }

    textArr[index] = lines.length ? lines.join('\n') : item
  })
  textArr = textArr.join('\n').replace(/\n$/g, '').split(/\n/gim)
  textArr.forEach((item, index) => {
    // 避免尾部的空行不占宽度
    // 同时解决该问题：https://github.com/wanglin2/mind-map/issues/1037
    if (item === '') {
      item = '﻿'
    }
    const node = new Text().text(item)
    node.addClass('smm-text-node-wrap')
    node.attr(
      'text-anchor',
      {
        left: 'start',
        center: 'middle',
        right: 'end'
      }[textAlign] || 'start'
    )
    this.style.text(node)
    node.y(
      fontSize * noneRichTextNodeLineHeight * index +
        ((noneRichTextNodeLineHeight - 1) * fontSize) / 2
    )
    g.add(node)
  })
  let { width, height } = g.bbox()
  // 如果文本为空，那么需要计算一个默认高度
  if (height <= 0) {
    const tmpNode = new Text().text(emptyTextMeasureHeightText)
    this.style.text(tmpNode)
    const tmpBbox = tmpNode.bbox()
    height = tmpBbox.height
  }
  width = Math.min(Math.ceil(width), maxWidth)
  height = Math.ceil(height)
  g.attr('data-width', width)
  g.attr('data-height', height)
  g.attr('data-max-width', maxWidth)
  g.attr('data-ismultiLine', isMultiLine || textArr.length > 1)
  return {
    node: g,
    width,
    height
  }
}

//  创建超链接节点
function createHyperlinkNode() {
  const { hyperlink, hyperlinkTitle } = this.getData()
  if (!hyperlink) {
    return
  }
  const { customHyperlinkJump, hyperlinkIcon } = this.mindMap.opt
  const { icon, style } = hyperlinkIcon
  const iconSize = this.getNodeIconSize('hyperlinkIcon')
  const node = new SVG().size(iconSize, iconSize)
  // 超链接节点
  const a = new A().to(hyperlink).target('_blank')
  a.node.addEventListener('click', e => {
    if (typeof customHyperlinkJump === 'function') {
      e.preventDefault()
      customHyperlinkJump(hyperlink, this)
    }
  })
  if (hyperlinkTitle) {
    node.add(SVG(`<title>${hyperlinkTitle}</title>`))
  }
  // 添加一个透明的层，作为鼠标区域
  a.rect(iconSize, iconSize).fill({ color: 'transparent' })
  // 超链接图标
  const iconNode = SVG(icon || iconsSvg.hyperlink).size(iconSize, iconSize)
  this.style.iconNode(iconNode, style.color)
  a.add(iconNode)
  node.add(a)
  return {
    node,
    width: iconSize,
    height: iconSize
  }
}

//  创建标签节点
function createTagNode() {
  const tagData = this.getData('tag')
  if (!tagData || tagData.length <= 0) {
    return []
  }
  let { maxTag, tagsColorMap } = this.mindMap.opt
  tagsColorMap = tagsColorMap || {}
  const nodes = []
  tagData.slice(0, maxTag).forEach((item, index) => {
    let str = ''
    let style = {
      ...defaultTagStyle
    }
    // 旧版只支持字符串类型
    if (typeof item === 'string') {
      str = item
    } else {
      // v0.10.3+版本支持对象类型
      str = item.text
      style = { ...defaultTagStyle, ...item.style }
    }
    // 是否手动设置了标签宽度
    const hasCustomWidth = typeof style.width !== 'undefined'
    // 创建容器节点
    const tag = new G()
    tag.on('click', () => {
      this.mindMap.emit('node_tag_click', this, item, index, tag)
    })
    // 标签文本
    const text = new Text().text(str)
    this.style.tagText(text, style)
    // 获取文本宽高
    const { width: textWidth, height: textHeight } = text.bbox()
    // 矩形宽度
    const rectWidth = hasCustomWidth
      ? style.width
      : textWidth + style.paddingX * 2
    // 取文本和矩形最大宽高作为标签宽高
    const maxWidth = hasCustomWidth ? Math.max(rectWidth, textWidth) : rectWidth
    const maxHeight = Math.max(style.height, textHeight)
    // 文本居中
    if (hasCustomWidth) {
      text.x((maxWidth - textWidth) / 2)
    } else {
      text.x(hasCustomWidth ? 0 : style.paddingX)
    }
    text.cy(-maxHeight / 2)
    // 标签矩形
    const rect = new Rect().size(rectWidth, style.height).cy(-maxHeight / 2)
    if (hasCustomWidth) {
      rect.x((maxWidth - rectWidth) / 2)
    }
    this.style.tagRect(rect, {
      ...style,
      fill:
        style.fill || // 优先节点自身配置
        tagsColorMap[text.node.textContent] || // 否则尝试从实例化选项tagsColorMap映射中获取颜色
        generateColorByContent(text.node.textContent) // 否则按照标签内容生成
    })
    tag.add(rect).add(text)
    nodes.push({
      node: tag,
      width: maxWidth,
      height: maxHeight
    })
  })
  return nodes
}

//  创建备注节点
function createNoteNode() {
  if (!this.getData('note')) {
    return null
  }
  const { icon, style } = this.mindMap.opt.noteIcon
  const iconSize = this.getNodeIconSize('noteIcon')
  const node = new SVG()
    .attr('cursor', 'pointer')
    .addClass('smm-node-note')
    .size(iconSize, iconSize)
  // 透明的层，用来作为鼠标区域
  node.add(new Rect().size(iconSize, iconSize).fill({ color: 'transparent' }))
  // 备注图标
  const iconNode = SVG(icon || iconsSvg.note).size(iconSize, iconSize)
  this.style.iconNode(iconNode, style.color)
  node.add(iconNode)
  // 备注tooltip
  if (!this.mindMap.opt.customNoteContentShow) {
    if (!this.noteEl) {
      this.noteEl = document.createElement('div')
      this.noteEl.style.cssText = `
          position: fixed;
          padding: 10px;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgb(0 0 0 / 10%);
          display: none;
          background-color: #fff;
          z-index: ${this.mindMap.opt.nodeNoteTooltipZIndex}
      `
      const targetNode =
        this.mindMap.opt.customInnerElsAppendTo || document.body
      targetNode.appendChild(this.noteEl)
    }
    this.noteEl.innerText = this.getData('note')
  }
  node.on('mouseover', () => {
    const { left, top } = this.getNoteContentPosition()
    if (!this.mindMap.opt.customNoteContentShow) {
      this.noteEl.style.left = left + 'px'
      this.noteEl.style.top = top + 'px'
      this.noteEl.style.display = 'block'
    } else {
      this.mindMap.opt.customNoteContentShow.show(
        this.getData('note'),
        left,
        top,
        this
      )
    }
  })
  node.on('mouseout', () => {
    if (!this.mindMap.opt.customNoteContentShow) {
      this.noteEl.style.display = 'none'
    } else {
      this.mindMap.opt.customNoteContentShow.hide()
    }
  })
  node.on('click', e => {
    this.mindMap.emit('node_note_click', this, e, node)
  })
  node.on('dblclick', e => {
    this.mindMap.emit('node_note_dblclick', this, e, node)
  })
  return {
    node,
    width: iconSize,
    height: iconSize
  }
}

//  创建附件节点
function createAttachmentNode() {
  const { attachmentUrl, attachmentName } = this.getData()
  if (!attachmentUrl) {
    return
  }
  const iconSize = this.getNodeIconSize('attachmentIcon')
  const { icon, style } = this.mindMap.opt.attachmentIcon
  const node = new SVG().attr('cursor', 'pointer').size(iconSize, iconSize)
  if (attachmentName) {
    node.add(SVG(`<title>${attachmentName}</title>`))
  }
  // 透明的层，用来作为鼠标区域
  node.add(new Rect().size(iconSize, iconSize).fill({ color: 'transparent' }))
  // 备注图标
  const iconNode = SVG(icon || iconsSvg.attachment).size(iconSize, iconSize)
  this.style.iconNode(iconNode, style.color)
  node.add(iconNode)
  node.on('click', e => {
    this.mindMap.emit('node_attachmentClick', this, e, node)
  })
  node.on('contextmenu', e => {
    this.mindMap.emit('node_attachmentContextmenu', this, e, node)
  })
  return {
    node,
    width: iconSize,
    height: iconSize
  }
}

// 获取节点图标大小
function getNodeIconSize(prop) {
  const { style } = this.mindMap.opt[prop]
  return isUndef(style.size) ? this.mindMap.themeConfig.iconSize : style.size
}

// 获取节点备注显示位置
function getNoteContentPosition() {
  const iconSize = this.getNodeIconSize('noteIcon')
  const { scaleY } = this.mindMap.view.getTransformData().transform
  const iconSizeAddScale = iconSize * scaleY
  let { left, top } = this._noteData.node.node.getBoundingClientRect()
  top += iconSizeAddScale
  return {
    left,
    top
  }
}

// 测量自定义节点内容元素的宽高
function measureCustomNodeContentSize(content) {
  if (!this.mindMap.commonCaches.measureCustomNodeContentSizeEl) {
    this.mindMap.commonCaches.measureCustomNodeContentSizeEl =
      document.createElement('div')
    this.mindMap.commonCaches.measureCustomNodeContentSizeEl.style.cssText = `
      position: fixed;
      left: -99999px;
      top: -99999px;
    `
    this.mindMap.el.appendChild(
      this.mindMap.commonCaches.measureCustomNodeContentSizeEl
    )
  }
  this.mindMap.commonCaches.measureCustomNodeContentSizeEl.innerHTML = ''
  this.mindMap.commonCaches.measureCustomNodeContentSizeEl.appendChild(content)
  let rect =
    this.mindMap.commonCaches.measureCustomNodeContentSizeEl.getBoundingClientRect()
  return {
    width: rect.width,
    height: rect.height
  }
}

// 是否使用的是自定义节点内容
function isUseCustomNodeContent() {
  return !!this._customNodeContent
}

export default {
  getImageUrl,
  createImgNode,
  getImgShowSize,
  createIconNode,
  createRichTextNode,
  createTextNode,
  createHyperlinkNode,
  createTagNode,
  createNoteNode,
  createAttachmentNode,
  getNoteContentPosition,
  getNodeIconSize,
  measureCustomNodeContentSize,
  isUseCustomNodeContent
}
