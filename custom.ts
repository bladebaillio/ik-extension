//% weight=100 color=#0050bb icon="\uf256"
namespace ikchain {
    export class IKChain {
        public segments: Segment[] = []
        public headSprite: Sprite
        public baseSprite: Sprite
        public totalLength: number = 0
        public thickness: number = 2
        public lineColor: number = 1
        public shouldDraw: boolean = true
        private jointSprites: Sprite[] = []
        private midSegmentSprites: { sprite: Sprite, segmentIndex: number, position: number }[] = []

        constructor(segmentCount: number, segmentLength: number, thickness: number, lineColor: number, headSprite: Sprite, baseSprite: Sprite) {
            this.headSprite = headSprite
            this.baseSprite = baseSprite
            this.lineColor = lineColor
            this.thickness = thickness

            for (let i = 0; i < segmentCount; i++) {
                const segment = new Segment(segmentLength)
                this.segments.push(segment)
                this.totalLength += segmentLength
            }

            this.initializePositions()
        }

        private initializePositions() {
            if (!this.baseSprite || this.segments.length === 0) return

            const baseX = this.baseSprite.x
            const baseY = this.baseSprite.y
            const initialAngle = -Math.PI / 2

            let prevX = baseX
            let prevY = baseY

            for (let i = 0; i < this.segments.length; i++) {
                const segment = this.segments[i]
                segment.startX = prevX
                segment.startY = prevY
                segment.angle = initialAngle

                segment.endX = segment.startX + Math.cos(segment.angle) * segment.length
                segment.endY = segment.startY + Math.sin(segment.angle) * segment.length

                prevX = segment.endX
                prevY = segment.endY
            }
        }

        public addJointSprite(sprite: Sprite, jointIndex: number) {
            if (jointIndex < 0 || jointIndex > this.segments.length) {
                return
            }

            while (this.jointSprites.length <= jointIndex) {
                this.jointSprites.push(null)
            }

            this.jointSprites[jointIndex] = sprite
            this.updateJointSprite(jointIndex)
        }

        public addMidSegmentSprite(sprite: Sprite, segmentIndex: number, position: number) {
            if (segmentIndex < 0 || segmentIndex >= this.segments.length) {
                return
            }

            position = Math.max(0, Math.min(1, position))

            this.midSegmentSprites.push({
                sprite: sprite,
                segmentIndex: segmentIndex,
                position: position
            })

            this.updateMidSegmentSprite(this.midSegmentSprites.length - 1)
        }

        private updateJointSprite(jointIndex: number) {
            const sprite = this.jointSprites[jointIndex]
            if (!sprite) return

            let x: number, y: number

            if (jointIndex === 0) {
                x = this.baseSprite.x
                y = this.baseSprite.y
            } else if (jointIndex === this.segments.length) {
                const lastSegment = this.segments[this.segments.length - 1]
                x = lastSegment.endX
                y = lastSegment.endY
            } else {
                const segment = this.segments[jointIndex - 1]
                x = segment.endX
                y = segment.endY
            }

            sprite.x = x
            sprite.y = y
        }

        private updateMidSegmentSprite(index: number) {
            const spriteInfo = this.midSegmentSprites[index]
            if (!spriteInfo || !spriteInfo.sprite) return

            const segment = this.segments[spriteInfo.segmentIndex]
            const position = spriteInfo.position

            const x = segment.startX + (segment.endX - segment.startX) * position
            const y = segment.startY + (segment.endY - segment.startY) * position

            spriteInfo.sprite.x = x
            spriteInfo.sprite.y = y
        }

