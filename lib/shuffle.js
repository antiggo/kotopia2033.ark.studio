/**
 * @lib Shuffle - Character shuffling animation utilities
 * @ver 1.0.0
 * 
 * This library provides character shuffling animations for text elements.
 * The animation creates a "rolling" effect where characters randomly swap
 * before resolving to the final text, similar to a slot machine or
 * terminal decryption effect.
 */

/**
 * Creates a character shuffling animation for specified elements
 * 
 * HOW IT WORKS:
 * 1. Finds all elements matching the selector
 * 2. Stores original text and font properties
 * 3. On mouseenter, starts animation loop:
 *    - Replaces characters with random ones
 *    - Gradually resolves from one direction to original text
 *    - Preserves element dimensions during animation
 * 4. Optionally stops animation on mouseleave
 * 
 * ANIMATION DIRECTIONS:
 * - 'left-to-right': Characters resolve from left side first (Menu style)
 * - 'right-to-left': Characters resolve from right side first (Action style)
 * 
 * SIZING STRATEGIES:
 * - 'expand': Adds extra width to prevent text wrapping (Menu style)
 * - 'lock': Locks exact dimensions to prevent any size changes (Action style)
 * 
 * @param {Object} options - Configuration object
 * @param {string} options.selector - CSS selector for target elements
 * @param {string|number|function} options.swapsCount - Number of animation frames
 *   - 'auto': Uses smart defaults (20 for left-to-right, textLength+8 for right-to-left)
 *   - number: Fixed number of swaps
 *   - function: Callback that receives text length and returns swap count
 * @param {string} options.animationDirection - 'left-to-right' or 'right-to-left'
 * @param {string} options.sizingStrategy - 'expand' or 'lock'
 * @param {number} options.intervalSpeed - Animation speed in milliseconds (lower = faster)
 * @param {string} options.randomChars - Characters to use for random swapping
 * @param {boolean} options.enableMouseleave - Whether to stop animation on mouseleave
 * @param {boolean} options.storeOriginalText - Whether to store original text in element.originalText
 * 
 * @example
 * // Menu-style animation (expands width, left-to-right)
 * createCharacterShuffleAnimation({
 *     selector: '.Menu__text',
 *     animationDirection: 'left-to-right',
 *     sizingStrategy: 'expand',
 *     intervalSpeed: 40
 * })
 * 
 * @example
 * // Action-style animation (locks dimensions, right-to-left, with mouseleave)
 * createCharacterShuffleAnimation({
 *     selector: '.Action',
 *     animationDirection: 'right-to-left',
 *     sizingStrategy: 'lock',
 *     intervalSpeed: 30,
 *     enableMouseleave: true,
 *     storeOriginalText: true
 * })
 * 
 * @example
 * // Custom configuration
 * createCharacterShuffleAnimation({
 *     selector: '.custom-element',
 *     swapsCount: (textLength) => textLength * 2,
 *     animationDirection: 'left-to-right',
 *     sizingStrategy: 'expand',
 *     intervalSpeed: 50,
 *     randomChars: '01',
 *     enableMouseleave: false
 * })
 */
