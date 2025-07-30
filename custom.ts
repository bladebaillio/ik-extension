//% weight=100 color=#0050bb icon="\uf256"
//% block="IK"
namespace ikchain {
    export class IKChain {
        public segments: Segment[] = [];
        private headSprite: Sprite;
        private baseSprite: Sprite;
        private totalLength: number = 0;
        private thickness: number = 2;
        private color: number = 1;
        private jointSprites: Sprite[] = [];
        private midSegmentSprites: { sprite: Sprite, segmentIndex: number, position: number }[] = [];

        constructor(segmentCount: number, segmentLength: number, color: number, thickness: number, headSprite: Sprite, baseSprite: Sprite) {
            this.headSprite = headSprite;
            this.baseSprite = baseSprite;
            this.color = color;
            this.thickness = thickness;

            for (let i = 0; i < segmentCount; i++) {
                const segment = new Segment(segmentLength);
                this.segments.push(segment);
                this.totalLength += segmentLength;
            }

            this.initializePositions();
        }

        private initializePositions() {
            if (!this.baseSprite || this.segments.length === 0) return;

            const baseX = this.baseSprite.x;
            const baseY = this.baseSprite.y;
            const initialAngle = -Math.PI / 2;

            let prevX = baseX;
            let prevY = baseY;

            for (let i = 0; i < this.segments.length; i++) {
                const segment = this.segments[i];
                segment.startX = prevX;
                segment.startY = prevY;
                segment.angle = initialAngle;

                segment.endX = segment.startX + Math.cos(segment.angle) * segment.length;
                segment.endY = segment.startY + Math.sin(segment.angle) * segment.length;

                prevX = segment.endX;
                prevY = segment.endY;
            }
        }

        public addJointSprite(sprite: Sprite, jointIndex: number) {
            if (jointIndex < 0 || jointIndex > this.segments.length) {
                return;
            }

            while (this.jointSprites.length <= jointIndex) {
                this.jointSprites.push(null);
            }

            this.jointSprites[jointIndex] = sprite;
            this.updateJointSprite(jointIndex);
        }

        public addMidSegmentSprite(sprite: Sprite, segmentIndex: number, position: number) {
            if (segmentIndex < 0 || segmentIndex >= this.segments.length) {
                return;
            }

            position = Math.max(0, Math.min(1, position));

            this.midSegmentSprites.push({
                sprite: sprite,
                segmentIndex: segmentIndex,
                position: position
            });

            this.updateMidSegmentSprite(this.midSegmentSprites.length - 1);
        }

        private updateJointSprite(jointIndex: number) {
            const sprite = this.jointSprites[jointIndex];
            if (!sprite) return;

            let x: number, y: number;

            if (jointIndex === 0) {
                x = this.baseSprite.x;
                y = this.baseSprite.y;
            } else if (jointIndex === this.segments.length) {
                const lastSegment = this.segments[this.segments.length - 1];
                x = lastSegment.endX;
                y = lastSegment.endY;
            } else {
                const segment = this.segments[jointIndex - 1];
                x = segment.endX;
                y = segment.endY;
            }

            sprite.x = x;
            sprite.y = y;
        }

        private updateMidSegmentSprite(index: number) {
            const spriteInfo = this.midSegmentSprites[index];
            if (!spriteInfo || !spriteInfo.sprite) return;

            const segment = this.segments[spriteInfo.segmentIndex];
            const position = spriteInfo.position;

            const x = segment.startX + (segment.endX - segment.startX) * position;
            const y = segment.startY + (segment.endY - segment.startY) * position;

            spriteInfo.sprite.x = x;
            spriteInfo.sprite.y = y;
        }

        public update() {
            if (!this.headSprite || !this.baseSprite || this.segments.length === 0) return;

            const targetX = this.headSprite.x;
            const targetY = this.headSprite.y;
            const baseX = this.baseSprite.x;
            const baseY = this.baseSprite.y;

            const distanceToTarget = Math.sqrt(
                (targetX - baseX) * (targetX - baseX) +
                (targetY - baseY) * (targetY - baseY)
            );

            const iterations = 10;

            if (distanceToTarget > this.totalLength) {
                const angle = Math.atan2(targetY - baseY, targetX - baseX);

                let currentX = baseX;
                let currentY = baseY;

                for (let i = 0; i < this.segments.length; i++) {
                    const segment = this.segments[i];
                    segment.startX = currentX;
                    segment.startY = currentY;
                    segment.angle = angle;

                    segment.endX = segment.startX + Math.cos(angle) * segment.length;
                    segment.endY = segment.startY + Math.sin(angle) * segment.length;

                    currentX = segment.endX;
                    currentY = segment.endY;
                }
            } else {
                for (let iteration = 0; iteration < iterations; iteration++) {
                    this.segments[this.segments.length - 1].endX = targetX;
                    this.segments[this.segments.length - 1].endY = targetY;

                    for (let i = this.segments.length - 1; i >= 0; i--) {
                        const segment = this.segments[i];

                        if (i < this.segments.length - 1) {
                            segment.endX = this.segments[i + 1].startX;
                            segment.endY = this.segments[i + 1].startY;
                        }

                        const dx = segment.endX - segment.startX;
                        const dy = segment.endY - segment.startY;
                        const currentLength = Math.sqrt(dx * dx + dy * dy);

                        if (currentLength > 0) {
                            const ratio = segment.length / currentLength;
                            segment.startX = segment.endX - dx * ratio;
                            segment.startY = segment.endY - dy * ratio;
                        }

                        if (i > 0) {
                            this.segments[i - 1].endX = segment.startX;
                            this.segments[i - 1].endY = segment.startY;
                        }
                    }

                    this.segments[0].startX = baseX;
                    this.segments[0].startY = baseY;

                    for (let i = 0; i < this.segments.length; i++) {
                        const segment = this.segments[i];

                        if (i > 0) {
                            segment.startX = this.segments[i - 1].endX;
                            segment.startY = this.segments[i - 1].endY;
                        }

                        const dx = segment.endX - segment.startX;
                        const dy = segment.endY - segment.startY;
                        const currentLength = Math.sqrt(dx * dx + dy * dy);

                        if (currentLength > 0) {
                            const ratio = segment.length / currentLength;
                            segment.endX = segment.startX + dx * ratio;
                            segment.endY = segment.startY + dy * ratio;
                        }

                        segment.angle = Math.atan2(segment.endY - segment.startY, segment.endX - segment.startX);

                        if (i < this.segments.length - 1) {
                            this.segments[i + 1].startX = segment.endX;
                            this.segments[i + 1].startY = segment.endY;
                        }
                    }
                }
            }

            const lastSegment = this.segments[this.segments.length - 1];
            this.headSprite.x = lastSegment.endX;
            this.headSprite.y = lastSegment.endY;

            for (let i = 0; i < this.jointSprites.length; i++) {
                this.updateJointSprite(i);
            }

            for (let i = 0; i < this.midSegmentSprites.length; i++) {
                this.updateMidSegmentSprite(i);
            }

            this.draw();
        }