        public update() {
            if (!this.headSprite || !this.baseSprite || this.segments.length === 0) return

            const targetX = this.headSprite.x
            const targetY = this.headSprite.y
            const baseX = this.baseSprite.x
            const baseY = this.baseSprite.y

            const distanceToTarget = Math.sqrt(
                (targetX - baseX) * (targetX - baseX) +
                (targetY - baseY) * (targetY - baseY)
            )

            const iterations = 10

            if (distanceToTarget > this.totalLength) {
                const angle = Math.atan2(targetY - baseY, targetX - baseX)

                let currentX = baseX
                let currentY = baseY

                for (let i = 0; i < this.segments.length; i++) {
                    const segment = this.segments[i]
                    segment.startX = currentX
                    segment.startY = currentY
                    segment.angle = angle

                    segment.endX = segment.startX + Math.cos(angle) * segment.length
                    segment.endY = segment.startY + Math.sin(angle) * segment.length

                    currentX = segment.endX
                    currentY = segment.endY
                }
            } else {
                for (let iteration = 0; iteration < iterations; iteration++) {
                    this.segments[this.segments.length - 1].endX = targetX
                    this.segments[this.segments.length - 1].endY = targetY

                    for (let i = this.segments.length - 1; i >= 0; i--) {
                        const segment = this.segments[i]

                        if (i < this.segments.length - 1) {
                            segment.endX = this.segments[i + 1].startX
                            segment.endY = this.segments[i + 1].startY
                        }

                        const dx = segment.endX - segment.startX
                        const dy = segment.endY - segment.startY
                        const currentLength = Math.sqrt(dx * dx + dy * dy)

                        if (currentLength > 0) {
                            const ratio = segment.length / currentLength
                            segment.startX = segment.endX - dx * ratio
                            segment.startY = segment.endY - dy * ratio
                        }

                        if (i > 0) {
                            this.segments[i - 1].endX = segment.startX
                            this.segments[i - 1].endY = segment.startY
                        }
                    }

                    this.segments[0].startX = baseX
                    this.segments[0].startY = baseY

                    for (let i = 0; i < this.segments.length; i++) {
                        const segment = this.segments[i]

                        if (i > 0) {
                            segment.startX = this.segments[i - 1].endX
                            segment.startY = this.segments[i - 1].endY
                        }

                        const dx = segment.endX - segment.startX
                        const dy = segment.endY - segment.startY
                        const currentLength = Math.sqrt(dx * dx + dy * dy)

                        if (currentLength > 0) {
                            const ratio = segment.length / currentLength
                            segment.endX = segment.startX + dx * ratio
                            segment.endY = segment.startY + dy * ratio
                        }

                        segment.angle = Math.atan2(segment.endY - segment.startY, segment.endX - segment.startX)

                        if (i < this.segments.length - 1) {
                            this.segments[i + 1].startX = segment.endX
                            this.segments[i + 1].startY = segment.endY
                        }
                    }
                }
            }

            const lastSegment = this.segments[this.segments.length - 1]
            this.headSprite.x = lastSegment.endX
            this.headSprite.y = lastSegment.endY

            for (let i = 0; i < this.jointSprites.length; i++) {
                this.updateJointSprite(i)
            }

            for (let i = 0; i < this.midSegmentSprites.length; i++) {
                this.updateMidSegmentSprite(i)
            }

            if (this.shouldDraw) {
                this.draw()
            }
        }

        private draw() {
            this.drawToImage(scene.backgroundImage())
        }

        public drawToImage(drawTarget: Image) {
            for (let i = 0; i < this.segments.length; i++) {
                const segment = this.segments[i]
                this.drawThickLineOnImage(
                    drawTarget,
                    segment.startX,
                    segment.startY,
                    segment.endX,
                    segment.endY,
                    this.thickness,
                    this.lineColor
                )
            }
        }

        public drawToSpriteImage(targetSprite: Sprite) {
            const drawTarget = targetSprite.image
            const spriteX = targetSprite.x - targetSprite.image.width / 2
            const spriteY = targetSprite.y - targetSprite.image.height / 2

            for (let i = 0; i < this.segments.length; i++) {
                const segment = this.segments[i]
                const x1 = segment.startX - spriteX
                const y1 = segment.startY - spriteY
                const x2 = segment.endX - spriteX
                const y2 = segment.endY - spriteY

                if (isLineInBoundsForIK(x1, y1, x2, y2, drawTarget.width, drawTarget.height)) {
                    this.drawThickLineOnImage(
                        drawTarget,
                        x1,
                        y1,
                        x2,
                        y2,
                        this.thickness,
                        this.lineColor
                    )
                }
            }
        }