function createCharacterShuffleAnimation(options = {}) {
    const {
        selector,
        swapsCount = 'auto', // 'auto', number, or function(textLength)
        animationDirection = 'left-to-right', // 'left-to-right' or 'right-to-left'
        sizingStrategy = 'expand', // 'expand' or 'lock'
        intervalSpeed = 35,
        randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        enableMouseleave = false,
        storeOriginalText = false
    } = options

    const elements = document.querySelectorAll(selector)
    
    elements.forEach(element => {
        element.isAnimating = false
        element.animationInterval = null
        
        // Store original text if needed
        if (storeOriginalText) {
            element.originalText = element.textContent
        }
        
        // Store original font properties
        const originalFontFamily = window.getComputedStyle(element).fontFamily
        const originalFontSize = window.getComputedStyle(element).fontSize
        const originalFontWeight = window.getComputedStyle(element).fontWeight
        
        const startAnimation = () => {
            if (element.isAnimating) return
            
            const originalText = storeOriginalText ? element.originalText : element.textContent
            let swapsRemaining
            
            // Calculate swaps count
            if (swapsCount === 'auto') {
                swapsRemaining = animationDirection === 'left-to-right' ? 20 : originalText.length + 8
            } else if (typeof swapsCount === 'function') {
                swapsRemaining = swapsCount(originalText.length)
            } else {
                swapsRemaining = swapsCount
            }
            
            element.isAnimating = true
            element.classList.add('rolling-animation')
            
            // Preserve font properties
            element.style.fontFamily = originalFontFamily
            element.style.fontSize = originalFontSize
            element.style.fontWeight = originalFontWeight
            
            // Apply sizing strategy
            const originalWidth = element.offsetWidth
            const originalHeight = element.offsetHeight
            const originalDisplay = window.getComputedStyle(element).display
            
            if (sizingStrategy === 'expand') {
                // Menu-style: expand width to prevent wrapping
                const extraWidth = Math.max(20, originalWidth * 0.2)
                element.style.width = (originalWidth + extraWidth) + 'px'
                element.style.display = 'inline-block'
                element.style.whiteSpace = 'nowrap'
            } else if (sizingStrategy === 'lock') {
                // Action-style: lock all dimensions
                element.style.width = originalWidth + 'px'
                element.style.height = originalHeight + 'px'
                element.style.minWidth = originalWidth + 'px'
                element.style.maxWidth = originalWidth + 'px'
                element.style.minHeight = originalHeight + 'px'
                element.style.maxHeight = originalHeight + 'px'
                element.style.display = originalDisplay
                element.style.whiteSpace = 'nowrap'
                element.style.overflow = 'hidden'
                element.style.textAlign = 'center'
                element.style.boxSizing = 'border-box'
                element.style.alignItems = 'center'
                element.style.justifyContent = 'center'
            }
            
            element.animationInterval = setInterval(() => {
                let currentDisplayText = ''
                
                for (let i = 0; i < originalText.length; i++) {
                    let shouldShowRandom = false
                    
                    if (animationDirection === 'left-to-right') {
                        shouldShowRandom = i < swapsRemaining
                    } else { // right-to-left
                        shouldShowRandom = i >= originalText.length - swapsRemaining
                    }
                    
                    if (shouldShowRandom) {
                        const randomChar = randomChars.charAt(Math.floor(Math.random() * randomChars.length))
                        currentDisplayText += randomChar
                    } else {
                        currentDisplayText += originalText[i]
                    }
                }
                
                element.textContent = currentDisplayText
                swapsRemaining--
                
                if (swapsRemaining <= 0) {
                    clearInterval(element.animationInterval)
                    element.textContent = originalText
                    element.classList.remove('rolling-animation')
                    element.isAnimating = false
                    
                    // Reset all styles
                    element.style.fontFamily = ''
                    element.style.fontSize = ''
                    element.style.fontWeight = ''
                    element.style.width = ''
                    element.style.height = ''
                    element.style.minWidth = ''
                    element.style.maxWidth = ''
                    element.style.minHeight = ''
                    element.style.maxHeight = ''
                    element.style.display = ''
                    element.style.whiteSpace = ''
                    element.style.overflow = ''
                    element.style.textAlign = ''
                    element.style.alignItems = ''
                    element.style.justifyContent = ''
                    element.style.boxSizing = ''
                }
            }, intervalSpeed)
        }
        
        const stopAnimation = () => {
            if (element.animationInterval) {
                clearInterval(element.animationInterval)
                const originalText = storeOriginalText ? element.originalText : element.textContent
                element.textContent = originalText
                element.classList.remove('rolling-animation')
                element.isAnimating = false
                
                // Reset all styles
                element.style.fontFamily = ''
                element.style.fontSize = ''
                element.style.fontWeight = ''
                element.style.width = ''
                element.style.height = ''
                element.style.minWidth = ''
                element.style.maxWidth = ''
                element.style.minHeight = ''
                element.style.maxHeight = ''
                element.style.display = ''
                element.style.whiteSpace = ''
                element.style.overflow = ''
                element.style.textAlign = ''
                element.style.alignItems = ''
                element.style.justifyContent = ''
                element.style.boxSizing = ''
            }
        }
        
        // Add event listeners
        element.addEventListener('mouseenter', startAnimation)
        
        if (enableMouseleave) {
            element.addEventListener('mouseleave', stopAnimation)
        }
    })
}

