/**
 * @lib MissEvent Расширение методов работы с DOM
 * @ver 0.8.0
 * @url github.yandex-team.ru/kovchiy/missevent
 */
;(function () {

var ua = navigator.userAgent

var opera = ua.toLowerCase().indexOf("op") > -1
var chrome = ua.indexOf('Chrome') > -1 && !opera
var explorer = ua.indexOf('MSIE') > -1
var firefox = ua.indexOf('Firefox') > -1
var safari = ua.indexOf("Safari") > -1 && !chrome

var mobile = ua.match(/Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i) !== null
var android = ua.match(/Android/i) !== null

var href = window.location.href
var qsIndex = href.indexOf('?')
var qs = {}

if (qsIndex !== -1) {
    href.substring(qsIndex + 1).split('&').forEach(function (pair) {
        pair = pair.split('=')
        qs[pair[0]] = pair[1] === undefined ? '' : decodeURIComponent(pair[1])
    })

}

window.MissEvent = {
    /**
     * If mobile platform
     */
    mobile: mobile,
    android: android,
    ios: !android,

    /**
     * Current browser
     */
    chrome: chrome,
    explorer: explorer,
    firefox: firefox,
    safari: safari,
    opera: opera,

    /**
     * query string
     */
    qs: function (key, value) {
        if (value === undefined && typeof key === 'string') {
            return qs[key]
        } else {

            if (typeof key === 'string') {
                qs[key] = value
            } else {
                for (var i in key) qs[i] = key[i]
            }

            qsString = ''
            for (var key in qs) {
                if (qs[key] !== undefined && qs[key] !== '') {
                    qsString +=  '&' + key + '=' + qs[key]
                }
            }
            history.pushState(qs, document.title, window.location.pathname + '?' + qsString.substr(1))
        }
    },

    /**
     * Finger tap
     * @event tap
     * @domNode target
     */
    tap: function (domNode) {
        if (domNode.missEventTap) {
            return
        } else {
            domNode.missEventTap = true
        }

        if (!MissEvent.mobile) {
            return domNode.addEventListener('click', function (e) {
                this.dispatchEvent(new Event('tap'))
            })
        }

        var didTouch = false
        var didMove = false

        domNode.addEventListener('touchstart', function () {
            didTouch = true
            didMove = false
        })
        domNode.addEventListener('touchmove', function () {
            didTouch = false
            didMove = true
        })
        domNode.addEventListener('touchend', function (e) {
            if (didTouch && !didMove) {
                this.dispatchEvent(new Event('tap'))
                e.preventDefault()
            }
        })
    },

    /**
     * Horizontal swipe
     * @event     swipe    {delta: number, elasticDelta: number}
     * @event     didswipe {delta: number, elasticDelta: number, isFast: boolean}
     *
     * @domNode   target
     * @direction string   'horizontal', 'vertical'
     */
    swipe: function (domNode, direction, conditionCallback, fastSwipeTimeout, fastSwipeOffset) {
        if (domNode.missEventSwipe) {
            return
        } else {
            domNode.missEventSwipe = true
        }

        if (fastSwipeTimeout === undefined) fastSwipeTimeout = 500
        if (fastSwipeOffset === undefined) fastSwipeOffset = 15

        var didTouch = false
        var didFastSwipe = false
        var touchMoveDirection = ''
        var swipeTimeout = false
        var holdTime
        var elasticFactor = .2
        var fromX, fromY, toX, toY, deltaX, deltaY, delta, elasticDelta
        var willSwipe = false

        var parentWidth = domNode.offsetWidth
        var parentHeight = domNode.offsetHeight
        var parentOffsetLeft = domNode.offsetLeft
        var parentOffsetTop = domNode.offsetTop
        var parent = domNode

        while (parent = parent.offsetParent) {
            parentOffsetLeft += parent.offsetLeft
            parentOffsetTop += parent.offsetTop
        }

        domNode.addEventListener(MissEvent.mobile ? 'touchstart' : 'mousedown', function (e) {
            if (conditionCallback && !conditionCallback()) {
                return
            }

            didTouch = true
            fromX = e.touches ? e.touches[0].clientX : e.clientX
            fromY = e.touches ? e.touches[0].clientY : e.clientY
            delta = 0
            touchMoveDirection = ''
            holdTime = new Date
        })

        function move (e) {
            if (!didTouch) return

            holdTime = new Date

            toX = e.touches ? e.touches[0].clientX : e.clientX
            toY = e.touches ? e.touches[0].clientY : e.clientY

            deltaX = toX - fromX
            deltaY = toY - fromY

            if (touchMoveDirection === '') {
                touchMoveDirection = Math.abs(deltaX) < Math.abs(deltaY) ? 'vertical' : 'horizontal'
            }

            if (touchMoveDirection === direction) {
                e.preventDefault()

                if (willSwipe === false) {
                    willSwipe = true
                    domNode.dispatchEvent(
                        new CustomEvent('willswipe')
                    )
                }

                if (!swipeTimeout) {
                    didFastSwipe = true
                    swipeTimeout = setTimeout(function () {didFastSwipe = false}, fastSwipeTimeout)
                }

                delta = direction === 'horizontal' ?  deltaX : deltaY

                domNode.dispatchEvent(
                    new CustomEvent(
                        'swipe', {
                            detail: {
                                x: toX - parentOffsetLeft,
                                y: toY - parentOffsetTop,
                                delta: delta,
                                width: parentWidth,
                                height: parentHeight,
                                elasticFactor: elasticFactor
                            }
                        }
                    )
                )
            }
        }

        if (MissEvent.mobile) {
            domNode.addEventListener('touchmove', move)
        } else {
            window.addEventListener('mousemove', move)
        }

        function end (e) {
            if (!didTouch) return

            if (didTouch && !touchMoveDirection) {
                domNode.dispatchEvent(
                    new CustomEvent(
                         'swipefail', {
                            detail: {
                                x: fromX - parentOffsetLeft,
                                y: fromY - parentOffsetTop,
                                width: parentWidth,
                                height: parentHeight,
                            }
                        }
                    )
                )
            } else if (didTouch && touchMoveDirection === direction) {
                domNode.dispatchEvent(
                    new CustomEvent(
                         'didswipe', {
                            detail: {
                                x: toX - parentOffsetLeft,
                                y: toY - parentOffsetTop,
                                width: parentWidth,
                                height: parentHeight,
                                delta: delta,
                                elasticFactor: elasticFactor,
                                holdTime: new Date - holdTime,
                                isFast: didFastSwipe && Math.abs(delta) >= fastSwipeOffset,
                            }
                        }
                    )
                )
            }

            if (swipeTimeout) clearTimeout(swipeTimeout)

            didTouch = false
            didFastSwipe = false
            touchMoveDirection = false
            swipeTimeout = false
            willSwipe = false
        }

        if (MissEvent.mobile) {
            domNode.addEventListener('touchend', end)
        } else {
            window.addEventListener('mouseup', end)
        }
    },

    horizontalSwipe: function (domNode, conditionCallback, fastSwipeTimeout, fastSwipeOffset) {
        this.swipe(domNode, 'horizontal', conditionCallback, fastSwipeTimeout, fastSwipeOffset)
    },
    verticalSwipe: function (domNode, conditionCallback, fastSwipeTimeout, fastSwipeOffset) {
        this.swipe(domNode, 'vertical', conditionCallback, fastSwipeTimeout, fastSwipeOffset)
    },

    /**
     * Horizontal scroll visibility
     * @events visible, invisible
     * @domNode target
     * @parent container to scroll (window is default)
     */
    visible: function (domNode, conditionCallback, parent) {
        if (parent === undefined) {
            parent = window
        }

        var offsetTop = MissEvent.offset(domNode).top
        var offsetBottom = offsetTop + domNode.offsetHeight
        var visible

        function checkVisibility () {
            if (conditionCallback && !conditionCallback()) {
                if (visible !== false) {
                    domNode.dispatchEvent(new Event('invisible'))
                    visible = false
                }
                return
            }

            var scrollTop = (parent === window ? document.body : parent).scrollTop
            var scrollBottom = scrollTop + parent.innerHeight

            if (scrollBottom > offsetTop && scrollTop < offsetBottom) {
                if (visible !== true) {
                    domNode.dispatchEvent(new Event('visible'))
                    visible = true
                }
            } else {
                if (visible !== false) {
                    domNode.dispatchEvent(new Event('invisible'))
                    visible = false
                }
            }
        }

        parent.addEventListener('scroll', checkVisibility)
        checkVisibility()
    },

    offset: function (domNode) {
        if (domNode.offsetParent === null) {
            return undefined
        }

        var offsetTop = 0
        var offsetLeft = 0

        while (domNode.offsetParent !== null) {
            offsetTop += domNode.offsetTop
            offsetLeft += domNode.offsetLeft
            domNode = domNode.offsetParent
        }

        return {
            top: offsetTop,
            left: offsetLeft
        }
    },
}

})();
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

/**
 * Parallax Animation Helper
 * 
 * A reusable helper for creating scroll-based parallax effects with blur animations.
 * This file provides utilities for elements that move at different speeds relative
 * to scroll position and can blur out when approaching viewport edges.
 */

/**
 * Creates a parallax animation system with blur effects
 * 
 * @description
 * This function creates a scroll-based parallax system that can handle multiple element groups
 * with different speeds and blur effects. Elements move at different speeds relative to scroll
 * and can blur out when approaching the top of the viewport.
 * 
 * @param {Object} options - Configuration object
 * @param {Array<Object>} options.elementGroups - Array of element group configurations
 * @param {string} options.elementGroups[].selector - CSS selector for elements
 * @param {number} options.elementGroups[].parallaxSpeed - Parallax speed (0-1, where 1 = no parallax, 0 = maximum parallax)
 * @param {number} [options.elementGroups[].maxBlur=8] - Maximum blur amount in pixels
 * @param {number} [options.elementGroups[].blurTrigger=0.20] - Viewport percentage where blur starts (0-1)
 * @param {number} [options.elementGroups[].blurPoint=0.15] - Viewport percentage for blur calculation base (0-1)
 * @param {boolean} [options.elementGroups[].forceOpacity=false] - Force elements to be visible (opacity: 1)
 * @param {boolean} [options.autoStart=true] - Whether to start the parallax system automatically
 * @param {Function} [options.onUpdate] - Callback function called on each update
 * 
 * @returns {Object} Control object with start/stop methods
 * 
 * @example
 * // Basic usage with multiple element groups
 * createParallaxAnimation({
 *     elementGroups: [
 *         {
 *             selector: '.Data',
 *             parallaxSpeed: 0.7, // Slower parallax
 *             maxBlur: 8,
 *             blurTrigger: 0.20
 *         },
 *         {
 *             selector: '.Intro__logo .Logo',
 *             parallaxSpeed: 0.85, // Faster parallax
 *             maxBlur: 20,
 *             blurTrigger: 0.20,
 *             forceOpacity: true
 *         },
 *         {
 *             selector: '.Case__head',
 *             parallaxSpeed: 0.7,
 *             maxBlur: 8
 *         }
 *     ]
 * })
 * 
 * @example
 * // Single element group
 * createParallaxAnimation({
 *     elementGroups: [
 *         { 
 *             selector: '.Hero', 
 *             parallaxSpeed: 0.5,
 *             maxBlur: 12
 *         }
 *     ]
 * })
 * 
 * @example
 * // Manual control with callback
 * const parallax = createParallaxAnimation({
 *     elementGroups: [
 *         { selector: '.Background', parallaxSpeed: 0.3 }
 *     ],
 *     autoStart: false,
 *     onUpdate: (scrollInfo) => {
 *         // Handle scroll updates here
 *     }
 * })
 * 
 * // Start manually
 * parallax.start()
 * 
 * // Stop when needed
 * parallax.stop()
 * 
 * @example
 * // Grouped elements with same settings
 * createParallaxAnimation({
 *     elementGroups: [
 *         {
 *             selector: '.CaseMeta, .Divider_One',
 *             parallaxSpeed: 0.6,
 *             maxBlur: 8
 *         }
 *     ]
 * })
 */
function createParallaxAnimation(options = {}) {
    const {
        elementGroups = [],
        autoStart = true,
        onUpdate = null
    } = options
    
    let ticking = false
    let isActive = false
    
    function updateParallax() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const windowHeight = window.innerHeight
        
        // Process each element group
        elementGroups.forEach(group => {
            const {
                selector,
                parallaxSpeed = 0.7,
                maxBlur = 8,
                blurTrigger = 0.20,
                blurPoint = 0.15,
                forceOpacity = false
            } = group
            
            const elements = document.querySelectorAll(selector)
            
            elements.forEach(element => {
                // Force opacity if needed
                if (forceOpacity && element.style.opacity !== '1') {
                    element.style.opacity = '1'
                }
                
                // Calculate parallax position
                const yPos = -(scrollTop * (1 - parallaxSpeed))
                
                // Calculate blur based on element position relative to viewport
                const elementRect = element.getBoundingClientRect()
                const elementTop = elementRect.top
                const elementBottom = elementRect.bottom
                
                let blurAmount = 0
                
                // Blur when element approaches or exits the top of viewport
                if (elementTop < windowHeight * blurTrigger && elementBottom > 0) {
                    const triggerPoint = windowHeight * blurPoint
                    const distanceFromTrigger = Math.max(0, triggerPoint - elementTop)
                    const maxDistance = triggerPoint + elementRect.height
                    const exitProgress = distanceFromTrigger / maxDistance
                    blurAmount = Math.min(exitProgress * maxBlur, maxBlur)
                }
                
                // Apply styles
                element.style.willChange = 'transform, filter'
                element.style.transform = `translate3d(0, ${yPos}px, 0)`
                element.style.filter = `blur(${blurAmount}px)`
            })
        })
        
        // Call update callback if provided
        if (onUpdate) {
            onUpdate({
                scrollTop,
                windowHeight
            })
        }
        
        ticking = false
    }
    
    function requestParallaxUpdate() {
        if (!ticking && isActive) {
            requestAnimationFrame(updateParallax)
            ticking = true
        }
    }
    
    function start() {
        if (!isActive) {
            isActive = true
            window.addEventListener('scroll', requestParallaxUpdate)
            updateParallax() // Initial call
        }
    }
    
    function stop() {
        if (isActive) {
            isActive = false
            window.removeEventListener('scroll', requestParallaxUpdate)
        }
    }
    
    // Auto-start if enabled
    if (autoStart) {
        start()
    }
    
    return {
        start,
        stop,
        update: updateParallax
    }
}

/**
 * Creates a simple parallax effect without blur
 * 
 * @description
 * A simplified version of createParallaxAnimation that only handles parallax movement
 * without blur effects. Useful for backgrounds or simple moving elements.
 * 
 * @param {string} selector - CSS selector for elements
 * @param {number} speed - Parallax speed (0-1, where 1 = no parallax, 0 = maximum parallax)
 * @param {boolean} [autoStart=true] - Whether to start automatically
 * 
 * @returns {Object} Control object with start/stop methods
 * 
 * @example
 * // Simple background parallax
 * createSimpleParallax('.background-image', 0.5)
 * 
 * @example
 * // Manual control
 * const bgParallax = createSimpleParallax('.hero-bg', 0.3, false)
 * bgParallax.start()
 */
function createSimpleParallax(selector, speed = 0.7, autoStart = true) {
    return createParallaxAnimation({
        elementGroups: [
            {
                selector,
                parallaxSpeed: speed,
                maxBlur: 0, // No blur
                blurTrigger: 1.0 // Never trigger blur
            }
        ],
        autoStart
    })
}

// Make functions globally available
if (typeof window !== 'undefined') {
    window.createParallaxAnimation = createParallaxAnimation
    window.createSimpleParallax = createSimpleParallax
}

// For Node.js compatibility (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        createParallaxAnimation,
        createSimpleParallax
    }
}

/**
 * @lib Beast
 * @ver 0.39.4
 * @url github.com/arkconclave/beast
 */

'use strict';

