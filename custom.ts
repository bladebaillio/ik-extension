/**
 * Inverse Kinematics Chain Extension for MakeCode Arcade
 */

//% weight=100 color=#0050bb icon="\uf256"
//% block="IK"
namespace ikchain {
    export class IKChain {
        private segments: Segment[] = [];
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

            // Create segments
            for (let i = 0; i < segmentCount; i++) {
                const segment = new Segment(segmentLength);
                this.segments.push(segment);
                this.totalLength += segmentLength;
            }

            // Initialize positions
            this.initializePositions();
        }

        /**
         * Initialize segment positions in a straight line from base
         */
        private initializePositions() {
            if (!this.baseSprite || this.segments.length === 0) return;

            const baseX = this.baseSprite.x;
            const baseY = this.baseSprite.y;

            // Initial angle (pointing upward)
            const initialAngle = -Math.PI / 2;

            let prevX = baseX;
            let prevY = baseY;

            for (let i = 0; i < this.segments.length; i++) {
                const segment = this.segments[i];
                segment.startX = prevX;
                segment.startY = prevY;
                segment.angle = initialAngle;

                // Calculate end point
                segment.endX = segment.startX + Math.cos(segment.angle) * segment.length;
                segment.endY = segment.startY + Math.sin(segment.angle) * segment.length;

                prevX = segment.endX;
                prevY = segment.endY;
            }
        }

        /**
         * Add a sprite at a joint (kink) between segments
         * @param sprite The sprite to add at the joint
         * @param jointIndex The index of the joint (0 = base, 1 = after first segment, etc.)
         */
        public addJointSprite(sprite: Sprite, jointIndex: number) {
            if (jointIndex < 0 || jointIndex > this.segments.length) {
                return; // Invalid joint index
            }

            // Resize array if needed
            while (this.jointSprites.length <= jointIndex) {
                this.jointSprites.push(null);
            }

            this.jointSprites[jointIndex] = sprite;

            // Position the sprite immediately
            this.updateJointSprite(jointIndex);
        }

        /**
         * Add a sprite between segments (along a segment)
         * @param sprite The sprite to add along the segment
         * @param segmentIndex The index of the segment (0 = first segment, etc.)
         * @param position The position along the segment (0.0 = start, 1.0 = end)
         */
        public addMidSegmentSprite(sprite: Sprite, segmentIndex: number, position: number) {
            if (segmentIndex < 0 || segmentIndex >= this.segments.length) {
                return; // Invalid segment index
            }

            // Clamp position between 0 and 1
            position = Math.max(0, Math.min(1, position));

            this.midSegmentSprites.push({
                sprite: sprite,
                segmentIndex: segmentIndex,
                position: position
            });

            // Position the sprite immediately
            this.updateMidSegmentSprite(this.midSegmentSprites.length - 1);
        }

        /**
         * Update the position of a joint sprite
         * @param jointIndex The index of the joint
         */
        private updateJointSprite(jointIndex: number) {
            const sprite = this.jointSprites[jointIndex];
            if (!sprite) return;

            let x: number, y: number;

            if (jointIndex === 0) {
                // Base joint
                x = this.baseSprite.x;
                y = this.baseSprite.y;
            } else if (jointIndex === this.segments.length) {
                // End effector joint
                const lastSegment = this.segments[this.segments.length - 1];
                x = lastSegment.endX;
                y = lastSegment.endY;
            } else {
                // Middle joint
                const segment = this.segments[jointIndex - 1];
                x = segment.endX;
                y = segment.endY;
            }

            sprite.x = x;
            sprite.y = y;
        }

        /**
         * Update the position of a mid-segment sprite
         * @param index The index in the midSegmentSprites array
         */
        private updateMidSegmentSprite(index: number) {
            const spriteInfo = this.midSegmentSprites[index];
            if (!spriteInfo || !spriteInfo.sprite) return;

            const segment = this.segments[spriteInfo.segmentIndex];
            const position = spriteInfo.position;

            // Interpolate position along the segment
            const x = segment.startX + (segment.endX - segment.startX) * position;
            const y = segment.startY + (segment.endY - segment.startY) * position;

            spriteInfo.sprite.x = x;
            spriteInfo.sprite.y = y;
        }