        private drawThickLine(x1: number, y1: number, x2: number, y2: number, thickness: number, color: number) {
            this.drawThickLineOnImage(scene.backgroundImage(), x1, y1, x2, y2, thickness, color)
        }

        private drawThickLineOnImage(drawTarget: Image, x1: number, y1: number, x2: number, y2: number, thickness: number, color: number) {
            drawTarget.drawLine(x1, y1, x2, y2, color)

            if (thickness <= 1) return

            const angle = Math.atan2(y2 - y1, x2 - x1)
            const perpAngle = angle + Math.PI / 2
            const perpX = Math.cos(perpAngle)
            const perpY = Math.sin(perpAngle)

            const halfThickness = Math.floor(thickness / 2)
            for (let t = 1; t <= halfThickness; t++) {
                drawTarget.drawLine(
                    x1 + perpX * t,
                    y1 + perpY * t,
                    x2 + perpX * t,
                    y2 + perpY * t,
                    color
                )

                drawTarget.drawLine(
                    x1 - perpX * t,
                    y1 - perpY * t,
                    x2 - perpX * t,
                    y2 - perpY * t,
                    color
                )
            }
        }
    }

    class Segment {
        public startX: number = 0
        public startY: number = 0
        public endX: number = 0
        public endY: number = 0
        public angle: number = 0
        public length: number = 0

        constructor(length: number) {
            this.length = length
        }
    }

    let chains: IKChain[] = []

    function isLineInBoundsForIK(x1: number, y1: number, x2: number, y2: number, width: number, height: number): boolean {
        return !((x1 < 0 && x2 < 0) || (x1 >= width && x2 >= width) ||
            (y1 < 0 && y2 < 0) || (y1 >= height && y2 >= height))
    }

    //% block="create IK chain with $segments segments length $length thickness $thickness line color $color head $head base $base"
    //% segments.min=1 segments.max=20 segments.defl=3
    //% length.min=1 length.max=100 length.defl=20
    //% thickness.min=1 thickness.max=10 thickness.defl=2
    //% color.defl=1
    //% head.shadow=variables_get
    //% base.shadow=variables_get
    //% blockSetVariable=myIKChain
    //% group="Creation"
    export function createIKChain(segments: number, length: number, thickness: number, color: number, head: Sprite, base: Sprite): IKChain {
        const chain = new IKChain(segments, length, thickness, color, head, base)
        chains.push(chain)
        return chain
    }

    //% block="add $sprite at joint $jointIndex on $chain"
    //% sprite.shadow=variables_get
    //% jointIndex.min=0 jointIndex.max=20 jointIndex.defl=1
    //% chain.shadow=variables_get
    //% group="Modify"
    export function addJointSpriteToChain(chain: IKChain, sprite: Sprite, jointIndex: number) {
        chain.addJointSprite(sprite, jointIndex)
    }

    //% block="add $sprite along segment $segmentIndex at position $position on $chain"
    //% sprite.shadow=variables_get
    //% segmentIndex.min=0 segmentIndex.max=19 segmentIndex.defl=0
    //% position.min=0 position.max=1 position.defl=0.5
    //% chain.shadow=variables_get
    //% group="Modify"
    export function addMidSegmentSpriteToChain(chain: IKChain, sprite: Sprite, segmentIndex: number, position: number) {
        chain.addMidSegmentSprite(sprite, segmentIndex, position)
    }

    //% block="set $chain line color to $color"
    //% chain.shadow=variables_get
    //% color.defl=1
    //% group="Modify"
    export function setChainLineColor(chain: IKChain, color: number) {
        chain.lineColor = color
    }

    //% block="set $chain thickness to $thickness"
    //% chain.shadow=variables_get
    //% thickness.min=1 thickness.max=10 thickness.defl=2
    //% group="Modify"
    export function setChainThickness(chain: IKChain, thickness: number) {
        chain.thickness = thickness
    }