;(function () {

if (typeof window !== 'undefined') {

    // Polyfill for window.CustomEvent in IE
    if (typeof window.CustomEvent !== 'function') {
        window.CustomEvent = function (event, params) {
            params = params || {bubbles: false, cancelable: false, detail: undefined}
            var e = document.createEvent('CustomEvent')
            e.initCustomEvent(event, params.bubbles, params.cancelable, params.detail)
            return e
        }
        window.CustomEvent.prototype = window.Event.prototype
    }

    window.Beast = {}
    document.addEventListener('DOMContentLoaded', function () {
        Beast.init()
    })

} else {
    global.Beast = {}
    module.exports = Beast
}

/*
 * Common vars
 */
var Declaration = {}                 // Declarations from Bease.decl()
var DeclarationFinished = false      // Flag turns true after the first Beast.node() call
var HttpRequestQueue = []            // Queue of required bml-files with link tag
var CssLinksToLoad = 0               // Num of <link rel="stylesheet"> in the <head>
var BeastIsReady = false             // If all styles and scripts are loaded
var OnBeastReadyCallbacks = []       // Functions to call when sources are ready
var ReStartBML = /<[a-z][^>]*\/?>/i  // matches start of BML substring
var ReDoubleQuote = /"/g             // matches "-symbols
var ReBackslash = /\\/g              // matches \-symbols
var ReLessThen = /</g                // matches <-symbols
var ReMoreThen = />/g                // matches >-symbols
var ReNL = /\n/g                     // matches \n-symbols
var ReCamelCase = /([a-z])([A-Z])/g  // matches camelCase pairs
var ReStylePairSplit = /:\s?/        // matches :-separation in style DOM-attribute

// Declaration properties that can't belong to user
var ReservedDeclarationProperies = {
    inherits:1,
    implementWith:1,
    expand:1,
    mod:1,
    mix:1,
    param:1,
    domInit:1,
    domAttr:1,
    on:1,
    onWin:1,
    onMod:1,
    onAttach:1,
    onRemove:1,
    tag:1,
    noElems:1,
    final:1,

    // 2 means not to inherit this field
    abstract:2,
    finalMod:2,
    __userMethods:2,
    __commonExpand:2,
    __flattenInherits:2,
    __finalMod:2,
    __elems:2,
    __isBlock:2,
}

// CSS-properties measured in px commonly
var CssPxProperty = {
    height:1,
    width:1,
    left:1,
    right:1,
    bottom:1,
    top:1,
    'line-height':1,
    'font-size':1,
}

// Single HTML-tags
var SingleTag = {
    area:1,
    base:1,
    br:1,
    col:1,
    command:1,
    embed:1,
    hr:1,
    img:1,
    input:1,
    keygen:1,
    link:1,
    meta:1,
    param:1,
    source:1,
    wbr:1,
}

// Text output helpers
function escapeDoubleQuotes (string) {
    return string.replace(ReBackslash, '\\\\').replace(ReDoubleQuote, '\\"').replace(ReNL, '\\n')
}
function escapeHtmlTags (string) {
    return string.replace(ReLessThen, '&lt;').replace(ReMoreThen, '&gt;')
}
function camelCaseToDash (string) {
    return string.replace(ReCamelCase, '$1-$2').toLowerCase()
}
function stringifyObject (ctx) {
    if (Array.isArray(ctx)) {
        var string = '['
        for (var i = 0, ii = ctx.length; i < ii; i++) {
            string += stringifyObject(ctx[i]) + ','
        }
        string = string.slice(0,-1)
        string += ']'
        return string
    }
    else if (typeof ctx === 'object') {
        var string = '{'
        for (var key in ctx) {
            if (ctx[key] !== undefined) {
                string += '"' + key + '":' + stringifyObject(ctx[key]) + ','
            }
        }
        if (string.length !== 1) {
            string = string.slice(0, -1)
        }
        string += '}'
        return string
    }
    else if (typeof ctx === 'string') {
        return '"' + escapeDoubleQuotes(ctx) + '"'
    }
    else if (typeof ctx === 'function' && ctx.beastDeclPath !== undefined) {
        return ctx.beastDeclPath
    }
    else {
        return ctx.toString()
    }
}
function objectIsEmpty (object) {
    for (var key in object) return false
    return true
}
function cloneObject (ctx) {
    if (Array.isArray(ctx)) {
        var array = []
        for (var i = 0, ii = ctx.length; i < ii; i++) {
            array.push(
                cloneObject(ctx[i])
            )
        }
        return array
    }
    else if (typeof ctx === 'object' && ctx !== null) {
        var object = {}
        for (var key in ctx) {
            object[key] = cloneObject(ctx[key])
        }
        return object
    }
    else {
        return ctx
    }
}

/**
 * Public Beast properties
 */
Beast.declaration = Declaration

/**
 * Initialize Beast
 */
Beast.init = function () {
    var links = document.getElementsByTagName('link')
    var bmlLinks = []

    for (var i = 0, ii = links.length; i < ii; i++) {
        var link = links[i]
        if (link.type === 'bml' || link.rel === 'bml') {
            RequireModule(link.href)
            bmlLinks.push(link)
        }
        if (link.rel === 'stylesheet') {
            CssLinksToLoad++
            link.onload = link.onerror = function () {
                CheckIfBeastIsReady()
            }
        }
    }

    for (var i = 0, ii = bmlLinks.length; i < ii; i++) {
        bmlLinks[i].parentNode.removeChild(bmlLinks[i])
    }

    CheckIfBeastIsReady()
}

/**
 * Require declaration script
 *
 * @url string Path to script file
 */
function RequireModule (url) {
    var xhr = new (XMLHttpRequest || ActiveXObject)('MSXML2.XMLHTTP.3.0')
    xhr.open('GET', url)
    xhr.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            CheckIfBeastIsReady()
        }
    }
    HttpRequestQueue.push(xhr)
    xhr.send()
}

/**
 * Checks if all <link> are loaded
 */
function CheckIfBeastIsReady () {
    if (BeastIsReady) return

    var isReady = true

    for (var i = 0, ii = HttpRequestQueue.length; i < ii; i++) {
        var xhr = HttpRequestQueue[i]
        if (xhr.readyState !== 4 || xhr.status !== 200) {
            isReady = false
        }
    }
    if (document.styleSheets.length < CssLinksToLoad) {
        isReady = false
    }

    if (isReady) {
        for (var i = 0, ii = HttpRequestQueue.length; i < ii; i++) {
            EvalBml(
                HttpRequestQueue[i].responseText
            )
        }
        HttpRequestQueue = []
        ProcessBmlScripts()

        BeastIsReady = true
        for (var i = 0, ii = OnBeastReadyCallbacks.length; i < ii; i++) {
            OnBeastReadyCallbacks[i]()
        }
    }
}

/**
 * Converts <script type="bml"/> tag to Beast::evalBml() method
 */
function ProcessBmlScripts () {
    var scripts = document.getElementsByTagName('script')

    for (var i = 0, ii = scripts.length; i < ii; i++) {
        var script = scripts[i]

        if (script === undefined) {
            continue
        }

        var text = script.text

        if (script.type === 'bml' && text !== '') {
            EvalBml(text)
        }
    }
}

/**
 * Parses and attaches declaration to <head>-node.
 * If there's only XML inside, appends node to document.body.
 *
 * @text string Text to parse and attach
 */
function EvalBml (text) {
    var rootNode = eval(Beast.parseBML(text))
    if (/^[\s\n]*</.test(text)) {
        rootNode.render(document.body)
    }
}

/**
 * Initialize DOM: assign DOM-nodes to BemNodes
 * @domNode DOMElement Node to start with
 */
Beast.domInit = function (domNode, isInnerCall, parentBemNode, parentBlock) {
    // No more Beast.decl() after the first Beast.domInit() call
    if (!DeclarationFinished) {
        DeclarationFinished = true
        CompileDeclarations()
    }

    if (domNode === undefined) {
        return false
    }
    // ELEMENT_NODE
    else if (domNode.nodeType === 1) {
        var nodeName = domNode.getAttribute('data-node-name')
        if (nodeName !== null) {

            // BemNode
            var bemNode = isInnerCall ? Beast.node(nodeName, {__context: parentBlock}) : Beast.node(nodeName)
            var stringToEval = ''
            var implementedNodeName = ''

            // Assign attributes
            for (var i = 0, ii = domNode.attributes.length, name, value; i < ii; i++) {
                name = domNode.attributes[i].name
                value = domNode.attributes[i].value

                // Parse style to css object
                if (name === 'style') {
                    var stylePairs = value.split(';')
                    for (var j = 0, jj = stylePairs.length, stylePair; j < jj; j++) {
                        stylePair = stylePairs[j].split(ReStylePairSplit)
                        bemNode.css(stylePair[0], stylePair[1])
                    }
                }
                // Restore encoded objects
                else if (name === 'data-event-handlers') {
                    stringToEval += ';bemNode._domNodeEventHandlers = ' + decodeURIComponent(value)
                }
                else if (name === 'data-window-event-handlers') {
                    stringToEval += ';bemNode._windowEventHandlers = ' + decodeURIComponent(value)
                }
                else if (name === 'data-mod-handlers') {
                    stringToEval += ';bemNode._modHandlers = ' + decodeURIComponent(value)
                }
                else if (name === 'data-dom-init-handlers') {
                    stringToEval += ';bemNode._domInitHandlers = ' + decodeURIComponent(value)
                }
                else if (name === 'data-mod') {
                    stringToEval += ';bemNode._mod = ' + decodeURIComponent(value)
                }
                else if (name === 'data-param') {
                    stringToEval += ';bemNode._param = ' + decodeURIComponent(value)
                }
                else if (name === 'data-implemented-node-name') {
                    implementedNodeName = value
                }
                else if (name === 'data-no-elems') {
                    bemNode._noElems = true
                }
                // Else _domAttr
                else if (name !== 'class') {
                    bemNode.domAttr(name, value)
                }
            }

            if (stringToEval !== '') {
                eval(stringToEval)
            }

            for (var key in bemNode._param) {
                if (bemNode._param[key].__isStringifiedBemNode === true) {
                    bemNode._param[key] = eval(bemNode._param[key].string)
                }
            }

            if (isInnerCall !== undefined) {
                var parentDomNode = parentBemNode._domNode
                parentBemNode._domNode = undefined

                if (implementedNodeName !== '') {
                    Beast.node(implementedNodeName, {__context:parentBlock})
                        .appendTo(parentBemNode)
                        .implementWith(bemNode, true)
                } else {
                    parentBemNode.append(bemNode)
                    if (parentBemNode._noElems === true) {
                        bemNode.parentBlock(parentBlock)
                    }
                }

                parentBemNode._domNode = parentDomNode
            }

            // Assign children
            for (var i = 0, ii = domNode.childNodes.length, childNode; i < ii; i++) {
                Beast.domInit(
                    domNode.childNodes[i],
                    true,
                    bemNode,
                    bemNode._noElems === true
                        ? bemNode._parentBlock._parentNode._parentBlock
                        : bemNode._parentBlock
                )
            }

            // Assign flags
            bemNode._renderedOnce = true
            bemNode._isExpanded = true

            // Crosslink
            bemNode._domNode = domNode
            domNode.bemNode = bemNode

            // Add event handlers
            if (bemNode._domNodeEventHandlers !== undefined) {
                for (var eventName in bemNode._domNodeEventHandlers) {
                    for (var i = 0, ii = bemNode._domNodeEventHandlers[eventName].length; i < ii; i++) {
                        bemNode.on(eventName, bemNode._domNodeEventHandlers[eventName][i], true, false, true)
                    }
                }
            }
            if (bemNode._windowEventHandlers !== undefined) {
                for (var eventName in bemNode._windowEventHandlers) {
                    for (var i = 0, ii = bemNode._windowEventHandlers[eventName].length; i < ii; i++) {
                        bemNode.onWin(eventName, bemNode._windowEventHandlers[eventName][i], true, false, true)
                    }
                }
            }

            if (isInnerCall === undefined) {
                function finalWalk (bemNode) {
                    for (var i = 0, ii = bemNode._children.length; i < ii; i++) {
                        if (bemNode._children[i] instanceof BemNode) {
                            finalWalk(bemNode._children[i])
                        }
                    }
                    for (var name in bemNode._mod) {
                        bemNode._callModHandlers(name, bemNode._mod[name])
                    }
                    bemNode._domInit()
                    bemNode._onAttach(true)
                }
                finalWalk(bemNode)
            }

            domNode.removeAttribute('data-event-handlers')
            domNode.removeAttribute('data-window-event-handlers')
            domNode.removeAttribute('data-mod-handlers')
            domNode.removeAttribute('data-mod')
            domNode.removeAttribute('data-param')
            domNode.removeAttribute('data-after-dom-init-handlers')
            domNode.removeAttribute('data-node-name')
            domNode.removeAttribute('data-implemented-node-name')
            domNode.removeAttribute('data-no-elems')

            return bemNode
        }
    }
    // TEXT_NODE
    else if (domNode.nodeType === 3) {
        parentBemNode.append(domNode.nodeValue)
        return domNode.nodeValue
    }

    return false
}

/**
 * Declaration standart fields:
 * - inherits       string|array Inherited declarations by selector
 * - expand         function     Expand instructions
 * - mod            object       Default modifiers
 * - noElems        object       If block can have elements
 * - param          object       Default parameters
 * - domInit        function     DOM inititial instructions
 * - on             object       Event handlers
 * - onWin          object       Window event hadnlers
 * - onMod          object       Modifier change actions
 * - tag            string       DOM tag name
 *
 * @selector string 'block' or 'block__elem'
 * @decl     object
 */
Beast.decl = function (selector, decl) {
    if (typeof selector === 'object') {
        for (var key in selector) {
            Beast.decl(key, selector[key])
        }
        return this
    } else {
        selector = selector.toLowerCase()
    }

    if (typeof decl.final === 'string') {
        decl.final = [decl.final]
    }

    if (typeof decl.inherits === 'string') {
        decl.inherits = [decl.inherits]
    }

    if (typeof decl.mix === 'string') {
        decl.mix = [decl.mix]
    }

    if (decl.inherits !== undefined) {
        for (var i = 0, ii = decl.inherits.length; i < ii; i++) {
            decl.inherits[i] = decl.inherits[i].toLowerCase()
        }
    }

    if (Declaration[selector] !== undefined) {
        extendDecl(decl, Declaration[selector])
    }

    Declaration[selector] = decl

    // Store element declartion in block declaration (for inheritance needs)
    var blockName = ''
    var elemName = ''

    if (selector.indexOf('__') === -1) {
        decl.__isBlock = true
        blockName = selector
    } else {
        decl.__isBlock = false

        var selectorParts = selector.split('__')
        blockName = selectorParts[0]
        elemName = selectorParts[1]

        if (Declaration[blockName] === undefined) {
            Declaration[blockName] = {}
        }

        if (Declaration[blockName].__elems === undefined) {
            Declaration[blockName].__elems = []
        }

        Declaration[blockName].__elems.push(elemName)
    }

    return this
}

/**
 * Extends declaration with another
 * @decl    object extending decl
 * @extDecl object decl to extend with
 */
function extendDecl (decl, extDecl) {
    for (var key in extDecl) {
        if (decl[key] === undefined) {
            decl[key] = extDecl[key]
        }
        else if (
            typeof extDecl[key] === 'object' && !Array.isArray(extDecl[key])
        ) {
            extendDecl(decl[key], extDecl[key])
        }
    }
}

/**
 * Creates bemNode object
 *
 * @name    string         Node name
 * @attr    object         Node attributes
 * @content string|bemNode Last multiple argument
 * @return  BemNode
 */
Beast.node = function (name, attr) {
    // No more Beast.decl() after the first Beast.node() call
    if (!DeclarationFinished) {
        DeclarationFinished = true
        CompileDeclarations()
    }

    return new BemNode(
        name, attr, Array.prototype.splice.call(arguments, 2)
    )
}

/**
 * Compiles declaration fileds to methods, makes inheritances
 */