        private draw() {
            for (let i = 0; i < this.segments.length; i++) {
                const segment = this.segments[i];
                this.drawThickLine(
                    segment.startX,
                    segment.startY,
                    segment.endX,
                    segment.endY,
                    this.thickness,
                    this.color
                );
            }
        }

        private drawThickLine(x1: number, y1: number, x2: number, y2: number, thickness: number, color: number) {
            scene.backgroundImage().drawLine(x1, y1, x2, y2, color);

            if (thickness <= 1) return;

            const angle = Math.atan2(y2 - y1, x2 - x1);
            const perpAngle = angle + Math.PI / 2;
            const perpX = Math.cos(perpAngle);
            const perpY = Math.sin(perpAngle);

            const halfThickness = Math.floor(thickness / 2);
            for (let t = 1; t <= halfThickness; t++) {
                scene.backgroundImage().drawLine(
                    x1 + perpX * t,
                    y1 + perpY * t,
                    x2 + perpX * t,
                    y2 + perpY * t,
                    color
                );

                scene.backgroundImage().drawLine(
                    x1 - perpX * t,
                    y1 - perpY * t,
                    x2 - perpX * t,
                    y2 - perpY * t,
                    color
                );
            }
        }
    }

    class Segment {
        public startX: number = 0;
        public startY: number = 0;
        public endX: number = 0;
        public endY: number = 0;
        public angle: number = 0;
        public length: number = 0;

        constructor(length: number) {
            this.length = length;
        }
    }

    let chains: IKChain[] = [];

    //% block="make IK chain with $segments segments with length of $length with color $color with thickness $thickness with $head as head and $base as base"
    //% segments.min=1 segments.max=20 segments.defl=3
    //% length.min=1 length.max=100 length.defl=20
    //% color.min=1 color.max=15 color.defl=1
    //% thickness.min=1 thickness.max=10 thickness.defl=2
    //% head.shadow=variables_get
    //% base.shadow=variables_get
    //% weight=100
    export function createIKChain(segments: number, length: number, color: number, thickness: number, head: Sprite, base: Sprite): IKChain {
        const chain = new IKChain(segments, length, color, thickness, head, base);
        chains.push(chain);
        return chain;
    }

    //% block="add $sprite at joint $jointIndex on $chain"
    //% sprite.shadow=variables_get
    //% jointIndex.min=0 jointIndex.max=20 jointIndex.defl=1
    //% chain.shadow=variables_get
    //% weight=95
    export function addJointSprite(chain: IKChain, sprite: Sprite, jointIndex: number) {
        chain.addJointSprite(sprite, jointIndex);
    }

    //% block="add $sprite along segment $segmentIndex at position $position on $chain"
    //% sprite.shadow=variables_get
    //% segmentIndex.min=0 segmentIndex.max=19 segmentIndex.defl=0
    //% position.min=0 position.max=1 position.defl=0.5
    //% chain.shadow=variables_get
    //% weight=90
    export function addMidSegmentSprite(chain: IKChain, sprite: Sprite, segmentIndex: number, position: number) {
        chain.addMidSegmentSprite(sprite, segmentIndex, position);
    }

    //% block="update all IK chains"
    //% weight=85
    export function updateAllChains() {
        for (const chain of chains) {
            chain.update();
        }
    }

    //% block="update $chain"
    //% chain.shadow=variables_get
    //% weight=80
    export function updateChain(chain: IKChain) {
        chain.update();
    }

    //% block="get segment $segmentIndex from $chain"
    //% segmentIndex.min=0 segmentIndex.max=19 segmentIndex.defl=0
    //% chain.shadow=variables_get
    //% weight=75
    //% block="get startX of segment $segmentIndex from $chain"
    export function getSegmentStartX(chain: IKChain, segmentIndex: number): number {
        if (segmentIndex < 0 || segmentIndex >= chain.segments.length) {
            return 0;
        }
        return chain.segments[segmentIndex].startX;
    }
}