// Utility function to manually trigger animation on a specific element
function triggerCharacterShuffleAnimation(element, options = {}) {
    const {
        swapsCount = 'auto',
        animationDirection = 'right-to-left',
        sizingStrategy = 'lock',
        intervalSpeed = 30,
        randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        storeOriginalText = false
    } = options

    if (element.isAnimating) return

    const originalText = storeOriginalText ? element.originalText || element.textContent : element.textContent
    let swapsRemaining

    // Calculate swaps count
    if (swapsCount === 'auto') {
        swapsRemaining = animationDirection === 'left-to-right' ? 20 : originalText.length + 8
    } else if (typeof swapsCount === 'function') {
        swapsRemaining = swapsCount(originalText.length)
    } else {
        swapsRemaining = swapsCount
    }

    element.isAnimating = true
    element.classList.add('rolling-animation')

    // Store original font properties
    const originalFontFamily = window.getComputedStyle(element).fontFamily
    const originalFontSize = window.getComputedStyle(element).fontSize
    const originalFontWeight = window.getComputedStyle(element).fontWeight
    const originalTextAlign = window.getComputedStyle(element).textAlign

    // Preserve font properties
    element.style.fontFamily = originalFontFamily
    element.style.fontSize = originalFontSize
    element.style.fontWeight = originalFontWeight

    // Apply sizing strategy
    const originalWidth = element.offsetWidth
    const originalHeight = element.offsetHeight
    const originalDisplay = window.getComputedStyle(element).display

    if (sizingStrategy === 'expand') {
        const extraWidth = Math.max(20, originalWidth * 0.2)
        element.style.width = (originalWidth + extraWidth) + 'px'
        element.style.display = 'inline-block'
        element.style.whiteSpace = 'nowrap'
    } else if (sizingStrategy === 'lock') {
        element.style.width = originalWidth + 'px'
        element.style.height = originalHeight + 'px'
        element.style.minWidth = originalWidth + 'px'
        element.style.maxWidth = originalWidth + 'px'
        element.style.minHeight = originalHeight + 'px'
        element.style.maxHeight = originalHeight + 'px'
        element.style.display = originalDisplay
        element.style.whiteSpace = 'nowrap'
        element.style.overflow = 'hidden'
        element.style.textAlign = originalTextAlign
        element.style.boxSizing = 'border-box'
    }

    element.animationInterval = setInterval(() => {
        let currentDisplayText = ''

        for (let i = 0; i < originalText.length; i++) {
            let shouldShowRandom = false

            if (animationDirection === 'left-to-right') {
                shouldShowRandom = i < swapsRemaining
            } else { // right-to-left
                shouldShowRandom = i >= originalText.length - swapsRemaining
            }

            if (shouldShowRandom) {
                const randomChar = randomChars.charAt(Math.floor(Math.random() * randomChars.length))
                currentDisplayText += randomChar
            } else {
                currentDisplayText += originalText[i]
            }
        }

        element.textContent = currentDisplayText
        swapsRemaining--

        if (swapsRemaining <= 0) {
            clearInterval(element.animationInterval)
            element.textContent = originalText
            element.classList.remove('rolling-animation')
            element.isAnimating = false

            // Reset all styles
            element.style.fontFamily = ''
            element.style.fontSize = ''
            element.style.fontWeight = ''
            element.style.width = ''
            element.style.height = ''
            element.style.minWidth = ''
            element.style.maxWidth = ''
            element.style.minHeight = ''
            element.style.maxHeight = ''
            element.style.display = ''
            element.style.whiteSpace = ''
            element.style.overflow = ''
            element.style.textAlign = ''
            element.style.alignItems = ''
            element.style.justifyContent = ''
            element.style.boxSizing = ''
        }
    }, intervalSpeed)
}

/**
 * Creates letter-by-letter rolling animations for Japanese and Chinese text elements
 * 
 * HOW IT WORKS:
 * 1. Finds elements matching Japanese and Chinese selectors
 * 2. Splits text into individual character spans with width locking
 * 3. Animates each character individually with random rolling before resolving
 * 4. Automatically repeats animations at random intervals
 * 
 * FEATURES:
 * - Width locking to prevent layout shifts during animation
 * - Configurable timing for letter delays and roll speeds
 * - Auto-repeating animations with random intervals
 * - Support for both Japanese katakana and Chinese characters
 * - Manual control options for custom timing
 * 
 * @param {Object} options - Configuration object
 * @param {string} options.jpSelector - CSS selector for Japanese elements
 * @param {string} options.chSelector - CSS selector for Chinese elements
 * @param {string} options.jpClass - Class name to identify Japanese elements (alternative to selector matching)
 * @param {string} options.chClass - Class name to identify Chinese elements (alternative to selector matching)
 * @param {string} options.hideClass - Class suffix to exclude from selection (default: '_Hide')
 * @param {number} options.letterDelay - Delay between each letter animation in ms (default: 100)
 * @param {Array} options.rollsPerLetter - [min, max] rolls per letter (default: [6, 9])
 * @param {number} options.rollSpeed - Speed of character rolling in ms (default: 80)
 * @param {Array} options.repeatDelay - [min, max] delay between repeat animations in ms (default: [2000, 4000])
 * @param {boolean} options.autoStart - Whether to start animation immediately (default: true)
 * @param {boolean} options.enableWidthLocking - Whether to lock character widths (default: true)
 * @param {string} options.japaneseChars - Japanese character set for random rolling
 * @param {string} options.chineseChars - Chinese character set for random rolling
 * 
 * @example
 * // Basic usage for Data elements
 * createLetterByLetterAnimation({
 *     jpSelector: '.Data__jp',
 *     chSelector: '.Data__ch',
 *     jpClass: 'Data__jp'
 * })
 * 
 * @example
 * // Custom timing for Footer elements
 * createLetterByLetterAnimation({
 *     jpSelector: '.Footer__jp',
 *     chSelector: '.Footer__ch',
 *     jpClass: 'Footer__jp',
 *     letterDelay: 100,
 *     rollsPerLetter: [6, 9],
 *     rollSpeed: 80,
 *     repeatDelay: [2000, 4000]
 * })
 * 
 * @example
 * // Manual control
 * createLetterByLetterAnimation({
 *     jpSelector: '.CaseData__jp',
 *     chSelector: '.CaseData__ch',
 *     jpClass: 'CaseData__jp',
 *     autoStart: false // Manual control
 * })
 */