function CompileDeclarations () {
    function extend (obj, extObj) {
        for (var key in extObj) {
            if (
                ReservedDeclarationProperies[key] === 2 ||
                extObj.final !== undefined && extObj.final.indexOf(key) !== -1
            ) {
                continue
            }

            if (obj[key] === undefined) {
                obj[key] = typeof extObj[key] === 'object' && extObj[key].constructor === 'Object'
                    ? cloneObject(extObj[key])
                    : extObj[key]
            }
            else if (
                typeof extObj[key] === 'function' && obj[key]._inheritedDeclFunction === undefined
            ) {
                (function (fn, inheritedFn, inheritedDecl) {
                    fn._inheritedDeclFunction = function () {
                        // Imitate inherited decl context for inner inherited() calls
                        var temp = this._decl
                        this._decl = inheritedDecl
                        inheritedFn.apply(this, arguments)
                        this._decl = temp
                    }
                })(obj[key], extObj[key], extObj)
            }
            else if (
                typeof extObj[key] === 'object' && !Array.isArray(extObj[key])
            ) {
                extend(obj[key], extObj[key])
            }
        }
    }

    function inherit (declSelector, decl, inheritedDecls, final) {
        for (var i = inheritedDecls.length - 1; i >= 0; i--) {
            var selector = inheritedDecls[i]
            var inheritedDecl = Declaration[selector]
            var prevFinal

            decl.__flattenInherits.push(selector.toLowerCase())

            if (inheritedDecl !== undefined) {
                extend(decl, inheritedDecl)

                if (inheritedDecl.finalMod === true) {
                    prevFinal = final
                    final = {selector:{}, mod:{}}
                }

                if (final !== undefined) {
                    final.selector[selector] = true
                    if (inheritedDecl.mod !== undefined) {
                        for (var modName in inheritedDecl.mod) {
                            final.mod[modName.toLowerCase()] = true
                        }
                    }
                }

                if (inheritedDecl.inherits !== undefined) {
                    inherit(declSelector, decl, inheritedDecl.inherits, final)
                }

                setFinal(decl, final)

                if (inheritedDecl.finalMod === true) {
                    final = prevFinal
                }

                // Automatic element inheritence for block
                if (inheritedDecl.__elems && decl.__isBlock) {
                    for (var j = 0, jj = inheritedDecl.__elems.length; j < jj; j++) {
                        var elemName = inheritedDecl.__elems[j]
                        var elemSelector = declSelector + '__' + elemName
                        if (Declaration[elemSelector] === undefined) {
                            Beast.decl(
                                elemSelector, {
                                    inherits: selector + '__' + elemName
                                }
                            )
                            if (generatedDeclSelectors.indexOf(elemSelector) === -1) {
                                generatedDeclSelectors.push(elemSelector)
                            }
                        }
                    }
                }
            }
        }
    }

    function setFinal (decl, final) {
        if (final !== undefined) {
            if (decl.__finalMod === undefined) {
                decl.__finalMod = {}
            }
            if (decl.__finalMod._selector === undefined) {
                decl.__finalMod._selector = {}
            }
            for (var modName in final.mod) {
                if (decl.__finalMod[modName] === undefined) {
                    decl.__finalMod[modName] = {}
                    for (var selector in final.selector) {
                        decl.__finalMod[modName][selector] = true
                        decl.__finalMod._selector[selector] = true
                    }
                }
            }
        }
    }

    var generatedDeclSelectors = []
    var forEachSelector = function (decl, selector) {

        var final
        if (decl.finalMod === true) {
            final = {selector:{}, mod:{}}
            final.selector[selector] = true
            if (decl.mod !== undefined) {
                for (var modName in decl.mod) {
                    final.mod[modName.toLowerCase()] = true
                }
            }
        }

        // Extend decl with inherited rules
        if (decl.inherits !== undefined) {
            decl.__flattenInherits = []
            inherit(selector, decl, decl.inherits, final)
        }

        setFinal(decl, final)

        // Compile expand rules to methods array
        var expandHandlers = []
        if (decl.implementWith !== undefined) {
            expandHandlers.unshift(function () {
                this.implementWith(
                    Beast.node(decl.implementWith, undefined, this.get())
                )
            })
        }
        if (decl.expand !== undefined) {
            expandHandlers.unshift(decl.expand)
        }
        if (decl.mix !== undefined) {
            expandHandlers.unshift(function () {
                this.mix.apply(this, decl.mix)
            })
        }
        if (decl.tag !== undefined) {
            expandHandlers.unshift(function () {
                this.tag(decl.tag)
            })
        }
        if (decl.noElems === true) {
            expandHandlers.unshift(function () {
                this.noElems()
            })
        }
        if (decl.domAttr !== undefined) {
            expandHandlers.unshift(function () {
                this.domAttr(decl.domAttr)
            })
        }
        if (decl.onMod !== undefined) {
            expandHandlers.unshift(function () {
                for (var modName in decl.onMod) {
                    for (var modValue in decl.onMod[modName]) {
                        this.onMod(modName, modValue, decl.onMod[modName][modValue], true)
                    }
                }
            })
        }
        if (decl.on !== undefined) {
            expandHandlers.unshift(function () {
                for (var events in decl.on) {
                    if (events === 'preventable') {
                        for (var preventableEvents in decl.on.preventable) {
                            this.on(preventableEvents, decl.on.preventable[preventableEvents], false, decl, true)
                        }
                    } else {
                        this.on(events, decl.on[events], false, decl)
                    }
                }
            })
        }
        if (decl.onWin !== undefined) {
            expandHandlers.unshift(function () {
                for (var events in decl.onWin) {
                    if (events === 'preventable') {
                        for (var preventableEvents in decl.onWin.preventable) {
                            this.onWin(preventableEvents, decl.onWin.preventable[preventableEvents], false, decl, true)
                        }
                    } else {
                        this.onWin(events, decl.onWin[events], false, decl)
                    }
                }
            })
        }

        // Compile expand handlers
        if (expandHandlers.length > 0) {
            decl.__commonExpand = function () {
                for (var i = 0, ii = expandHandlers.length; i < ii; i++) {
                    expandHandlers[i].call(this)
                }
            }
        }

        // Extract user methods
        decl.__userMethods = {}
        for (var key in decl) {
            if (ReservedDeclarationProperies[key] !== 1) {
                decl.__userMethods[key] = decl[key]
            }
        }

    }

    for (var selector in Declaration) {
        forEachSelector(Declaration[selector], selector)
    }

    if (generatedDeclSelectors.length !== 0) {
        for (var i = 0, ii = generatedDeclSelectors.length; i < ii; i++) {
            forEachSelector(
                Declaration[generatedDeclSelectors[i]],
                generatedDeclSelectors[i]
            )
        }
    }
}

/**
 * Set callback when Beast is ready
 *
 * @callback function Function to call
 */
Beast.onReady = function (callback) {
    if (BeastIsReady) {
        callback()
    } else {
        OnBeastReadyCallbacks.push(callback)
    }
}

;(function () {

Beast.parseBML = function (string) {
    js = ''
    buffer = ''
    char = ''
    prevChar = ''
    nextChar = ''
    lastPush = ''
    nodeAttrValueQuote = ''

    openNodesNum = 0
    openBracesNum = 0

    embedStack = []

    inBml = false
    inBmlComment = false
    inNode = false
    inClosingNode = false
    inNodeName = false
    inNodeAttrName = false
    inNodeAttrValue = false
    inNodeTextContent = false
    inSingleQuoteString = false
    inDoubleQuoteString = false
    inSingleLineComment = false
    inMultiLineComment = false
    inEmbed = false

    for (var i = 0, ii = string.length; i < ii; i++) {
        prevChar = i > 0 ? string[i - 1] : ''
        nextChar = i < ii - 1 ? string[i + 1] : ''
        char = string[i]

        // Reset escape char
        if (prevChar === '\\' && char === '\\') {
            prevChar = ''
        }

        /*
         * BML context
         */
        if (inBml) {
            // Node attr value
            if (inNodeAttrValue) {
                if (char === nodeAttrValueQuote && prevChar !== '\\') {
                    pushNodeAttrValue()
                }
                else if (char === '{' && prevChar !== '\\') {
                    pushNodeAttrValue(true)
                    pushEmbed()
                }
                else {
                    if ((char === '"' || char === "'") && prevChar !== '\\') {
                        buffer += '\\'
                    }
                    buffer += char
                }
            }
            // Comment
            else if (inBmlComment) {
                if (prevChar === '-' && char === '>') {
                    inBmlComment = false
                }
            }
            // Comment start
            else if (char === '<' && nextChar === '!') {
                inBmlComment = true
            }
            // Node text content
            else if (inNodeTextContent) {
                if (char === '<' && (nextChar === '/' || isLetter(nextChar))) {
                    pushNodeTextContent()
                }
                else if (char === '{' && prevChar !== '\\') {
                    pushNodeTextContent(true)
                    pushEmbed()
                }
                else {
                    if (char === '"') {
                        buffer += '\\' + char
                    }
                    else if (char === '\n') {
                        buffer += '\\n'
                    }
                    else {
                        buffer += char
                    }
                }
            }
            // Break char: space, new line or tab
            else if (isBreak(char)) {
                if (inNodeName) {
                    pushNodeName()
                    inNodeAttrName = true
                }
                else if (inNodeAttrName) {
                    pushNodeAttrName()
                }

                if (inNode && !inNodeName && isLetter(nextChar)) {
                    inNodeAttrName = true
                }
            }
            else if ((inNodeName || inNodeAttrName) && isLetterOrDigitOrDash(char)) {
                buffer += char

                // Node attr name start
                if (!inNodeName && !inNodeAttrName) {
                    inNodeAttrName = true
                }
            }
            // Node attr name end
            else if (inNodeAttrName && prevChar === '=' && (char === '"' || char === "'")) {
                pushNodeAttrName()
                inNodeAttrValue = true
                nodeAttrValueQuote = char
            }
            // Node opening start
            else if (!inNode && prevChar === '<' && isLetter(char)) {
                buffer += char
                inNode = true
                inNodeName = true
                pushNodeOpen()
            }
            // Node closing start
            else if (!inClosingNode && prevChar === '<' && char === '/' && isLetter(nextChar)) {
                inClosingNode = true
                inNodeName = true
            }
            // Single node closed
            else if (inNode && prevChar === '/' && char === '>') {
                if (inNodeName) {
                    pushNodeName()
                }
                if (inNodeAttrName) {
                    pushNodeAttrName()
                }

                pushClosingNode()
            }
            // Node opening end
            else if (inNode && char === '>') {
                if (inNodeName) {
                    pushNodeName()
                }
                if (inNodeAttrName) {
                    pushNodeAttrName()
                }

                pushOpeningNodeClose()
                inNodeTextContent = true
            }
            // Node closing end
            else if (char === '>' && inClosingNode) {
                pushClosingNode()
            }
            // Skip char for future
            else if (
                !(inNode && !inNodeAttrValue && char === '/' && nextChar === '>') &&
                !(inNodeAttrName && char === '=' && nextChar !== '=')
            ) {
                // Unexpected char
                throw (
                    'BML syntax error: Unexpected token "' + char + '": \n' +
                    string.substring(0, i+1).split('\n').slice(-5).join('\n') + '\n' +
                    js.slice(-100)
                )
            }
        }

        /*
         * JS context
         */
        else {
            // New line
            if (char === '\n') {
                if (inSingleLineComment) {
                    inSingleLineComment = false
                }
            }
            // Single line comment
            else if (prevChar === '/' && char === '/' && !inSingleQuoteString && !inDoubleQuoteString) {
                if (!inSingleLineComment) {
                    inSingleLineComment = true
                }
            }
            // Multi line comment
            else if (prevChar === '/' && char === '*' && !inSingleQuoteString && !inDoubleQuoteString) {
                if (!inMultiLineComment) {
                    inMultiLineComment = true
                }
            }
            else if (prevChar === '*' && char === '/' && !inSingleQuoteString && !inDoubleQuoteString) {
                if (inMultiLineComment) {
                    inMultiLineComment = false
                }
            }
            // If not inside comment
            else if (!inSingleLineComment && !inMultiLineComment) {
                // Single quote string
                if (!inDoubleQuoteString && char === "'" && prevChar !== '\\') {
                    inSingleQuoteString = !inSingleQuoteString
                }
                // Double quote string
                else if (!inSingleQuoteString && char === '"' && prevChar !== '\\') {
                    inDoubleQuoteString = !inDoubleQuoteString
                }
                // If not inside string
                else if (!inSingleQuoteString && !inDoubleQuoteString) {
                    // Embedded JS
                    if (inEmbed) {
                        if (char === '{') {
                            openBracesNum++
                        }
                        else if (char === '}') {
                            openBracesNum--
                        }

                        if (openBracesNum === 0) {
                            popEmbed()
                        }
                    }

                    // BML
                    if (!inBml && char === '<' && isLetter(nextChar)) {
                        inBml = true

                        if (inEmbed) {
                            embedStack.push([openNodesNum, openBracesNum, inNode, inNodeTextContent, inNodeAttrValue, nodeAttrValueQuote])
                            openNodesNum = 0
                            openBracesNum = 0
                            inNode = false
                            inNodeTextContent = false
                            inNodeAttrValue = false
                            nodeAttrValueQuote = ''
                        }
                    }
                }
            }
        }

        if (!inBml && char !== '') {
            js += char
        }
    }

    return js
}

var js = ''
var buffer = ''
var char = ''
var prevChar = ''
var nextChar = ''
var lastPush = ''
var nodeAttrValueQuote = ''

var openNodesNum = 0
var openBracesNum = 0

var embedStack = []

var inBml = false
var inBmlComment = false
var inNode = false
var inClosingNode = false
var inNodeName = false
var inNodeAttrName = false
var inNodeAttrValue = false
var inNodeTextContent = false
var inSingleQuoteString = false
var inDoubleQuoteString = false
var inSingleLineComment = false
var inMultiLineComment = false
var inEmbed = false

function pushNodeOpen () {

    if (!inEmbed || openNodesNum > 0) {
        if (lastPush === 'closingNode') {
            js += ','
        }
        else if (lastPush === 'nodeTextContent') {
            js += ','
        }
        else if (lastPush === 'embed') {
            js += ','
        }
        else if (lastPush === 'openingNodeClose') {
            js += ','
        }
        else if (lastPush === 'nodeName') {
            js += ',undefined,'
        }
        else if (lastPush === 'nodeAttrName') {
            js += 'true},'
        }
        else if (lastPush === 'nodeAttrValue') {
            js += '},'
        }
    }

    openNodesNum++
    js += 'Beast.node('
    lastPush = 'nodeOpen'
}

function pushClosingNode () {
    if (lastPush === 'nodeAttrName') {
        js += 'true}'
    }
    else if (lastPush === 'nodeAttrValue') {
        js += '}'
    }

    openNodesNum--
    js += ')'
    buffer = ''
    inNode = false
    inClosingNode = false
    inNodeTextContent = true
    inNodeName = false
    lastPush = 'closingNode'

    if (openNodesNum === 0) {
        if (inEmbed) {
            var parserState = embedStack.pop()
            openNodesNum = parserState[0]
            openBracesNum = parserState[1]
            inNode = parserState[2]
            inNodeTextContent = parserState[3]
            inNodeAttrValue = parserState[4]
            nodeAttrValueQuote = parserState[5]
        } else {
            inNodeTextContent = false
        }

        inBml = false
        char = ''
        prevChar = ''
        nextChar = ''
        lastPush = ''
    }
}

function pushNodeName () {
    js += '"' + buffer + '"'
    buffer = ''
    inNodeName = false
    lastPush = 'nodeName'

    if (openNodesNum === 1 && !inEmbed) {
        js += ',{__context:this'
        lastPush = 'nodeAttrValue'
    }
}

function pushNodeAttrName () {
    if (lastPush === 'nodeName') {
        js += ',{'
    }
    else if (lastPush === 'nodeAttrName') {
        js += 'true,'
    }
    else if (lastPush === 'nodeAttrValue') {
        js += ','
    }

    js += '"' + buffer + '":'
    buffer = ''
    inNodeAttrName = false
    lastPush = 'nodeAttrName'
}

function pushNodeAttrValue (beforePushEmbed) {
    if (lastPush === 'embed') {
        if (buffer !== '') {
            js += '+'
        }
    }
    else if (lastPush === 'nodeAttrName' && buffer === '' && beforePushEmbed === undefined) {
        js += 'false'
    }

    if (buffer !== '') {
        if (beforePushEmbed === undefined) {
            js += isNaN(buffer) || lastPush === 'embed' ? '"' + buffer + '"' : buffer
            buffer = ''
        } else {
            js += '"' + buffer + '"'
        }
    }

    if (beforePushEmbed === undefined) {
        nodeAttrValueQuote = ''
        inNodeAttrValue = false
    }

    lastPush = 'nodeAttrValue'
}

function pushOpeningNodeClose () {
    if (lastPush === 'nodeName') {
        if (nextChar !== '<') {
            js += ',undefined'
        }
    }
    else if (lastPush === 'nodeAttrName') {
        js += 'true}'
    }
    else if (lastPush === 'nodeAttrValue') {
        js += '}'
    }

    inNode = false
    lastPush = 'openingNodeClose'
}

function pushNodeTextContent (beforePushEmbed) {
    if (buffer !== '') {
        if (lastPush === 'closingNode') {
            js += ','
        }
        else if (lastPush === 'embed') {
            js += ','
        }
        else if (lastPush === 'openingNodeClose') {
            js += ','
        }

        js += '"' + buffer + '"'
        buffer = ''
        lastPush = 'nodeTextContent'
    }

    if (beforePushEmbed === undefined) {
        inNodeTextContent = false
    }
}

function pushEmbed () {
    if (inNodeTextContent) {
        if (lastPush === 'closingNode') {
            js += ','
        }
        else if (lastPush === 'nodeTextContent') {
            js += ','
        }
        else if (lastPush === 'openingNodeClose') {
            js += ','
        }
    }
    else if (inNodeAttrValue) {
        if (buffer !== '') {
            js += '+'
            buffer = ''
        }
    }

    openBracesNum++
    inBml = false
    inEmbed = true
    char = ''
    lastPush = 'embed'
}


function popEmbed () {
    if (inNodeAttrValue) {
        if (buffer !== '') {
            js += buffer
            buffer = ''
        }
    }

    inBml = true

    if (embedStack.length === 0) {
        inEmbed = false
    }

    lastPush = 'embed'
}

function isLetter (char) {
    return char >= 'A' && char <= 'z'
}

function isLetterOrDigitOrDash (char) {
    return char >= 'A' && char <= 'z' || char >= '0' && char <= '9' || char === '-'
}

function isBreak (char) {
    return char === ' ' || char === '\n' || char === '\t'
}

})();

