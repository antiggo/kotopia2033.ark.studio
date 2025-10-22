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