function createLetterByLetterAnimation(options = {}) {
    const {
        jpSelector,
        chSelector,
        jpClass = '',
        chClass = '',
        hideClass = '_Hide',
        letterDelay = 100,
        rollsPerLetter = [6, 9], // min and max rolls per letter
        rollSpeed = 80,
        repeatDelay = [2000, 4000], // min and max delay between repeats
        autoStart = true,
        enableWidthLocking = true,
        excludeHidden = false,
        japaneseChars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
        chineseChars = '信頼安全技術開発软件程序代码数据系统网络服务器客户端界面设计测试部署维护更新版本管理'
    } = options

    // Get elements and filter out hidden ones if needed
    let jpElements = jpSelector ? Array.from(document.querySelectorAll(jpSelector)) : []
    let chElements = chSelector ? Array.from(document.querySelectorAll(chSelector)) : []
    
    if (excludeHidden) {
        jpElements = jpElements.filter(el => !el.classList.contains(jpClass + hideClass))
        chElements = chElements.filter(el => !el.classList.contains(chClass + hideClass))
    }
    
    const allElements = [...jpElements, ...chElements]

    allElements.forEach(element => {
        const originalText = element.textContent
        const isJapanese = jpClass ? element.classList.contains(jpClass) : jpSelector && element.matches(jpSelector)
        const randomChars = isJapanese ? japaneseChars : chineseChars

        // Split text into individual letters
        element.innerHTML = ''
        const letterSpans = []

        for (let i = 0; i < originalText.length; i++) {
            const span = document.createElement('span')
            span.textContent = originalText[i]
            span.style.display = 'inline-block'
            
            if (enableWidthLocking) {
                span.style.width = 'auto'
            }
            
            element.appendChild(span)
            letterSpans.push(span)

            // Measure and lock width to prevent layout shifts
            if (enableWidthLocking) {
                setTimeout(() => {
                    const charWidth = span.offsetWidth
                    span.style.width = charWidth + 'px'
                    span.style.textAlign = 'center'
                }, 10)
            }
        }

        // Animation function for all letters
        function animateLetters() {
            letterSpans.forEach((span, index) => {
                const targetLetter = originalText[index]
                let rollCount = 0
                const maxRolls = rollsPerLetter[0] + Math.floor(Math.random() * (rollsPerLetter[1] - rollsPerLetter[0] + 1))

                setTimeout(() => {
                    span.classList.add('rolling-animation')

                    const letterInterval = setInterval(() => {
                        if (rollCount < maxRolls) {
                            // Show random character
                            const randomChar = randomChars.charAt(Math.floor(Math.random() * randomChars.length))
                            span.textContent = randomChar
                            rollCount++
                        } else {
                            // Show final character
                            span.textContent = targetLetter
                            span.classList.remove('rolling-animation')
                            clearInterval(letterInterval)
                        }
                    }, rollSpeed)
                }, index * letterDelay)
            })
        }

        // Repeating animation scheduler
        function scheduleNextAnimation() {
            const randomDelay = repeatDelay[0] + Math.random() * (repeatDelay[1] - repeatDelay[0])
            setTimeout(() => {
                animateLetters()
                scheduleNextAnimation() // Schedule the next one
            }, randomDelay)
        }

        if (autoStart) {
            // Start initial animation
            animateLetters()

            // Schedule repeating animations
            // Wait for initial animation to finish
            const maxInitialDelay = letterSpans.length * letterDelay + rollsPerLetter[1] * rollSpeed
            setTimeout(() => {
                scheduleNextAnimation()
            }, maxInitialDelay + 500) // Add 500ms buffer
        }

        // Return control functions for manual control
        return {
            animateLetters,
            scheduleNextAnimation,
            element
        }
    })
}

// Make it available globally
if (typeof window !== 'undefined') {
    window.createCharacterShuffleAnimation = createCharacterShuffleAnimation
    window.triggerCharacterShuffleAnimation = triggerCharacterShuffleAnimation
    window.createLetterByLetterAnimation = createLetterByLetterAnimation
}

// For Node.js compatibility (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createCharacterShuffleAnimation }
}
