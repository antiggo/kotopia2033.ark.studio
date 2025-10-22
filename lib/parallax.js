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