    //% block="set $chain draw enabled to $enabled"
    //% chain.shadow=variables_get
    //% enabled.defl=true
    //% group="Modify"
    export function setChainDrawEnabled(chain: IKChain, enabled: boolean) {
        chain.shouldDraw = enabled
    }

    //% block="update $chain"
    //% chain.shadow=variables_get
    //% group="Update"
    export function updateIKChain(chain: IKChain) {
        chain.update()
    }

    //% block="update all IK chains"
    //% group="Update"
    export function updateAllIKChains() {
        for (const chain of chains) {
            chain.update()
        }
    }

    //% block="get segment count from $chain"
    //% chain.shadow=variables_get
    //% group="Query"
    export function getChainSegmentCount(chain: IKChain): number {
        return chain.segments.length
    }

    //% block="destroy $chain"
    //% chain.shadow=variables_get
    //% group="Creation"
    export function destroyIKChain(chain: IKChain) {
        chains.removeElement(chain)
    }

    //% block="render $chain on $drawTarget"
    //% chain.shadow=variables_get
    //% drawTarget.shadow=variables_get
    //% group="Update"
    export function renderIKChain(chain: IKChain, drawTarget: Image) {
        chain.drawToImage(drawTarget)
    }

    //% block="render all IK chains on $drawTarget"
    //% drawTarget.shadow=variables_get
    //% group="Update"
    export function renderAllIKChains(drawTarget: Image) {
        for (const chain of chains) {
            chain.drawToImage(drawTarget)
        }
    }

    //% block="render $chain on sprite $targetSprite"
    //% chain.shadow=variables_get
    //% targetSprite.shadow=variables_get
    //% group="Update"
    export function renderIKChainOnSprite(chain: IKChain, targetSprite: Sprite) {
        chain.drawToSpriteImage(targetSprite)
    }

    //% block="render all IK chains on sprite $targetSprite"
    //% targetSprite.shadow=variables_get
    //% group="Update"
    export function renderAllIKChainsOnSprite(targetSprite: Sprite) {
        let drawTarget = targetSprite.image
        let cameraX = scene.cameraProperty(CameraProperty.X)
        let cameraY = scene.cameraProperty(CameraProperty.Y)
        let spriteWorldX = cameraX - targetSprite.image.width / 2
        let spriteWorldY = cameraY - targetSprite.image.height / 2

        for (const chain of chains) {
            for (let i = 0; i < chain.segments.length; i++) {
                const segment = chain.segments[i]
                const x1 = segment.startX - spriteWorldX
                const y1 = segment.startY - spriteWorldY
                const x2 = segment.endX - spriteWorldX
                const y2 = segment.endY - spriteWorldY

                if (isLineInBoundsForIK(x1, y1, x2, y2, drawTarget.width, drawTarget.height)) {
                    drawThickLineOnImageForIK(
                        drawTarget,
                        x1,
                        y1,
                        x2,
                        y2,
                        chain.thickness,
                        chain.lineColor
                    )
                }
            }
        }
    }

    function drawThickLineOnImageForIK(drawTarget: Image, x1: number, y1: number, x2: number, y2: number, thickness: number, color: number) {
        drawTarget.drawLine(x1, y1, x2, y2, color)

        if (thickness <= 1) return

        const angle = Math.atan2(y2 - y1, x2 - x1)
        const perpAngle = angle + Math.PI / 2
        const perpX = Math.cos(perpAngle)
        const perpY = Math.sin(perpAngle)

        const halfThickness = Math.floor(thickness / 2)
        for (let t = 1; t <= halfThickness; t++) {
            drawTarget.drawLine(
                x1 + perpX * t,
                y1 + perpY * t,
                x2 + perpX * t,
                y2 + perpY * t,
                color
            )

            drawTarget.drawLine(
                x1 - perpX * t,
                y1 - perpY * t,
                x2 - perpX * t,
                y2 - perpY * t,
                color
            )
        }
    }
}