/**
 * Parses and evaluates BML-string
 */
Beast.evalBML = function (string) {
    return eval(Beast.parseBML(string))
}

/**
 * Extracts keys from object in @arguments
 * @return Array Array of keys
 */
function keysFromObjects () {
    var keys = []
    for (var i = 0, ii = arguments.length; i < ii; i++) {
        if (arguments[i] === undefined) {
            continue
        }
        for (var key in arguments[i]) {
            if (keys.indexOf(key) === -1) {
                keys.push(key)
            }
        }
    }
    return keys
}

/**
 * BEM node class
 *
 * @nodeName string Starts with capital for block else for elem
 * @attr     object List of attributes
 * @children array  Child nodes
 */
var BemNode = function (nodeName, attr, children) {
    this._selector = ''                     // BEM-name: 'block' or 'block__elem'
    this._nodeName = nodeName               // BML-node name
    this._attr = attr || {}                 // BML-node attributes
    this._isBlock = false                   // flag if node is block
    this._isElem = false                    // flag if node is elem
    this._mod = {}                          // modifiers list
    this._param = {}                        // parameters list
    this._domNode = undefined               // DOM-node reference
    this._domAttr = {}                      // DOM-attributes
    this._domNodeEventHandlers = undefined  // DOM event handlers
    this._windowEventHandlers = undefined   // window event handlers
    this._modHandlers = undefined           // handlers on modifiers change
    this._domInitHandlers = []              // Handlers called after DOM-node inited
    this._domInited = false                 // Flag if DOM-node inited
    this._parentBlock = undefined           // parent block bemNode reference
    this._parentNode = undefined            // parent bemNode reference
    this._prevParentNode = undefined        // previous parent node value when parent node redefined
    this._children = []                     // list of children
    this._expandedChildren = undefined      // list of expanded children (for expand method purposes)
    this._isExpanded = false                // if Bem-node was expanded
    this._isExpandContext = false           // when flag is true append modifies expandedChildren
    this._isReplaceContext = false          // when flag is true append don't renders children's DOM
    this._isDomInitContext = false          // when flag is true inside domInit functions
    this._mix = []                          // list of additional CSS classes
    this._tag = 'div'                       // DOM-node name
    this._noElems = false                   // Flag if block can have children
    this._implementedNode = undefined       // Node wich this node implements
    this._css = {}                          // CSS properties
    this._cssClasses = undefined            // cached string of CSS classes
    this._decl = undefined                  // declaration for component
    this._flattenInherits = undefined       // array of flattened inherited declarations
    this._flattenInheritsForDom = undefined // array of inherited declarations to add as DOM-classes
    this._renderedOnce = false              // flag if component was rendered at least once
    this._elems = []                        // array of elements (for block only)

    // Define if block or elem
    var firstLetter = nodeName.substr(0,1)
    this._isBlock = firstLetter === firstLetter.toUpperCase()
    this._isElem = !this._isBlock

    // Define mods, params and special params
    for (var key in this._attr) {
        var firstLetter = key.substr(0,1)

        if (key === '__context') {
            if (this._parentBlock === undefined) {
                this.parentBlock(this._attr.__context)
            }
        } else if (firstLetter === firstLetter.toUpperCase()) {
            this._mod[key.toLowerCase()] = this._attr[key]
        } else {
            this._param[key.toLowerCase()] = this._attr[key]
        }
    }

    // Initial operations for block
    if (this._isBlock) {
        this._parentBlock = this
        this._defineDeclarationBySelector(nodeName.toLowerCase())
    }

    // Append children
    this.append.apply(this, children)
}