        /**
         * Update the chain using inverse kinematics (FABRIK algorithm)
         */
        public update() {
            if (!this.headSprite || !this.baseSprite || this.segments.length === 0) return;

            const targetX = this.headSprite.x;
            const targetY = this.headSprite.y;
            const baseX = this.baseSprite.x;
            const baseY = this.baseSprite.y;

            // Check if target is reachable
            const distanceToTarget = Math.sqrt(
                (targetX - baseX) * (targetX - baseX) +
                (targetY - baseY) * (targetY - baseY)
            );

            // FABRIK algorithm iterations
            const iterations = 10; // More iterations = more accurate

            if (distanceToTarget > this.totalLength) {
                // Target is too far, just stretch in that direction
                const angle = Math.atan2(targetY - baseY, targetX - baseX);

                let currentX = baseX;
                let currentY = baseY;

                for (let i = 0; i < this.segments.length; i++) {
                    const segment = this.segments[i];
                    segment.startX = currentX;
                    segment.startY = currentY;
                    segment.angle = angle;

                    // Calculate end point
                    segment.endX = segment.startX + Math.cos(angle) * segment.length;
                    segment.endY = segment.startY + Math.sin(angle) * segment.length;

                    currentX = segment.endX;
                    currentY = segment.endY;
                }
            } else {
                // Target is reachable, use FABRIK
                for (let iteration = 0; iteration < iterations; iteration++) {
                    // FORWARD REACHING
                    // Set the end effector (last segment end) to target position
                    this.segments[this.segments.length - 1].endX = targetX;
                    this.segments[this.segments.length - 1].endY = targetY;

                    // Work backwards from the end effector to the base
                    for (let i = this.segments.length - 1; i >= 0; i--) {
                        const segment = this.segments[i];

                        // If not the last segment, set the current segment's end to the next segment's start
                        if (i < this.segments.length - 1) {
                            segment.endX = this.segments[i + 1].startX;
                            segment.endY = this.segments[i + 1].startY;
                        }

                        // Adjust the start point to maintain segment length
                        const dx = segment.endX - segment.startX;
                        const dy = segment.endY - segment.startY;
                        const currentLength = Math.sqrt(dx * dx + dy * dy);

                        if (currentLength > 0) {
                            const ratio = segment.length / currentLength;
                            segment.startX = segment.endX - dx * ratio;
                            segment.startY = segment.endY - dy * ratio;
                        }

                        // If not the first segment, update the previous segment's end position
                        if (i > 0) {
                            this.segments[i - 1].endX = segment.startX;
                            this.segments[i - 1].endY = segment.startY;
                        }
                    }

                    // BACKWARD REACHING
                    // Fix the base position
                    this.segments[0].startX = baseX;
                    this.segments[0].startY = baseY;

                    // Work forwards from the base to the end effector
                    for (let i = 0; i < this.segments.length; i++) {
                        const segment = this.segments[i];

                        // If not the first segment, set the current segment's start to the previous segment's end
                        if (i > 0) {
                            segment.startX = this.segments[i - 1].endX;
                            segment.startY = this.segments[i - 1].endY;
                        }

                        // Adjust the end point to maintain segment length
                        const dx = segment.endX - segment.startX;
                        const dy = segment.endY - segment.startY;
                        const currentLength = Math.sqrt(dx * dx + dy * dy);

                        if (currentLength > 0) {
                            const ratio = segment.length / currentLength;
                            segment.endX = segment.startX + dx * ratio;
                            segment.endY = segment.startY + dy * ratio;
                        }

                        // Update segment angle
                        segment.angle = Math.atan2(segment.endY - segment.startY, segment.endX - segment.startX);

                        // If not the last segment, update the next segment's start position
                        if (i < this.segments.length - 1) {
                            this.segments[i + 1].startX = segment.endX;
                            this.segments[i + 1].startY = segment.endY;
                        }
                    }
                }
            }

            // Update head sprite position to match end of last segment
            const lastSegment = this.segments[this.segments.length - 1];
            this.headSprite.x = lastSegment.endX;
            this.headSprite.y = lastSegment.endY;

            // Update all joint sprites
            for (let i = 0; i < this.jointSprites.length; i++) {
                this.updateJointSprite(i);
            }

            // Update all mid-segment sprites
            for (let i = 0; i < this.midSegmentSprites.length; i++) {
                this.updateMidSegmentSprite(i);
            }

            // Draw the chain
            this.draw();
        }