BemNode.prototype = {

    /**
     * Defines declaraion
     */
    _defineDeclarationBySelector: function (selector) {

        // Rerset old mods, params and state when declaration redefined
        if (this._decl !== undefined) {
            if (this._decl.mod !== undefined) {
                var nameLC
                for (var name in this._decl.mod) {
                    nameLC = name.toLowerCase()
                    if (this._mod[nameLC] === this._decl.mod[name]) {
                        this._mod[nameLC] = undefined
                    }
                }
            }
            if (this._decl.param !== undefined) {
                var nameLC
                for (var name in this._decl.param) {
                    nameLC = name.toLowerCase()
                    if (this._param[nameLC] === this._decl.param[name]) {
                        this._param[nameLC] = undefined
                    }
                }
            }
        }

        this._selector = selector
        this._decl = Declaration[this._selector]
        this._flattenInherits = this._decl && this._decl.__flattenInherits // in case of temporary _decl change
        this._flattenInheritsForDom = undefined

        if (this._decl !== undefined) {

            if (this._decl.mod !== undefined) {
                this.defineMod(this._decl.mod)
            }
            if (this._decl.param !== undefined) {
                this.defineParam(this._decl.param)
            }
        }

        if (this._flattenInherits !== undefined) {
            for (var i = 0, ii = this._flattenInherits.length, decl; i < ii; i++) {
                decl = Declaration[this._flattenInherits[i]]
                if (decl === undefined || decl.abstract === undefined) {
                    if (this._flattenInheritsForDom === undefined) {
                        this._flattenInheritsForDom = []
                    }
                    this._flattenInheritsForDom.push(this._flattenInherits[i])
                }
                else if (decl !== undefined) {
                    if (decl.mod !== undefined) {
                        this.defineMod(decl.mod)
                    }
                    if (decl.param !== undefined) {
                        this.defineParam(decl.param)
                    }
                }
            }
        }

        this._defineUserMethods()
    },

    /**
     * Defines user's methods
     */
    _defineUserMethods: function (selector) {
        var decl = selector !== undefined ? Declaration[selector] : this._decl
        if (decl) {
            for (var methodName in decl.__userMethods) {
                this[methodName] = decl.__userMethods[methodName]
            }
        }
    },

    /**
     * Clears user's methods
     */
    _clearUserMethods: function () {
        if (this._selector === '' || !Declaration[this._selector]) return
        var userMethods = Declaration[this._selector].__userMethods
        for (var methodName in userMethods) {
            this[methodName] = undefined
        }
    },

    /**
     * Runs overwritten method's code
     *
     * @caller function ECMA6 claims caller function link
     */
    inherited: function (caller) {
        if (caller && caller._inheritedDeclFunction !== undefined) {
            caller._inheritedDeclFunction.apply(
                this,
                Array.prototype.splice.call(arguments, 1)
            )
        }

        return this
    },

    /**
     * Checks if component is @selctor was inherited from @selector
     *
     * @selector string
     * @return boolean
     */
    isKindOf: function (selector) {
        selector = selector.toLowerCase()
        var isKindOfSelector = this._selector === selector

        if (!isKindOfSelector && this._flattenInherits !== undefined) {
            isKindOfSelector = this._flattenInherits.indexOf(selector) > -1
        }

        return isKindOfSelector
    },

    /**
     * If node is block
     *
     * @return boolean
     */
    isBlock: function () {
        return this._isBlock
    },

    /**
     * If node is element
     *
     * @return boolean
     */
    isElem: function () {
        return this._isElem
    },

    /**
     * Gets block or element name: 'block' or 'block__element'
     *
     * @return string
     */
    selector: function () {
        return this._selector
    },

    /**
     * Gets or sets node's tag name
     *
     * @return string
     */
    tag: function (tag) {
        if (tag === undefined) {
            return this._tag
        } else {
            if (!this._domNode) {
                this._tag = tag
            }
            return this
        }
    },

    /**
     * Sets css
     *
     * @name  string        css-property name
     * @value string|number css-property value
     */
    css: function (name, value) {
        if (typeof name === 'object') {
            for (var key in name) this.css(key, name[key])
        } else if (value === undefined) {
            if (this._domNode !== undefined && this._css[name] === undefined) {
                return window.getComputedStyle(this._domNode).getPropertyValue(name)
            } else {
                return this._css[name]
            }
        } else {
            if (typeof value === 'number' && CssPxProperty[name]) {
                value += 'px'
            }

            this._css[name] = value

            if (this._domNode) {
                this._setDomNodeCSS(name)
            }
        }

        return this
    },

    /**
     * Sets _noElems flag true
     */
    noElems: function () {
        this._noElems = true

        var parentOfParentBlock = this._parentBlock._parentNode
        while (parentOfParentBlock._noElems === true) {
            parentOfParentBlock = parentOfParentBlock._parentBlock._parentNode
        }
        this._setParentBlockForChildren(this, parentOfParentBlock)

        return this
    },

    /**
     * Only for elements. Gets or sets parent block bemNode reference.
     * Also sets bemNode name adding 'blockName__' before element name.
     * [@bemNode, [@dontAffectChildren]]
     *
     * @bemNode            object  Parent block node
     * @dontAffectChildren boolean If true, children won't get this parent block reference
     */
    parentBlock: function (bemNode, dontAffectChildren) {
        if (bemNode !== undefined) {
            if (this._isElem
                && bemNode instanceof BemNode
                && bemNode !== this._parentBlock) {

                if (bemNode._parentBlock !== undefined && bemNode._parentBlock._noElems) {
                    return this.parentBlock(bemNode._parentNode, dontAffectChildren)
                }

                this._clearUserMethods()
                this._removeFromParentBlockElems()
                this._parentBlock = bemNode._parentBlock
                this._addToParentBlockElems()
                this._defineDeclarationBySelector(
                    this._parentBlock._selector + '__' + this._nodeName.toLowerCase()
                )

                if (!dontAffectChildren) {
                    this._setParentBlockForChildren(this, bemNode)
                }

            }
            return this
        } else {
            return this._implementedNode !== undefined
                ? this._implementedNode._parentBlock
                : this._parentBlock
        }
    },

    /**
     * Recursive parent block setting
     *
     * @bemNode     object current node with children
     * @parentBlock object paren block reference
     */
    _setParentBlockForChildren: function (bemNode, parentBlock) {
        for (var i = 0, ii = bemNode._children.length; i < ii; i++) {
            var child = bemNode._children[i]
            if (child instanceof BemNode) {
                if (child._isElem) {
                    child.parentBlock(parentBlock)
                } else if (child._implementedNode !== undefined && child._implementedNode._isElem) {
                    child._implementedNode.parentBlock(parentBlock, true)
                }
            }
        }
    },

    /**
     * Gets or sets parent bemNode reference
     * [@bemNode]
     *
     * @bemNode object parent node
     */
    parentNode: function (bemNode) {
        if (bemNode !== undefined) {
            if (this._renderedOnce) {
                this.detach()
            }
            if (bemNode !== this._parentNode) {
                this._prevParentNode = this._parentNode
                this._parentNode = bemNode
            }
            return this
        } else {
            return this._parentNode
        }
    },

    /**
     * Gets DOM-node reference
     */
    domNode: function () {
        return this._domNode
    },

    /**
     * Set or get dom attr
     * @name, [@value]
     *
     * @name  string Attribute name
     * @value string Attribute value
     */
    domAttr: function (name, value, domOnly) {
        if (typeof name === 'object') {
            for (var key in name) this.domAttr(key, name[key])
        } else if (value === undefined) {
            return this._domNode === undefined ? this._domAttr[name] : this._domNode[name]
        } else {
            if (!domOnly) {
                this._domAttr[name] = value
            }
            if (this._domNode) {
                if (value === false || value === '') {
                    this._domNode.removeAttribute(name)
                } else {
                    this._domNode.setAttribute(name, value)
                }
            }
        }

        return this
    },

    /**
     * Define modifiers and its default values
     */
    defineMod: function (defaults) {
        if (this._implementedNode) {
            this._implementedNode._extendProperty('_mod', defaults)
        }
        return this._extendProperty('_mod', defaults)
    },

    /**
     * Extends object property with default object
     *
     * @propertyName string
     * @defaults     object
     */
    _extendProperty: function (propertyName, defaults, force)
    {
        var actuals = this[propertyName]
        var keyLC

        for (var key in defaults) {
            keyLC = key.toLowerCase()
            if ((force === true && defaults[key] !== undefined) || actuals[keyLC] === undefined || actuals[keyLC] === '') {
                actuals[keyLC] = defaults[key]
            }
        }

        return this
    },

    /**
     * Define parameters and its default values
     */
    defineParam: function (defaults) {
        return this._extendProperty('_param', defaults)
    },

    /**
     * Sets or gets mod
     * @name, [@value, [@data]]
     *
     * @name  string         Modifier name
     * @value string|boolean Modifier value
     * @data  anything       Additional data
     */
    mod: function (name, value, data) {
        if (name === undefined) {
            return this._mod
        } else if (typeof name === 'string') {
            name = name.toLowerCase()
        } else {
            for (var key in name) this.mod(key, name[key])
            return this
        }

        if (value === undefined) {
            return this._mod[name]
        } else if (this._mod[name] !== value) {
            this._cssClasses = undefined
            this._mod[name] = value
            if (this._implementedNode !== undefined) {
                this._implementedNode._cssClasses = undefined
                this._implementedNode._mod[name] = value
            }
            if (this._domNode !== undefined) {
                this._setDomNodeClasses()
                this._callModHandlers(name, value, data)
            }
        }

        return this
    },

    /**
     * Adds additional CSS-classes
     */
    mix: function () {
        for (var i = 0, ii = arguments.length; i < ii; i++) {
            this._mix.push(arguments[i])
        }

        if (this._domNode !== undefined) {
            this._setDomNodeClasses()
        }

        return this
    },

    /**
     * Toggles mods.
     *
     * @name   string         Modifier name
     * @value1 string|boolean Modifier value 1
     * @value2 string|boolean Modifier value 2
     */
    toggleMod: function (name, value1, value2, flag) {
        if (!this.mod(name)) {
            this.mod(name, value1, flag)
        } else if (this.mod(name) === value2) {
            this.mod(name, value1, flag)
        } else {
            this.mod(name, value2, flag)
        }

        return this
    },

    /**
     * Sets or gets parameter.
     * @name, [@value]
     *
     * @name  string
     * @value anything
     */
    param: function (name, value) {
        if (name === undefined) {
            return this._param
        } else if (typeof name === 'string') {
            name = name.toLowerCase()
        } else {
            for (var key in name) this.param(key, name[key])
            return this
        }

        if (value === undefined) {
            return this._param[name]
        } else {
            this._param[name] = value
        }

        return this
    },

    /**
     * Sets events handler
     *
     * @events  string   Space splitted event list: 'click' or 'click keypress'
     * @handler function
     */
    on: function (event, handler, isSingleEvent, fromDecl, dontCache, preventable) {
        if (typeof handler !== 'function') {
            return this
        }

        if (preventable === undefined) {
            preventable = false
        }

        if (handler.isBoundToNode === undefined) {
            var handlerOrigin = handler
            var handlerWrap = function (e) {
                handlerOrigin.call(this, e, e.detail)
            }
            handler = handlerWrap.bind(this)
            handler.isBoundToNode = true
            handler.unbindedHandler = handlerWrap
        }

        // Used in toHtml() method to restore function links
        if (fromDecl && handler.beastDeclPath === undefined) {
            handler.beastDeclPath = 'Beast.declaration["' + this._selector + '"].on["' + event + '"]'
        }

        if (!isSingleEvent && event.indexOf(' ') > -1) {
            var events = event.split(' ')
            for (var i = 0, ii = events.length; i < ii; i++) {
                this.on(events[i], handler, true, fromDecl)
            }
        } else {
            if (this._domNode !== undefined) {
                this._domNode.addEventListener(event, handler, {passive: !preventable})
            }

            if (dontCache === undefined) {
                if (this._domNodeEventHandlers === undefined) {
                    this._domNodeEventHandlers = {}
                }
                if (this._domNodeEventHandlers[event] === undefined) {
                    this._domNodeEventHandlers[event] = []
                }
                this._domNodeEventHandlers[event].push(handler)
            }

            if (this._isExpandContext && fromDecl === undefined) {
                handler.isExpandContext = true
                this._hasExpandContextEventHandlers = true
            }

            if (this._isDomInitContext) {
                handler.isDomInitContext = true
                this._hasDomInitContextEventHandlers = true
            }
        }

        return this
    },

    /**
     * Sets modifier change handler
     *
     * @modName  string
     * @modValue string|boolean
     * @handler  function
     */
    onWin: function (event, handler, isSingleEvent, fromDecl, dontCache, preventable) {
        if (typeof handler !== 'function') {
            return this
        }

        if (preventable === undefined) {
            preventable = false
        }

        if (handler.isBoundToNode === undefined) {
            var handlerOrigin = handler
            handler = function (e) {
                handlerOrigin.call(this, e, e.detail)
            }.bind(this)
            handler.isBoundToNode = true
        }

        // Used in toHtml() method to restore function links
        if (fromDecl && handler.beastDeclPath === undefined) {
            handler.beastDeclPath = 'Beast.declaration["' + this._selector + '"].onWin["' + event + '"]'
        }

        if (!isSingleEvent && event.indexOf(' ') > -1) {
            var events = event.split(' ')
            for (var i = 0, ii = events.length; i < ii; i++) {
                this.onWin(events[i], handler, true, fromDecl)
            }
        } else {
            if (this._domNode !== undefined) {
                window.addEventListener(event, handler, {passive: !preventable})
            }

            if (!dontCache) {
                if (this._windowEventHandlers === undefined) {
                    this._windowEventHandlers = {}
                }
                if (this._windowEventHandlers[event] === undefined) {
                    this._windowEventHandlers[event] = []
                }
                this._windowEventHandlers[event].push(handler)
            }

            if (this._isExpandContext && !fromDecl) {
                handler.isExpandContext = true
                this._hasExpandContextWindowEventHandlers = true
            }
            if (this._isDomInitContext) {
                handler.isDomInitContext = true
                this._hasDomInitContextWindowEventHandlers = true
            }
        }

        return this
    },

    /**
     * Sets modifier change handler
     *
     * @modName  string
     * @modValue string|boolean
     * @handler  function
     * @fromDecl boolean Private param for cache
     */
    onMod: function (modName, modValue, handler, fromDecl) {

        if (this._isExpandContext && !fromDecl) {
            handler.isExpandContext = true
            this._hasExpandContextModHandlers = true
        }

        // Used in toHtml() method to restore function links
        if (fromDecl) {
            handler.beastDeclPath = 'Beast.declaration["' + this._selector + '"].onMod["' + modName + '"]["' + modValue + '"]'
        }

        modName = modName.toLowerCase()

        if (this._modHandlers === undefined) {
            this._modHandlers = {}
        }
        if (this._modHandlers[modName] === undefined) {
            this._modHandlers[modName] = {}
        }
        if (this._modHandlers[modName][modValue] === undefined) {
            this._modHandlers[modName][modValue] = []
        }
        this._modHandlers[modName][modValue].push(handler)

        return this
    },

    /**
     * Triggers event
     *
     * @eventName string
     * @data      anything Additional data
     */
    trigger: function (eventName, data) {
        if (this._domNode !== undefined) {
            this._domNode.dispatchEvent(
                data !== undefined
                    ? new CustomEvent(eventName, {detail:data})
                    : new Event(eventName)
            )
        }

        return this
    },

    /**
     * Triggers window event
     *
     * @eventName string
     * @data      anything Additional data
     */
    triggerWin: function (eventName, data) {
        if (this._domNode !== undefined) {
            eventName = this.parentBlock()._nodeName + ':' + eventName
            window.dispatchEvent(
                data !== undefined
                    ? new CustomEvent(eventName, {detail:data})
                    : new Event(eventName)
            )
        }

        return this
    },

    /**
     * Gets current node index among siblings
     *
     * @return number
     */
    index: function (allowStrings) {
        var siblings = this._parentNode._children
        var dec = 0
        for (var i = 0, ii = siblings.length; i < ii; i++) {
            if (typeof siblings[i] === 'string') dec++
            if (siblings[i] === this) return allowStrings ? i : i - dec
        }
    },

    /**
     * Empties children
     */
    empty: function () {
        var children

        if (this._isExpandContext) {
            children = this._expandedChildren
            this._expandedChildren = []
        } else {
            children = this._children
            this._children = []
        }

        if (children) {
            for (var i = 0, ii = children.length; i < ii; i++) {
                if (children[i] instanceof BemNode) {
                    children[i].remove()
                }
            }
        }

        if (this._domNode) {
            // Child text nodes could be left
            while (this._domNode.firstChild) {
                this._domNode.removeChild(this._domNode.firstChild)
            }
        }

        return this
    },

    /**
     * Removes itself from parent block elems array
     */
    _removeFromParentBlockElems: function () {
        var parentBlock

        if (this._isElem) {
            parentBlock = this._parentBlock
        } else if (this._isBlock && this._implementedNode !== undefined) {
            parentBlock = this._implementedNode._parentBlock
        }

        if (parentBlock !== undefined) {
            for (var i = 0, ii = parentBlock._elems.length; i < ii; i++) {
                if (parentBlock._elems[i] === this) {
                    parentBlock._elems.splice(i, 1)
                    break
                }
            }
        }
    },

    /**
     * Adds itself to parent block elems array
     */
    _addToParentBlockElems: function () {
        var parentBlock

        if (this._isElem) {
            parentBlock = this._parentBlock
        } else if (this._isBlock && this._implementedNode !== undefined) {
            parentBlock = this._implementedNode._parentBlock
        }

        if (parentBlock !== undefined) {
            parentBlock._elems.push(this)
        }
    },

    /**
     * Removes itself
     */
    remove: function () {
        this._onRemove()

        // Proper remove children
        for (var i = 0, ii = this._children.length; i < ii; i++) {
            if (this._children[i] instanceof BemNode) {
                this._children[i].remove()
                i--
            }
        }

        // Remove window handlers
        if (this._windowEventHandlers !== undefined) {
            for (var eventName in this._windowEventHandlers) {
                for (var i = 0, ii = this._windowEventHandlers[eventName].length; i < ii; i++) {
                    window.removeEventListener(
                        eventName, this._windowEventHandlers[eventName][i]
                    )
                }
            }
        }

        this.detach()
    },

    /**
     * Instructions before removing node
     */
    _onRemove: function () {
        if (this._decl !== undefined && this._decl.onRemove !== undefined) {
            this._decl.onRemove.call(this)
        }
    },

    /**
     * Detaches itself
     */
    detach: function () {

        // Remove DOM node
        if (this._domNode && this._domNode.parentNode) {
            this._domNode.parentNode.removeChild(this._domNode)
        }

        // Remove from parentNode's children
        if (this._parentNode) {
            this._parentNode._children.splice(
                this._parentNode._children.indexOf(this), 1
            )
            this._parentNode = undefined
        }

        this._removeFromParentBlockElems()

        return this
    },

    /**
     * Inserts new children by index. If there's no DOM yet,
     * appends to expandedChildren else appends to children
     * and renders its DOM.
     *
     * @children string|object Children to insert
     * @index    number        Index to insert
     */
    insertChild: function (children, index) {
        for (var i = 0, ii = children.length; i < ii; i++) {
            var child = children[i]

            if (child === false || child === null || child === undefined) {
                continue
            } else if (Array.isArray(child)) {
                this.insertChild(child, index)
                continue
            } else if (child instanceof BemNode) {
                child.parentNode(this)
                if (child._isElem) {
                    if (this._isBlock) {
                        child.parentBlock(this)
                    } else if (this._parentBlock !== undefined) {
                        child.parentBlock(this._parentBlock)
                    }
                }
            } else if (typeof child === 'number') {
                child = child.toString()
            }

            var childrenToChange = this._children

            if (this._isExpandContext) {
                if (this._expandedChildren === undefined) {
                    this._expandedChildren = []
                }
                childrenToChange = this._expandedChildren
            }

            if (index === 0) {
                childrenToChange.unshift(child)
            } else if (index === -1) {
                childrenToChange.push(child)
            } else {
                childrenToChange.splice(index, 0, child)
            }

            if (this._domNode && !this._isReplaceContext) {
                this._renderChildWithIndex(
                    index === -1 ? childrenToChange.length - 1 : index
                )
            }
        }

        return this
    },

    /**
     * Appends new children. If there's no DOM yet,
     * appends to expandedChildren else appends to children
     * and renders its DOM.
     *
     * @children string|object Multiple argument
     */
    append: function () {
        return this.insertChild(arguments, -1)
    },

    /**
     * Prepends new children. If there's no DOM yet,
     * appends to expandedChildren else appends to children
     * and renders its DOM.
     *
     * @children string|object Multiple argument
     */
    prepend: function () {
        return this.insertChild(arguments, 0)
    },

    /**
     * Appends node to the target. If current node belongs to another parent,
     * method removes it from the old context.
     *
     * @bemNode object Target
     */
    appendTo: function (bemNode) {
        bemNode.append(this)
        return this
    },

    /**
     * Prepends node to the target. If current node belongs to another parent,
     * method removes it from the old context.
     *
     * @bemNode object Target
     */
    prependTo: function (bemNode) {
        bemNode.prepend(this)
        return this
    },

    /**
     * Replaces current bemNode with the new
     * @bemNode   BemNode Node that replaces
     * @ignoreDom boolean Private flag - do not change DOM; used in toHtml() method
     */
    replaceWith: function (bemNode, ignoreDom) {
        this._completeExpand()

        var parentNode = this._parentNode
        var siblingsAfter

        if (parentNode !== undefined) {
            if (parentNode === bemNode) {
                parentNode = this._prevParentNode
            } else {
                siblingsAfter = parentNode._children.splice(this.index(true))
                siblingsAfter.shift()
            }
            parentNode._isReplaceContext = true
            parentNode.append(bemNode)
            parentNode._isReplaceContext = false
        }

        if (siblingsAfter !== undefined) {
            parentNode._children = parentNode._children.concat(siblingsAfter)
        }

        this._parentNode = undefined

        if (bemNode instanceof BemNode) {
            if (bemNode._isBlock) {
                bemNode._resetParentBlockForChildren()
            }

            if (ignoreDom === undefined) {
                bemNode.render()
            }
        }
    },

    /**
     * Recursive setting parentBlock as this for child elements
     */
    _resetParentBlockForChildren: function () {
        for (var i = 0, ii = this._children.length; i < ii; i++) {
            var child = this._children[i]
            if (child instanceof BemNode && child._isElem) {
                child.parentBlock(this._parentBlock)
                child._resetParentBlockForChildren(this._parentBlock)
            }
        }
    },

    /**
     * Replaces current bemNode with the new wich implemets its declaration
     * @bemNode   BemNode Node that implements
     * @ignoreDom boolean Private flag - do not change DOM; used in toHtml() method
     */
    implementWith: function (bemNode, ignoreDom) {
        this._cssClasses = undefined

        if (this._domNodeEventHandlers !== undefined) {
            bemNode._domNodeEventHandlers = this._domNodeEventHandlers

            for (var key in bemNode._domNodeEventHandlers) {
                for (var i = 0, ii = bemNode._domNodeEventHandlers[key].length, beastDeclPath; i < ii; i++) {
                    beastDeclPath = bemNode._domNodeEventHandlers[key][i].beastDeclPath
                    bemNode._domNodeEventHandlers[key][i] = bemNode._domNodeEventHandlers[key][i].unbindedHandler.bind(bemNode)
                    bemNode._domNodeEventHandlers[key][i].beastDeclPath = beastDeclPath
                }
            }
        }

        if (this._windowEventHandlers !== undefined) {
            bemNode._windowEventHandlers = this._windowEventHandlers
        }

        if (this._modHandlers !== undefined) {
            bemNode._modHandlers = this._modHandlers
        }

        bemNode._implementedNode = this
        this._implementedWith = bemNode

        bemNode._extendProperty('_mod', this._mod, true)
        bemNode._extendProperty('_param', this._param, true)
        this._extendProperty('_mod', bemNode._mod)

        bemNode._defineUserMethods(this._selector)

        if (this._parentBlock !== undefined && this._parentBlock._elems !== undefined) {
            for (var i = 0, ii = this._parentBlock._elems.length; i < ii; i++) {
                if (this._parentBlock._elems[i] === this) {
                    this._parentBlock._elems[i] = bemNode
                    break
                }
            }
        }

        this.replaceWith(bemNode, ignoreDom)
    },

    /**
     * Filters text in children
     *
     * @return string
     */
    text: function () {
        var text = ''
        for (var i = 0, ii = this._children.length; i < ii; i++) {
            if (typeof this._children[i] === 'string') {
                text += this._children[i]
            }
        }

        return text
    },

    /**
     * Gets elements by name
     */
    elem: function () {
        if (this._isElem) {
            return this.elem.apply(this._parentBlock, arguments)
        }

        if (arguments.length === 0) {
            return this._elems
        }

        var elems = []
        for (var i = 0, ii = this._elems.length, elem; i < ii; i++) {
            elem = this._elems[i]
            for (var j = 0, jj = arguments.length, elemName; j < jj; j++) {
                elemName = arguments[j]
                if (elem._nodeName === elemName ||
                    elem._implementedNode !== undefined && elem._implementedNode._nodeName === elemName
                ) {
                    elems.push(elem)
                }
            }
        }

        return elems
    },

    /**
     * Finds bemNodes by names:
     * @nodeName string Multiple argument: path to node or attribute
     * @return   array  bemNodes collection
     */
    get: function () {
        if (arguments.length === 0) {
            return this._children
        }

        var collections = []
        for (var i = 0, ii = arguments.length, collection; i < ii; i++) {
            if (arguments[i] === '/') {
                collection = this._filterChildNodes()
            } else if (arguments[i].indexOf('/') === -1) {
                collection = this._filterChildNodes(arguments[i])
            } else {
                var pathItems = arguments[i].split('/')

                for (var j = 0, jj = pathItems.length; j < jj; j++) {
                    var pathItem = pathItems[j]

                    if (j === 0) {
                        collection = this._filterChildNodes(pathItem)
                    } else {
                        var prevCollection = collection
                        collection = []
                        for (var k = 0, kk = prevCollection.length; k < kk; k++) {
                            collection = collection.concat(
                                this._filterChildNodes.call(prevCollection[k], pathItem)
                            )
                        }
                    }

                    if (collection.length === 0) {
                        break
                    }
                }
            }

            collections = ii === 1 ? collection : collections.concat(collection)
        }
        return collections
    },

    /**
     * Collects children by node name
     *
     * @name   string Child node name
     * @return array  Filtered children
     */
    _filterChildNodes: function (name) {
        var collection = [], child, childName, implementedChildName
        for (var i = 0, ii = this._children.length; i < ii; i++) {
            child = this._children[i]
            childName = child._nodeName
            implementedChildName = child._implementedNode !== undefined ? child._implementedNode._nodeName : ''

            if (
                child instanceof BemNode && (
                    name === undefined
                    || name === childName
                    || name === implementedChildName
                    || Array.isArray(name) && (
                        name.indexOf(childName) !== -1 || name.indexOf(implementedChildName) !== -1
                    )
                )
            ) {
                collection.push(child)
            }
        }

        return collection
    },

    /**
     * Checks if there are any children
     *
     * @path string Multiple argument: path to node or attribute
     */
    has: function () {
        return this.get.apply(this, arguments).length > 0
    },

    /**
     * Set handler to call afted DOM-node inited
     *
     * @callback function Handler to call
     */
    onDomInit: function (handler) {
        if (!this._domInited) {
            this._domInitHandlers.push(handler)
        } else {
            handler.call(this)
        }

        return this
    },

    /**
     * Clones itself
     */
    clone: function (parentNodeOfClone) {
        var clone = {}
        clone.__proto__ = this.__proto__

        for (var key in this) {
            if (key === '_children') {
                var cloneChildren = []
                for (var i = 0, ii = this._children.length; i < ii; i++) {
                    cloneChildren.push(
                        this._children[i] instanceof BemNode
                            ? this._children[i].clone(clone)
                            : this._children[i]
                    )
                }
                clone._children = cloneChildren
            } else {
                clone[key] = this[key]
            }
        }

        if (parentNodeOfClone !== undefined) {
            clone._parentNode = parentNodeOfClone
        }

        return clone
    },

    /**
     * Expands bemNode. Creates DOM-node and appends to the parent bemNode's DOM.
     * Also renders its children. Inits DOM declarations at the end.
     *
     * @parentDOMNode object Parent for the root node attaching
     */
    render: function (parentDOMNode) {

        // Call expand handler
        if (!this._isExpanded && this._decl !== undefined && this._decl.__commonExpand !== undefined) {
            this._isExpandContext = true
            this._decl.__commonExpand.call(this)
            this._completeExpand()
            this._isExpandContext = false
        }

        // Continue only if parent node is defined and document is defiend too
        if (parentDOMNode === undefined && this._parentNode === undefined || typeof document === 'undefined') {
            return this
        }

        // Create DOM element if there isn't
        if (this._domNode === undefined) {
            this._domNode = document.createElement(this._tag)
            this._domNode.bemNode = this

            this._setDomNodeClasses()
            this._setDomNodeCSS()

            for (var key in this._domAttr) {
                this.domAttr(key, this._domAttr[key], true)
            }
        }

        // Append to DOM tree
        if (parentDOMNode !== undefined) {
            parentDOMNode.appendChild(this._domNode)
        } else {
            this._parentNode._domNode.insertBefore(
                this._domNode,
                this._parentNode._domNode.childNodes[
                    this.index(true)
                ] || null
            )
        }

        var renderedOnce = this._renderedOnce

        // When first time render
        if (!this._renderedOnce) {

            // Render children
            for (var i = 0, ii = this._children.length; i < ii; i++) {
                this._renderChildWithIndex(i)
            }

            // For HTML-body remove previous body tag
            if (this._tag === 'body') {
                document.documentElement.replaceChild(this._domNode, document.body)
            }

            // Add event handlers
            if (this._domNodeEventHandlers !== undefined) {
                for (var eventName in this._domNodeEventHandlers) {
                    for (var i = 0, ii = this._domNodeEventHandlers[eventName].length; i < ii; i++) {
                        this.on(eventName, this._domNodeEventHandlers[eventName][i], true, false, true)
                    }
                }
            }
            if (this._windowEventHandlers !== undefined) {
                for (var eventName in this._windowEventHandlers) {
                    for (var i = 0, ii = this._windowEventHandlers[eventName].length; i < ii; i++) {
                        this.onWin(eventName, this._windowEventHandlers[eventName][i], true, false, true)
                    }
                }
            }

            // Call mod handlers
            for (var modName in this._mod) {
                this._callModHandlers(modName, this._mod[modName])
            }

            // Call DOM init handlers
            this._domInit()

            // Compontent rendered at least once
            this._renderedOnce = true
        }

        this._onAttach(!renderedOnce)

        return this
    },

    /**
     * Creates DOM-node for child with @index and appends to DOM tree
     *
     * @index number Child index
     */
    _renderChildWithIndex: function (index) {
        var child = this._children[index]

        if (child instanceof BemNode) {
            child.render()
        } else {
            this._domNode.insertBefore(
                document.createTextNode(child),
                this._domNode.childNodes[index] || null
            )
        }
    },

    /**
     * Change children array to expanded children array
     * after node expanding
     */
    _completeExpand: function () {
        if (this._isExpandContext && this._expandedChildren) {
            this._children = this._expandedChildren
            this._expandedChildren = undefined
        }
        this._isExpanded = true
    },

    /**
     * Initial instructions for the DOM-element
     */
    _domInit: function () {
        this._isDomInitContext = true

        var decl = this._decl

        if (decl !== undefined) {
            decl.domInit && decl.domInit.call(this)
        }

        if (this._implementedNode && (decl = this._implementedNode._decl)) {
            decl.domInit && decl.domInit.call(this)
        }

        this._isDomInitContext = false
        this._domInited = true

        if (this._domInitHandlers.length !== 0) {
            for (var i = 0, ii = this._domInitHandlers.length; i < ii; i++) {
                this._domInitHandlers[i].call(this)
            }
        }
    },

    /**
     * Instructions for the DOM-element after render in tree
     */
    _onAttach: function (firstTime) {
        if (this._decl !== undefined && this._decl.onAttach !== undefined) {
            this._decl.onAttach.call(this, firstTime)
        }
    },

    /**
     * Call modifier change handlers
     *
     * @modName  string
     * @modValue string
     * @data     object Additional data for handler
     */
    _callModHandlers: function (modName, modValue, data) {
        var handlers

        if (this._modHandlers !== undefined && this._modHandlers[modName] !== undefined) {
            if (this._modHandlers[modName][modValue] !== undefined) {
                handlers = this._modHandlers[modName][modValue]
            } else if (modValue === false && this._modHandlers[modName][''] !== undefined) {
                handlers = this._modHandlers[modName]['']
            } else if (modValue === '' && this._modHandlers[modName][false] !== undefined) {
                handlers = this._modHandlers[modName][false]
            }
            if (this._modHandlers[modName]['*'] !== undefined) {
                if (handlers !== undefined) {
                    handlers = handlers.concat(this._modHandlers[modName]['*'])
                } else {
                    handlers = this._modHandlers[modName]['*']
                }
            }
        }

        if (handlers !== undefined) {
            for (var i = 0, ii = handlers.length; i < ii; i++) {
                handlers[i].call(this, data)
            }
        }
    },

    /**
     * Sets DOM classes
     */
    _setDomNodeClasses: function (returnClassNameOnly, finalMod) {
        if (this._cssClasses === undefined) {
            var className = this._selector
            var value
            var tail

            if (finalMod === undefined && this._decl !== undefined) {
                finalMod = this._decl.__finalMod
            }

            if (this._flattenInheritsForDom !== undefined) {
                for (var i = 0, ii = this._flattenInheritsForDom.length; i < ii; i++) {
                    className += ' ' + this._flattenInheritsForDom[i]
                }
            }

            if (this._mix.length !== 0) {
                for (var i = 0, ii = this._mix.length; i < ii; i++) {
                    className += ' ' + this._mix[i]
                }
            }

            for (var key in this._mod) {
                value = this._mod[key]

                if (value === '' || value === false || value === undefined) {
                    continue
                }

                tail = value === true
                    ? '_' + key
                    : '_' + key + '_' + value

                if (
                    finalMod === undefined ||
                    finalMod[key] === undefined && finalMod._selector[this._selector] === undefined ||
                    finalMod[key] !== undefined && finalMod[key][this._selector] === true
                ) {
                    className += ' ' + this._selector + tail
                }

                if (this._flattenInheritsForDom) {
                    for (var i = 0, ii = this._flattenInheritsForDom.length, selector; i < ii; i++) {
                        selector = this._flattenInheritsForDom[i]
                        if (
                            finalMod === undefined ||
                            finalMod[key] === undefined && finalMod._selector[selector] === undefined ||
                            finalMod[key] !== undefined && finalMod[key][selector] === true
                        ) {
                            className += ' ' + selector + tail
                        }
                    }
                }
            }

            if (this._implementedNode !== undefined) {
                className += ' ' + this._implementedNode._setDomNodeClasses(true, finalMod)
            }

            this._cssClasses = className
        }

        if (returnClassNameOnly) {
            return this._cssClasses
        } else {
            if (this._domNode) {
                this._assignDomClasses.call(this)
            }
        }
    },

    _assignDomClasses: function () {
        this._domNode.className = this._cssClasses
    },

    /**
     * Sets DOM CSS
     */
    _setDomNodeCSS: function (propertyToChange, isAnimationFrame) {
        if (isAnimationFrame) {
            for (var name in this._css) {
                if (propertyToChange !== undefined && propertyToChange !== name) {
                    continue
                }
                if (this._css[name] || this._css[name] === 0 || this._css[name] === '') {
                    this._domNode.style[name] = this._css[name]
                }
            }
        } else {
            this._setDomNodeCSS.call(this, propertyToChange, true)
        }
    },

    /**
     * Converts BemNode with its children to string of Beast.node() functions
     * @return string
     */
    toStringOfFunctions: function () {
        var attr = '{'
        for (var key in this._mod) {
            attr += '"' + (key.substr(0,1).toUpperCase() + key.slice(1)) + '":'

            if (typeof this._mod[key] === 'string') {
                attr += '"' + this._mod[key] + '",'
            } else {
                attr += this._mod[key] + ','
            }
        }
        for (var key in this._param) {
            if (typeof this._param[key] === 'string' || typeof this._param[key] === 'number') {
                attr += '"'+ key +'":"'+ this._param[key] +'",'
            }
        }
        attr += '}'

        var children = ''
        for (var i = 0, ii = this._children.length; i < ii; i++) {
            if (this._children[i] instanceof BemNode) {
                children += this._children[i].toStringOfFunctions()
            } else {
                children += '"'+ escapeDoubleQuotes(this._children[i].toString()) +'"'
            }

            if (i < ii - 1) {
                children += ','
            }
        }

        return 'Beast.node(' +
            '"'+ this._nodeName + '",' +
            (attr === '{}' ? 'undefined' : attr) +
            (children ? ',' + children + ')' : ')')
    },

    /**
     * Converts BemNode to HTML
     * @return string HTML
     */
    toHtml: function () {
        var node = this

        // Call expand handler
        if (!node._isExpanded && node._decl !== undefined && node._decl.__commonExpand !== undefined) {
            node._isExpandContext = true
            node._decl.__commonExpand.call(node)
            node._completeExpand()
            node._isExpandContext = false

            for (var key in this._param) {
                if (this._param[key] instanceof BemNode) {
                    this._param[key] = {
                        string: this._param[key].toStringOfFunctions(),
                        __isStringifiedBemNode: true
                    }
                }
            }
        }

        if (node._implementedWith !== undefined) {
            node = node._implementedWith
        }

        // HTML attrs
        var attrs = ' data-node-name="' + node._nodeName + '"'

        for (var key in node._domAttr)  {
            attrs += ' ' + key + '="' + escapeDoubleQuotes(node._domAttr[key].toString()) + '"'
        }

        // Class attr
        attrs += ' class="' + node._setDomNodeClasses(true) + '"'

        // Style attr
        var style = ''
        for (var key in node._css) {
            if (node._css[key] || node._css[key] === 0) {
                style += camelCaseToDash(key) + ':' + escapeDoubleQuotes(node._css[key]) + ';'
            }
        }

        if (style !== '') {
            attrs += ' style="' + style + '"'
        }

        // Stringify _domNodeEventHandlers
        if (node._domNodeEventHandlers !== undefined) {
            attrs += ' data-event-handlers="' + encodeURIComponent(stringifyObject(node._domNodeEventHandlers)) + '"'
        }

        // Stringify _windowEventHandlers
        if (node._windowEventHandlers !== undefined) {
            attrs += ' data-window-event-handlers="' + encodeURIComponent(stringifyObject(node._windowEventHandlers)) + '"'
        }

        // Stringify _modHandlers
        if (node._modHandlers !== undefined) {
            attrs += ' data-mod-handlers="' + encodeURIComponent(stringifyObject(node._modHandlers)) + '"'
        }

        // Stringify properties
        if (!objectIsEmpty(node._mod)) {
            attrs += ' data-mod="' + encodeURIComponent(stringifyObject(node._mod)) + '"'
        }
        if (!objectIsEmpty(node._param)) {
            attrs += ' data-param="' + encodeURIComponent(stringifyObject(node._param)) + '"'
        }
        if (node._domInitHandlers.length !== 0) {
            attrs += ' data-dom-init-handlers="' + encodeURIComponent(stringifyObject(node._domInitHandlers)) + '"'
        }
        if (node._implementedNode !== undefined) {
            attrs += ' data-implemented-node-name="' + node._implementedNode._nodeName + '"'
        }
        if (node._noElems) {
            attrs += ' data-no-elems="1"'
        }

        // HTML tag
        if (SingleTag[node._tag] === 1) {
            return '<' + node._tag + attrs + '/>'
        } else {
            var content = ''
            for (var i = 0, ii = node._children.length; i < ii; i++) {
                if (node._children[i] instanceof BemNode) {
                    content += node._children[i].toHtml()
                } else {
                    content += escapeHtmlTags(node._children[i].toString())
                }
            }
            return '<' + node._tag + attrs + '>' + content + '</' + node._tag + '>'
        }
    },

    /**
     * Calls expand declaration in runtime
     */
    expand: function () {
        // Replace old children
        this.empty()

        // When call for unexpanded node
        if (this._isExpanded === false) {
            this.append.apply(this, arguments)
            return this
        }

        // Append new children without DOM-node creating (_isReplaceContext flag)
        this._isReplaceContext = true
        this.append.apply(this, arguments)

        // Call expand function
        if (this._decl && this._decl.expand !== undefined) {
            this._isExpandContext = true
            this._decl.expand.call(this)
            this._completeExpand()
            this._isExpandContext = false
        }

        this._isReplaceContext = false

        // Render children
        for (var i = 0, ii = this._children.length; i < ii; i++) {
            this._renderChildWithIndex(i)
        }

        // Call domInit function
        if (this._decl && this._decl.domInit !== undefined) {
            this._decl.domInit.call(this)
        }

        // Call implemented domInit function
        if (this._implementedNode !== undefined &&
            this._implementedNode._decl !== undefined &&
            this._implementedNode._decl.domInit !== undefined) {
            this._implementedNode._decl.domInit.call(this)
        }

        return this
    },
}

})();
Beast.decl({
    App: {
        inherits: ['Grid', 'UIStackNavigation'],
        tag:'body',
        mod: {
            platform: '',
            device: ''
        },
        expand: function fn () {

            if (MissEvent.mobile) {
                this.mix('mobile')
                console.log('mobile')
            }

            this.inherited(fn)
            this.append(
                this.get()
            )
        },
        domInit: function fn() {
            var footer = document.querySelector('.Footer');
            
            window.addEventListener('scroll', function() {
                var scrollY = window.pageYOffset || document.documentElement.scrollTop;
                
                // Handle footer visibility
                if (footer) {
                    if (scrollY > 50) {
                        footer.classList.add('Footer_hidden');
                    } else {
                        footer.classList.remove('Footer_hidden');
                    }
                }
            }, { passive: true });
        }
    },
    
})



/**
 * @block Grid Динамическая сетка
 * @tag base
 */
Beast.decl({
    Grid: {
        // finalMod: true,
        mod: {
            Col: '',                // @mod Col {number} Ширина в колонках
            Wrap: false,            // @mod Wrap {boolean} Основной контейнер сетки
            Margin: false,          // @mod Margin {boolean} Поля
            MarginX: false,         // @mod MarginX {boolean} Горизонтальные поля
            MarginY: false,         // @mod MarginY {boolean} Вертикальные поля
            Unmargin: false,        // @mod Unmargin {boolean} Отрицательные поля
            UnmarginX: false,       // @mod UnmarginX {boolean} Отрицательные горизоантальные поля
            UnmarginY: false,       // @mod UnmarginY {boolean} Отрацательные вертикальные поля
            MarginRightGap: false,  // @mod MarginRightGap {boolean} Правый отступ равен — горизоантальное поле
            MarginLeftGap: false,   // @mod MarginLeftGap {boolean} Левый отступ равен — горизоантальное поле
            Cell: false,            // @mod Cell {boolean} Горизонтальный отступ между соседями — межколонник
            Row: false,             // @mod Row {boolean} Вертикальынй отступ между соседями — межколонник
            Rows: false,            // @mod Rows {boolean} Дочерние компоненты отступают на горизонтальное поле
            Tile: false,            // @mod Tile {boolean} Модификатор дочернего компонента (для модификатора Tiles)
            Tiles: false,           // @mod Tiles {boolean} Дочерние компоненты плиткой с отступами в поле
            Center: false,          // @mod Center {boolean} Выравнивание по центру
            Hidden: false,          // @mod Hidden {boolean} Спрятать компонент
            ColCheck: false,        // @mod ColCheck {boolean} Считать ширину в колонках
            Ratio: '',              // @mod Ratio {1x1 1x2 3x4 ...} Пропорция
        },
        param: {
            isMaxCol: false,
        },
        onMod: {
            Col: {
                '*': function (fromParentGrid) {
                    if (fromParentGrid === undefined) {
                        this.param('isMaxCol', this.mod('col') === 'max')
                    }
                }
            }
        },
        onCol: undefined,
        domInit: function () {
            this.param('isMaxCol', this.mod('col') === 'max')

            if (this.mod('ColCheck')) {
                this.onWin('resize', this.checkColWidth)
                requestAnimationFrame(function () {
                    this.checkColWidth()
                }.bind(this))
            }
        },
        onAttach: function (firstTime) {
            this.setParentGrid(!firstTime)
        },
        checkColWidth: function () {
            var prop = this.css('content').slice(1,-1).split(' ')
            var col = parseInt(prop[0])
            var gap = parseInt(prop[1])
            var maxCol = parseInt(prop[2])
            var marginX = parseInt(prop[3])
            var marginY = parseFloat(prop[4])

            if (isNaN(col)) {
                return
            }

            var width = this.domNode().offsetWidth
            var colNum = Math.floor((width + gap) / (col + gap))

            if (colNum > maxCol) {
                colNum = maxCol
            }

            this.trigger('Col', {
                num: colNum,
                edge: window.innerWidth === (colNum * col + (colNum-1) * gap + marginX * 2),
                col: col,
                gap: gap,
                marginX: marginX,
                marginY: marginY,
            })
        },
        setParentGrid: function (recursive, parentGrid) {
            if (this.onCol !== undefined || this.onEdge !== undefined || this.param('isMaxCol')) {
                var that = this

                if (parentGrid === undefined) {
                    parentGrid = this._parentNode
                    while (parentGrid !== undefined && !(parentGrid.isKindOf('Grid') && parentGrid.mod('ColCheck'))) {
                        parentGrid = parentGrid._parentNode
                    }
                }

                if (parentGrid !== undefined) {
                    if (this.onCol || this.param('isMaxCol')) {
                        parentGrid.on('Col', function (e, data) {
                            that.onCol && that.onCol(data.num, data.edge, data)
                            that.param('isMaxCol') && that.mod('Col', data.num, true)
                        })
                    }
                }
            }

            if (recursive !== undefined) {
                var children = this.get('/')
                for (var i = 0, ii = children.length; i < ii; i++) {
                    if (children[i].isKindOf('grid') && !children[i].mod('ColCheck')) {
                        children[i].setParentGrid(recursive, parentGrid)
                    }
                }
            }
        }
    }
})