        /**
         * Draw the chain on the screen
         */
        private draw() {
            for (let i = 0; i < this.segments.length; i++) {
                const segment = this.segments[i];

                // Draw thick line on the screen
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

        /**
         * Draw a thick line by drawing multiple parallel lines
         */
        private drawThickLine(x1: number, y1: number, x2: number, y2: number, thickness: number, color: number) {
            // Draw the main line
            scene.backgroundImage().drawLine(x1, y1, x2, y2, color);

            if (thickness <= 1) return;

            // Calculate perpendicular direction for thickness
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const perpAngle = angle + Math.PI / 2;
            const perpX = Math.cos(perpAngle);
            const perpY = Math.sin(perpAngle);

            // Draw additional lines for thickness
            const halfThickness = Math.floor(thickness / 2);
            for (let t = 1; t <= halfThickness; t++) {
                // Draw line above
                scene.backgroundImage().drawLine(
                    x1 + perpX * t,
                    y1 + perpY * t,
                    x2 + perpX * t,
                    y2 + perpY * t,
                    color
                );

                // Draw line below
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
    /**
     * Create an inverse kinematics chain
     * @param segments Number of segments in the chain
     * @param length Length of each segment
     * @param color Color of the chain segments
     * @param thickness Thickness of the chain segments
     * @param head Sprite to use as the head of the chain
     * @param base Sprite to use as the base of the chain
     */
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

    /**
     * Add a sprite at a joint (kink) between segments
     * @param chain The IK chain to add the sprite to
     * @param sprite The sprite to add at the joint
     * @param jointIndex The index of the joint (0 = base, 1 = after first segment, etc.)
     */
    //% block="add $sprite at joint $jointIndex on $chain"
    //% sprite.shadow=variables_get
    //% jointIndex.min=0 jointIndex.max=20 jointIndex.defl=1
    //% chain.shadow=variables_get
    //% weight=95
    export function addJointSprite(chain: IKChain, sprite: Sprite, jointIndex: number) {
        chain.addJointSprite(sprite, jointIndex);
    }

    /**
     * Add a sprite along a segment
     * @param chain The IK chain to add the sprite to
     * @param sprite The sprite to add along the segment
     * @param segmentIndex The index of the segment (0 = first segment, etc.)
     * @param position The position along the segment (0.0 = start, 1.0 = end)
     */
    //% block="add $sprite along segment $segmentIndex at position $position on $chain"
    //% sprite.shadow=variables_get
    //% segmentIndex.min=0 segmentIndex.max=19 segmentIndex.defl=0
    //% position.min=0 position.max=1 position.defl=0.5
    //% chain.shadow=variables_get
    //% weight=90
    export function addMidSegmentSprite(chain: IKChain, sprite: Sprite, segmentIndex: number, position: number) {
        chain.addMidSegmentSprite(sprite, segmentIndex, position);
    }

    /**
     * Update all IK chains
     */
    //% block="update all IK chains"
    //% weight=85
    export function updateAllChains() {
        for (const chain of chains) {
            chain.update();
        }
    }

    /**
     * Update a specific IK chain
     * @param chain The chain to update
     */
    //% block="update $chain"
    //% chain.shadow=variables_get
    //% weight=80
    export function updateChain(chain: IKChain) {
        chain.update();
    }
}