function grid (num, col, gap, margin) {
    var gridWidth = col * num + gap * (num - 1) + margin * 2
    return gridWidth
}
// Parallax scroll handler
var parallaxImages = [];
var ticking = false;

function updateParallax() {
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    parallaxImages.forEach(function(item) {
        var speed = item.speed;
        var offset = scrollY * speed;
        item.element.style.setProperty('--parallax-y', offset + 'px');
    });
    
    ticking = false;
}

function requestParallaxUpdate() {
    if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
    }
}

window.addEventListener('scroll', requestParallaxUpdate, { passive: true });

// Add water to parallax on load
window.addEventListener('DOMContentLoaded', function() {
    var water = document.querySelector('.Map__water');
    if (water) {
        water.style.setProperty('--parallax-y', '0px');
        parallaxImages.push({
            element: water,
            speed: 0.007 // Very subtle parallax for background
        });
    }
});

Beast.decl({
    Image: {
        expand: function () {
            this.empty()
            this.css({
                backgroundImage: 'url('+ this.text() +')',
                width: this.param('width'),
                height: this.param('height'),
            })
            if (MissEvent.mobile) {
                
            } else {
                  
            }
        },
        domInit: function() {
            var self = this;
            var imageElements = document.querySelectorAll('.Image');
            var index = Array.from(imageElements).indexOf(this.domNode());
            
            // Different parallax speeds for each image
            var speeds = [0.05, -0.03, 0.08, -0.04, 0.06, -0.05, 0.04, -0.06];
            var speed = speeds[index % speeds.length];
            
            // Different float parameters for each image
            var floatConfigs = [
                { x: 0, y: 0.8, rot: 0.5, duration: 6, delay: -0.7 },
                { x: 0.4, y: 0.5, rot: 0.6, duration: 7.5, delay: -1.1 },
                { x: 0, y: 1, rot: -0.4, duration: 5.5, delay: -0.9 },
                { x: -0.5, y: 0.7, rot: 0.8, duration: 8, delay: -1.5 },
                { x: 0.2, y: 0.9, rot: 1, duration: 6.8, delay: -0.3 },
                { x: -0.3, y: 0.4, rot: -0.9, duration: 7.2, delay: -2 },
                { x: 0.3, y: 0.6, rot: 0.3, duration: 6.3, delay: -1.8 },
                { x: -0.2, y: 0.85, rot: -0.5, duration: 7.8, delay: -0.5 }
            ];
            var config = floatConfigs[index % floatConfigs.length];
            
            this.domNode().style.setProperty('--float-x-amplitude', config.x + 'vw');
            this.domNode().style.setProperty('--float-y-amplitude', config.y + 'vw');
            this.domNode().style.setProperty('--float-rot-amplitude', config.rot + 'deg');
            this.domNode().style.setProperty('--float-duration', config.duration + 's');
            this.domNode().style.setProperty('--float-delay', config.delay + 's');
            
            parallaxImages.push({
                element: this.domNode(),
                speed: speed
            });
        },
        
    },
    
})




Beast.decl({
    Text: {
        expand: function () {
            this.domAttr('src', this.param('src'))
            if (MissEvent.mobile) {
                this.css({
                    width: this.parentBlock().param('mobilewidth'),
                })
            } else {
                this.css({
                    width: this.parentBlock().param('width'),
                })    
            }
            this.css({
                marginLeft: this.parentBlock().param('left'),
                marginTop: this.parentBlock().param('top'),
            })
        }
    },
    
    
})


Beast.decl({
    Card: {
        expand: function () {
            this.domAttr('src', this.param('src'))
            this.css({
                width: this.parentBlock().param('width'),
                marginLeft: this.parentBlock().param('left'),
                marginTop: this.parentBlock().param('top'),
            })
        }
    },    
})




Beast.decl({
    Intro: {
        expand: function () {
            this.append(
                this.get('video', 'image'),
                Beast.node("content",{__context:this},"\n                    ",Beast.node("fixed",undefined,"\n                        ",Beast.node("dot",{"":true}),"\n                        ",this.get('title'),"\n                    "),"\n                    ",this.get('subtitle'),"\n                ")
            )
        },
        domInit: function fn () {

            var films = document.querySelectorAll('video');

            var promise = new Promise(function(resolve) {
                var loaded = 0;

                films.forEach(function(v) {
                    v.addEventListener('loadedmetadata', function() {
                        loaded++;

                    if (loaded === films.length) {
                        resolve();
                    }
                    });
                });
            });

            
            promise.then(function() {
              films.forEach(function(v) {
                v.muted = true;
                v.play();
              });
            });

        }
    },
    Intro__title: {
        inherits: 'Typo',
        mod: {
            Major: true,
            Text: 'XXL',
            Line: 'L'
        }
    },
    Intro__subtitle: {
        inherits: 'Typo',
        mod: {
            Major: true,
            Caps: true,
            Text: 'S',
            Line: 'L'
        }
    },
    Intro__image: {
        
        expand: function () {
            this.append('')
            this.css({
                backgroundImage: 'url('+ this.text() +')'
            })
        }
    },
    Intro__video: {
        tag:'video',
        expand: function () {
            this.domAttr('muted', 'true')
            this.domAttr('autoplay', 'true')
            this.domAttr('playsinline', 'true')
            this.domAttr('loop', 'true')
            this.domAttr('id', 'video')
            
            this.append(
                Beast.node("source",{__context:this,"source":this.text()})
            )
        }
    },
    Intro__source: {
        tag:'source',
        expand: function () {
            let src = this.param('source')
            this.domAttr('src', src)
            this.domAttr('type', 'video/mp4')
            
        }
    } 
})
// Global state to track currently active Island
var activeIsland = null;
var clickOutsideInitialized = false;

// Audio for card open and hover
var cardOpenSound = new Audio('/assets/card-open.mp3');
var cardHoverSound = new Audio('/assets/card-hover.mp3');

// Preload audio
cardOpenSound.load();
cardHoverSound.load();

Beast.decl({
    Island: {
        expand: function () {
            this.css({
                marginLeft: this.param('left'),
                marginTop: this.param('top'),
            })  
            this.append(
                this.get('hint'),
                this.get()
            )
        },
        domInit: function () {
            var self = this;
            
            // Initialize global click-outside handler only once
            if (!clickOutsideInitialized) {
                clickOutsideInitialized = true;
                document.addEventListener('click', function(e) {
                    // Check if click is outside all Islands
                    var clickedInsideIsland = e.target.closest('.Island');
                    
                    if (!clickedInsideIsland && activeIsland) {
                        activeIsland.mod('active', false);
                        activeIsland = null;
                    }
                });
            }
            
            // Add hover sound
            this.domNode().addEventListener('mouseenter', function(e) {
                cardHoverSound.currentTime = 0;
                cardHoverSound.play().catch(function(error) {
                    console.log('Hover audio play failed:', error);
                });
            });
            
            this.domNode().addEventListener('click', function(e) {
                // Check if click is on the card itself
                var clickedOnCard = e.target.closest('.Island__card');
                
                // If clicking on the card, just stop propagation and don't toggle
                if (clickedOnCard) {
                    e.stopPropagation();
                    return;
                }
                
                e.stopPropagation(); // Prevent the document click handler
                
                // Check if this Island is currently active
                var isCurrentlyActive = activeIsland === self;
                
                // Close previously active Island if any
                if (activeIsland && activeIsland !== self) {
                    activeIsland.mod('active', false);
                }
                
                // Toggle current Island
                if (isCurrentlyActive) {
                    self.mod('active', false);
                    activeIsland = null;
                } else {
                    self.mod('active', true);
                    activeIsland = self;
                    // Play sound when opening card
                    cardOpenSound.currentTime = 0; // Reset to start
                    cardOpenSound.play().catch(function(error) {
                        console.log('Audio play failed:', error);
                    });
                }
            });
        },
        
    },
    Island__card: {
        expand: function () {
            var num = this.parentBlock().param('num');
            var formattedNum = String(num).padStart(2, '0');
            
            // Generate random block ID: block:XXXX/XXX.XX
            var blockId = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            var blockNum1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            var blockNum2 = Math.floor(Math.random() * 100).toString().padStart(2, '0');
            
            this.css({
                left: this.param('left'),
                top: this.param('top'),
            })  
            this.append(
                Beast.node("head",{__context:this},"\n                    ",Beast.node("num",undefined,formattedNum),"\n                    ",Beast.node("side",undefined,"\n                        ",this.get('title'),"\n                        ",Beast.node("subtitle",undefined,"\n                            ",'block',Beast.node("colon",undefined,':'),blockId + '/' + blockNum1 + '.' + blockNum2,"\n                        "),"\n                    "),"\n                "),
                Beast.node("lines",{__context:this},"\n                ",Beast.node("line",{"":true}),"\n                ",Beast.node("line",{"":true}),"\n                ",Beast.node("line",{"":true}),"\n                ",Beast.node("line",{"":true}),"\n                "),
                this.get('text'),
                Beast.node("footer",{__context:this,"":true})
            )
        },
        domInit: function fn() {

            

        }
        
    },
    
})
Beast
.decl('link', {
    tag:'a',
    mod: {
        type:'blue'
    },
    noElems:true,
    expand: function () {
        this.domAttr('href', this.param('href'))
        if (this.mod('New')) {
            this.domAttr('target', '_blank')
        }
    }
})


Beast
.decl('footer__link', {
    tag:'a',
    noElems:true,
    expand: function () {
        this.domAttr('href', this.param('href'))
        if (this.mod('New')) {
            this.domAttr('target', '_blank')
        }
    }
})
Beast.decl({
    Menu: {
        domInit: function () {
            
        },

        expand: function () {
            this.append(
                this.get('item')
            )
        },
            
    },
    'Menu__item': {
        expand: function () {
            this.append(
                Beast.node("text",{__context:this},this.get())
            )
        },

    },
     
})


Beast.decl({
    Offer: {
        inherits: 'Typo',
        expand: function () {
            this.css({
                marginLeft: this.parentBlock().param('left'),
                marginTop: this.parentBlock().param('top'),
            })

            let image = this.get('image')[0]._children[0]

            this.append(

                Beast.node("card",{__context:this},"\n                    ",this.get('title', 'text', 'action'),"\n                "),
                
                Beast.node("image",{__context:this},"\n                    ",Beast.node("Image",{"src":image}),"\n                ")

            )  
        },   
    },
    Offer__title: {
        inherits: 'Typo',
        mod: {
            Major: true,
            Text: 'L',
            Line: 'L'
        }
    }, 
    Offer__text: {
        inherits: 'Typo',
        mod: {
            Text: 'M',
            Line: 'L'
        }
    }, 
    Offer__action: {
        inherits: 'Typo',
        mod: {
            Text: 'M',
            Line: 'L'
        },
        expand: function () {

            let bookPage = (
                Beast.node("ContactModal",{__context:this},"\n                    ",Beast.node("Form",undefined,"\n                        ",Beast.node("title",undefined,"Book free initial call to see if we are a fit"),"\n                        ",Beast.node("item",undefined,"\n                            ",Beast.node("input",{"placeholder":"Name","id":"name"}),"\n                        "),"\n                        ",Beast.node("item",undefined,"\n                            ",Beast.node("input",{"placeholder":"Email address","id":"email"},"Email"),"\n                        "),"\n                        ",Beast.node("item",undefined,"\n                            ",Beast.node("textarea",{"placeholder":"Message","rows":4,"id":"message"}),"\n                        "),"\n                        ",Beast.node("item",undefined,"\n                            ",Beast.node("action",undefined,"Send"),"\n                        "),"\n                    "),"                \n                ")
            )

            this.on('click', function () {   

                Beast.node("Overlay",{__context:this,"scrollContent":"true","Type":"modal"},"\n                    ",bookPage,"\n                ")
                    .param({
                        topBar: true,
                        scrollContent: true,
                        background: true,
                        HasFog: true
                    })
                    .pushToStackNavigation({
                        context: this,
                        onDidPop: function () {
                            bookPage.detach()
                        }
                    })
            })     
        },   
    }
})
/**
 * @block Overlay Интерфейс модальных окон
 * @dep UINavigation grid Typo Control
 * @tag base
 * @ext UINavigation grid
 */
Beast.decl({
    Overlay: {
        inherits: ['UINavigation'],
        mod: {
            Type: 'side', // modal, partsideleft, bottom, top, expand, custom
        },
        onMod: {
            State: {
                active: function (callback) {
                    if (this.mod('Type') === 'expand') {
                        this.moveContextInside()
                    }

                    this.param('activeCallback', callback)
                },
                release: function (callback) {
                    if (this.mod('Type') === 'expand') {
                        this.moveContextOutside()
                    }

                    this.param('releaseCallback', callback)
                },
            }
        },
        param: {
            activeCallback: function () {},
            releaseCallback: function () {},
            title: '',
            subtitle: '',
            topBar: true,
            background: true,
        },
        expand: function () {
            if (this.param('topBar')) {
                this.append(Beast.node("topBar",{__context:this}))
                    .mod('HasTopBar', true)
            }

            if (this.param('bottomBar')) {
                var price = this.parentBlock().param('price')
                this.append(
                    Beast.node("bottomBar",{__context:this})   
                )
                    .mod('HasTopBar', true)
            }

            if (this.param('background')) {
                this.append(Beast.node("background",{__context:this}))
            }

            if (this.mod('Type') === 'partsideleft') {
                this.mod('Col', '1LeftMargins')
            }

            this.css('color', this.param('colorText'))

            this.append(
                Beast.node("content",{__context:this},this.get())
            )
        },
        
        on: {

            animationstart: function () {

                if (MissEvent.mobile) {
                    
                } else {
                    
                    var overlayHeight = this.domNode().offsetHeight
                    var parentHeight = this.parentNode().domNode().offsetHeight
                    var marginTop = overlayHeight < (parentHeight - 200)
                        ? this.domNode().offsetHeight / -2
                        : undefined

                    this.css({
                        marginLeft: this.domNode().offsetWidth / -2,
                        marginTop: marginTop,
                        marginBottom: 0,
                        top: '0%',
                    })

                    if (marginTop !== undefined) {
                        this.css({
                            marginTop: marginTop,
                            marginBottom: 0,
                            top: '50%',
                        })
                    }
                }

                if (this.mod('Type') === 'modal') {
                    
                }
            },
            animationend: function () {
                // if (this.mod('Type') === 'expand' && this.param('scrollContent')) {
                //     requestAnimationFrame(function () {
                //         if (this.elem('content')[0].domNode().scrollTop === 0) {
                //             this.param('options').context.css('transform', 'translate3d(0px,0px,0px)')
                //             this.elem('content')[0].domNode().scrollTop = -this.param('scrollContent')
                //             this.param('scrollContent', false)
                //         }
                //     }.bind(this))
                // }

                

                if (this.mod('State') === 'release') {
                    this.param('releaseCallback')()
                } else {
                    this.param('activeCallback')()
                }
            }
        },
        moveContextInside: function () {
            var context = this.param('options').context

            // Calculate Global Offset
            var offsetParent = context.domNode()
            var offsetTop = offsetParent.offsetTop
            while (offsetParent = offsetParent.offsetParent) {
                offsetTop += offsetParent.offsetTop
            }

            // Placeholder
            var placeholder = Beast.node("OverlayPlaceholder",{__context:this})
            this.param('placeholder', placeholder)
            context.parentNode().insertChild([placeholder], context.index(true))
            placeholder
                .css('height', context.domNode().offsetHeight)
                .domNode().className = context.domNode().className

            context.appendTo(
                this.elem('content')[0]
            )

            offsetTop -= 44
            context.css({
                transform: 'translate3d(0px,' + offsetTop + 'px, 0px)'
            })

            // Context is under of the screen top
            if (offsetTop > 0) {
                requestAnimationFrame(function () {
                    context.css({
                        transition: 'transform 300ms',
                        transform: 'translate3d(0px,0px,0px)',
                    })
                })
            }
            // Context is above of the screen top
            else {
                this.param({
                    scrollContent: offsetTop
                })
            }
        },
        moveContextOutside: function () {
            this.param('placeholder').parentNode().insertChild(
                [this.param('options').context], this.param('placeholder').index(true)
            )
            this.param('placeholder').remove()

            this.param('options').context.css({
                transition: ''
            })
        },
    },
    Overlay__topBar: {
        expand: function () {
            var layerIndex = this.parentBlock().parentNode().index()

            // this.append(
            //     <topBarActionBack/>,
            //     layerIndex > 1 && <topBarActionClose/>
            // )

            this.append(
                // <topBarActionNav/>,
                Beast.node("topBarActionClose",{__context:this})
            )

            var title = this.parentBlock().param('title')
            var subtitle = this.parentBlock().param('subtitle')

            if (title) {
                var titles = Beast.node("topBarTitles",{__context:this}).append(
                    Beast.node("topBarTitle",{__context:this},title)
                )

                if (subtitle) {
                    titles.append(
                        Beast.node("topBarSubtitle",{__context:this},subtitle)
                    )
                }

                this.append(titles)
            }
        }
    },

    Overlay__bottomBar: {
        expand: function () {

            var layerIndex = this.parentBlock().parentNode().index()
            var price = this.parentBlock().param('price')

            this.append(
                Beast.node("Reserve",{__context:this},"\n                    ",Beast.node("price",undefined,price),"   \n                ")
            )

            
        }
    },

    Overlay__topBarTitle: {
        inherits: 'Typo',
        mod: {
            Text: 'M',
            Line: 'M',
        },
    },
    Overlay__topBarSubtitle: {
        inherits: 'Typo',
        mod: {
            Text: 'S',
        },
    },
    Overlay__topBarAction: {
        inherits: ['Control', 'Typo'],
        mod: {
            Text: 'M',
            Medium: true,
        },
    },
    Overlay__topBarActionBack: {
        inherits: 'Overlay__topBarAction',
        expand: function fn () {
            this.inherited(fn)

            this.append(
                Beast.node("Icon",{__context:this,"Name":"CornerArrowLeft"}),
                Beast.node("topBarActionLabel",{__context:this},"Back")
            )
        },
        on: {
            Release: function () {
                this.parentBlock().popFromStackNavigation()
            }
        }
    },
    Overlay__topBarActionNav: {
        inherits: 'Overlay__topBarAction',
        expand: function fn () {
            this.inherited(fn)

            this.append(
                Beast.node("topBarActionLabel",{__context:this},"Index"),
                Beast.node("Work",{__context:this},Beast.node("title",undefined,"Test"))
            )
        },
        on: {
            Release: function () {
                //this.parentBlock().popFromStackNavigation()
            }
        }
    },
    Overlay__topBarActionClose: {
        inherits: 'Overlay__topBarAction',
        expand: function fn () {
            //this.css('background', this.parentBlock().param('colorText'))
            if (this.parentBlock().param('lang') === 'en') {
                this.inherited(fn)
                    .append(
                    Beast.node("topBarActionLabel",{__context:this},"Close")
                )
            } else {
                this.inherited(fn)
                    .append(
                        Beast.node("topBarActionLabel",{__context:this},"Close")
                    )
            }
            
        },
        on: {
            click: function () {
                this.parentBlock().popAllFromStackNavigation()
            }
        }
    },

    
})

Beast.decl({
    Section: {

        expand: function () {
            if (this.mod('TextCenter')) {
                this.append(
                    Beast.node("wrap",{__context:this},"\n                        ",Beast.node("item",{"Text":true},"\n                            ",this.get('i'),"\n                            ",this.get('Image'),"\n                            ",this.get('title', 'text'),"\n                        "),"\n                    ")
                )
            } else {
                this.append(
                    Beast.node("wrap",{__context:this},"\n                        \n                        ",Beast.node("item",{"Image":true},"\n                            ",this.get('Image', 'side'),"\n                        "),"\n\n                        ",Beast.node("item",{"Text":true},"\n                            ",this.get('title', 'text', 'Paper'),"\n                        "),"\n                    ")
                )
            }
            
        }
    },
   
    
})



Beast.decl({

    /**
     * @block UINavigation Компонент паттерна навигации
     * @tag base
     */
    UINavigation: {
        mod: {
            State: '', // active, release
        },
        onMod: {
            State: {
                active: function (callback) {
                    callback && callback()
                },
                release: function (callback) {
                    callback && callback()
                }
            }
        },
        activate: function(callback) {
            this.mod('state', 'active', callback)
        },
        release: function(callback) {
            this.mod('state', 'release', callback)
        },

        /**
         * Pushes itself to StackNavigation
         * @options {context:BemNode, onDidPush:function, onDidPop:function, onWillPush:function, onWillPop:function, fog:boolean}
         */
        pushToStackNavigation: function(options) {
            if (options.fog === undefined) {
                options.fog = true
            }

            this.param('options', options)
            this._parentContextOfKind('UIStackNavigation', options.context).push(this)
            return this
        },

        /**
         * Pops itself from StackNavigation
         */
        popFromStackNavigation: function() {
            this._parentContextOfKind('UIStackNavigation', this).pop()
            return this
        },

        /**
         * Pops all NavigationItems from StackNavigation
         */
        popAllFromStackNavigation: function() {
            this._parentContextOfKind('UIStackNavigation', this).popAll()
            return this
        },

        /**
         * Gets parent node for @context of @kind
         */
        _parentContextOfKind: function(kind, context) {
            var node = context._parentNode
            while (!node.isKindOf(kind)) node = node._parentNode
            return node
        },
    },

    /**
     * @block UIStackNavigation Паттерн стэковой навигации
     * @tag base
     */
    UIStackNavigation: {
        inherits: 'UINavigation',
        param: {
            storedScrollPosition: 0,
        },
        expand: function fn () {
            this.inherited(fn)
            this.append(Beast.node("layer",{__context:this},this.get('/')))
            this.topLayer().mod('Root', true)
        },
        onMod: {
            Pushing: {
                true: function () {
                    this.mod('HasFog', this.topNavigationItem().param('options').fog)
                }
            },
            Popping: {
                false: function () {
                    var topItemOptions = this.topNavigationItem().param('options')
                    if (topItemOptions) {
                        this.mod('HasFog', topItemOptions.fog)
                    }
                }
            }
        },
        onWin: {
            popstate: function (e) {
                var item = this.topNavigationItem()
                item && item.popFromStackNavigation && item.popFromStackNavigation()
            }
        },

        /**
         * Pushes @navigationItem to stack
         */
        push: function(navigationItem) {
            this.storeRootScrollPosition()

            this.append(Beast.node("layer",{__context:this},navigationItem))

            this.mod('Pushed', !this.topLayer().mod('Root'))
                .mod('Pushing', true)

            var onDidPush = this.topNavigationItem().param('options').onDidPush
            var onWillPush = this.topNavigationItem().param('options').onWillPush

            this.topNavigationItem().activate(function() {
                this.mod('Pushing', false)
                onDidPush && onDidPush()
            }.bind(this))

            // history.pushState({UIStackNavigation: true}, '', '#')
            this.updateFogSize(navigationItem)

            onWillPush && onWillPush()
        },

        /**
         * Pops @navigationItem from stack
         */
        pop: function(index) {
            this.mod('Popping', true)

            var navigationItem = index === undefined
                ? this.topNavigationItem()
                : this.navigationItemByIndex(index)

            var onWillPop = navigationItem.param('options').onWillPop
            var onDidPop = navigationItem.param('options').onDidPop

            var onRelease = function() {
                onDidPop && onDidPop()
                this.topLayer().remove()
                this.mod('Pushed', !this.topLayer().mod('Root'))
                this.restoreRootScrollPosition()
                this.mod('Popping', false)
            }.bind(this)

            navigationItem.release(onRelease)

            onWillPop && onWillPop()
        },

        /**
         * Pops all @navigationItem's from stack
         */
        popAll: function () {
            this.elem('layer').forEach(function(layer, index) {
                if (index !== 0) {
                    layer.parentBlock().pop(index)
                }
            })
        },

        /**
         * Gets top layer from stack
         */
        topLayer: function() {
            return this.elem('layer').pop()
        },

        /**
         * Gets NavigationItem of top layer
         */
        topNavigationItem: function() {
            return this.topLayer().get('/')[0]
        },

        /**
         * Gets NavigationItem by layer index
         */
        navigationItemByIndex: function (index) {
            return this.elem('layer')[index].get('/')[0]
        },

        /**
         * Stores scroll position
         */
        storeRootScrollPosition: function() {
            if (this.topLayer().mod('Root')) {
                this.param('scrollPosition', window.pageYOffset || document.documentElement.scrollTop)
                this.topLayer().css('margin-top', -this.param('scrollPosition'))
            }
        },

        /**
         * Resores scroll position
         */
        restoreRootScrollPosition: function() {
            if (this.topLayer().mod('Root')) {
                this.topLayer().css('margin-top', '')
                window.scrollTo(0, this.param('scrollPosition'))
            }
        },

        /**
         * Set fog size by navigationItem size
         */
        updateFogSize: function (navigationItem) {
            var itemHeight = navigationItem.domNode().offsetHeight + 200
            var parentHeight = this.domNode().offsetHeight

            if (itemHeight > parentHeight) {
                this.topLayer().get('fog')[0].css('height', itemHeight)
            }
        },
    },

    UIStackNavigation__layer: {
        expand: function () {
            this.append(
                this.get('/'), Beast.node("fog",{__context:this,"Active":true})
            )

            if (!this.mod('root')) {
                this.on('mousedown', function (e) {
                    var PointedDom = document.elementFromPoint(e.clientX, e.clientY)
                    if (PointedDom === this.domNode()) {
                        this.parentBlock().popAll()
                    }
                })
            }
        }
    },

    UIStackNavigation__fog: {
        inherits: 'Control',
        mod: {
            Active: false,
        },
        on: {
            Release: function () {
                if (!this.parentBlock().mod('Pushing')) {
                    this.parentBlock().popAll()
                }
            }
        }
    },

    /**
     * @block UISwitchNavigation Паттерн табовой навигации
     * @tag base
     */
    UISwitchNavigation: {
        inherits: 'UINavigation',
        expand: function() {
            this.append(
                this.get('/').map(function(item, index) {
                    return Beast.node("layer",{__context:this},item)
                })
            )
        },

        /**
         * Switches to item element with @index
         */
        switchToIndex: function (index) {
            if (this.elem('layer').length !== 0) {
                this.elem('layer').forEach(function(layer, layerIndex) {
                    var navigationItem = layer.get('/')[0]
                    if (layerIndex === index) {
                        layer.activate()
                    } else {
                        layer.release()
                    }
                })
            } else {
                this.param('switchToIndex', index)
            }
        }
    },
    UISwitchNavigation__layer: {
        inherits: 'UINavigation',
        noElems: true,
        mod: {
            State: 'release'
        },
        expand: function () {
            if (this.parentBlock().param('switchToIndex') === this.index()) {
                this.activate()
            }

            this.append(this.get('/'))
        }
    }
})

Beast.decl({
    Paper: {
        expand: function () {
            this.append(
                Beast.node("dot",{__context:this,"Top":true}),
                Beast.node("dot",{__context:this,"MiddleTop":true}),
                Beast.node("dot",{__context:this,"MiddleBottom":true}),
                Beast.node("dot",{__context:this,"Bottom":true}),
                Beast.node("content",{__context:this},"\n                    ",this.get('title', 'text', 'author', 'date'),"\n                "),
                Beast.node("signature",{__context:this,"":true})
            )
        }
    },
    
})

const emailJsService = "gmail";
const coachingTemplate = "coaching";

Beast.decl({
    Form: {

        expand: function () {

            this.append(
                Beast.node("form",{__context:this},"\n                    ",this.get('title', 'item'),"\n                ")
                
            )

        },

        domInit: function () {
            var self = this

            let requestForm = document.querySelector(".form__action");

            requestForm.onclick = function(event) {
              
              event.preventDefault();
              // if all validation goes well
              if (validateForm() && !this.disabled) {
                this.value = 'Отправляю...';
                this.disabled = true;
                this.classList.add("button-loading");
                sendEmail();
                
              } else return false;
            }

            // function sendRquestEmail(name, email, phone) {

            //   emailjs.send(emailJsService, emailJsTemplate, {
            //     name: name,
            //     email: email,
            //   })
            //   .then(function() {

            //       //only in successful case send email to client

            //       sendEmailClient();
                  
            //   }, function(error) {
            //       console.log('Failed sendig email', error);
            //   });
            // }

            //send email to client
            function sendEmail() {
                
                let btnSend = document.querySelector(".form__action-title");
                btnSend.innerHTML = 'Message sent';
                btnSend.parentNode.className = "form__action form__disabled";

                $(".form__action").attr("disabled", "disabled").off('click');

                emailjs.send(emailJsService, coachingTemplate, {
                  name: document.querySelector("#name").value,
                  email: document.querySelector("#email").value,
                  message: document.querySelector("#message").value
                })
                .then(function() {
                    console.log('sent?');
                }, function(error) {
                    console.log('Failed sendig email', error);
                });
            }

            //validation of all input fields
            function validateForm() {
              
              let nameField = document.querySelector("#name");
              if (nameField.value.trim() == "") {
                alert('Please enter your name');
                return false;
              }

              let emailField = document.querySelector("#email");
              if (emailField.value.trim() == "") {
                alert('Please enter your email, so we can get back to you');
                return false;
              }

              return true;
            }
        }
    },

    Form__form: {
        tag: 'div',
        expand: function () {

            this.domAttr('action', this.parentBlock().param('action'))
            this.domAttr('id', this.parentBlock().param('id'))

        }
    },

    Form__action: {
        inherits: 'Typo',
        mod: {
            Major: true,
            Text: 'M',
            Line: 'L'
        }, 
        expand: function () {
            // this.domAttr('type', 'submit')
            // this.domAttr('value', this.text())
            this.append(
              Beast.node("action-title",{__context:this},this.text()),
            )
        }
    },

    Form__input: {
        inherits: 'Typo',
        mod: {
            Text: 'M',
            Line: 'L'
        }, 
        tag: 'input',
        expand: function () {
            this.domAttr('type', this.param('type'))
            this.domAttr('id', this.param('id'))
            this.domAttr('placeholder', this.param('placeholder'))
            this.domAttr('required', true)
        }
    },

    Form__textarea: {
        inherits: 'Typo',
        mod: {
            Text: 'M',
            Line: 'L'
        }, 
        tag: 'textarea',
        expand: function () {
            this.domAttr('type', this.param('type'))
            this.domAttr('id', this.param('id'))
            this.domAttr('placeholder', this.param('placeholder'))
            this.domAttr('required', true)
            this.domAttr('rows', this.param('rows'))
            this.domAttr('cols', this.param('cols'))
        }
    },

    Form__title: {
        inherits: 'Typo',
        mod: {
            Major: true,
            Text: 'L',
            Line: 'L'
        }, 
        
    },

    
    
    
})
Beast.decl({
    Parallax: {
        expand: function () {
            this.append()
            this.css({
                width: this.param('width'),
                height: this.param('height')
            })  
        }
    },
    Parallax__image: {
        expand: function () {
            this.empty()
            this.css({
                backgroundImage: 'url('+ this.text('') +')',
                width: this.parentBlock().param('width'),
                height: this.parentBlock().param('height'),
                backgroundSize: this.parentBlock().param('width')
            })
        },
        domInit: function fn() {
            const parallaxImage = this.domNode();
            if (!parallaxImage) return;
            
            // Get speed parameter, default to 50 if not specified
            const defaultSpeed = this.param('speed') || 50;
            
            function updateParallax() {
                const rect = parallaxImage.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const elementTop = rect.top;
                const elementHeight = rect.height;
                const elementCenter = elementTop + elementHeight / 2;
                const viewportCenter = windowHeight / 2;
                
                // Calculate distance from viewport center (-1 to 1)
                const distance = (viewportCenter - elementCenter) / (windowHeight / 2);
                
                // Check if we're on mobile (screen width <= 767px)
                const isMobile = window.innerWidth <= 767;
                // Use original speed for desktop, reduced speed for mobile
                const speed = isMobile ? defaultSpeed * 0.2 : defaultSpeed;
                
                // Apply reversed parallax transform - negative to scroll up when scrolling down
                const parallaxOffset = -distance * speed;
                parallaxImage.style.transform = `translateY(${parallaxOffset}px)`;
            }
            
            // Add scroll event listener
            window.addEventListener('scroll', updateParallax);
            
            // Initial call
            updateParallax();
        }
    }
})
