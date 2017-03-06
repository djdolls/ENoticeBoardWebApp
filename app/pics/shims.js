function bindArguments(t, e) {
    for (var n = t.length - 1; n >= 0; n--) "function" == typeof t[n] && (t[n] = Zone.current.wrap(t[n], e + "_" + n));
    return t
}

function patchPrototype(t, e) {
    for (var n = t.constructor.name, i = function (i) {
            var r = e[i]
                , o = t[r];
            o && (t[r] = function (t) {
                return function () {
                    return t.apply(this, bindArguments(arguments, n + "." + r))
                }
            }(o))
        }, r = 0; r < e.length; r++) i(r)
}

function patchProperty(t, e) {
    var n = Object.getOwnPropertyDescriptor(t, e) || {
        enumerable: !0
        , configurable: !0
    };
    delete n.writable, delete n.value;
    var i = e.substr(2)
        , r = "_" + e;
    n.set = function (t) {
        if (this[r] && this.removeEventListener(i, this[r]), "function" == typeof t) {
            var e = function (e) {
                var n;
                n = t.apply(this, arguments), void 0 == n || n || e.preventDefault()
            };
            this[r] = e, this.addEventListener(i, e, !1)
        }
        else this[r] = null
    }, n.get = function () {
        return this[r] || null
    }, Object.defineProperty(t, e, n)
}

function patchOnProperties(t, e) {
    var n = [];
    for (var i in t) "on" == i.substr(0, 2) && n.push(i);
    for (var r = 0; r < n.length; r++) patchProperty(t, n[r]);
    if (e)
        for (var o = 0; o < e.length; o++) patchProperty(t, "on" + e[o])
}

function findExistingRegisteredTask(t, e, n, i, r) {
    var o = t[EVENT_TASKS];
    if (o)
        for (var s = 0; s < o.length; s++) {
            var a = o[s]
                , l = a.data;
            if (l.handler === e && l.useCapturing === i && l.eventName === n) return r && o.splice(s, 1), a
        }
    return null
}

function attachRegisteredEvent(t, e) {
    var n = t[EVENT_TASKS];
    n || (n = t[EVENT_TASKS] = []), n.push(e)
}

function makeZoneAwareAddListener(t, e, n, i) {
    function r(t) {
        var e = t.data;
        return attachRegisteredEvent(e.target, t), e.target[s](e.eventName, t.invoke, e.useCapturing)
    }

    function o(t) {
        var e = t.data;
        findExistingRegisteredTask(e.target, t.invoke, e.eventName, e.useCapturing, !0), e.target[a](e.eventName, t.invoke, e.useCapturing)
    }
    void 0 === n && (n = !0), void 0 === i && (i = !1);
    var s = zoneSymbol(t)
        , a = zoneSymbol(e)
        , l = !n && void 0;
    return function (e, n) {
        var a = n[0]
            , c = n[1]
            , u = n[2] || l
            , h = e || _global$1
            , f = null;
        "function" == typeof c ? f = c : c && c.handleEvent && (f = function (t) {
            return c.handleEvent(t)
        });
        var p = !1;
        try {
            p = c && "[object FunctionWrapper]" === c.toString()
        }
        catch (t) {
            return
        }
        if (!f || p) return h[s](a, c, u);
        if (!i) {
            var d = findExistingRegisteredTask(h, c, a, u, !1);
            if (d) return h[s](a, d.invoke, u)
        }
        var g = Zone.current
            , v = h.constructor.name + "." + t + ":" + a
            , y = {
                target: h
                , eventName: a
                , name: a
                , useCapturing: u
                , handler: c
            };
        g.scheduleEventTask(v, f, y, r, o)
    }
}

function makeZoneAwareRemoveListener(t, e) {
    void 0 === e && (e = !0);
    var n = zoneSymbol(t)
        , i = !e && void 0;
    return function (t, e) {
        var r = e[0]
            , o = e[1]
            , s = e[2] || i
            , a = t || _global$1
            , l = findExistingRegisteredTask(a, o, r, s, !0);
        l ? l.zone.cancelTask(l) : a[n](r, o, s)
    }
}

function patchEventTargetMethods(t) {
    return !(!t || !t.addEventListener) && (patchMethod(t, ADD_EVENT_LISTENER, function () {
        return zoneAwareAddEventListener
    }), patchMethod(t, REMOVE_EVENT_LISTENER, function () {
        return zoneAwareRemoveEventListener
    }), !0)
}

function patchClass(t) {
    var e = _global$1[t];
    if (e) {
        _global$1[t] = function () {
            var n = bindArguments(arguments, t);
            switch (n.length) {
            case 0:
                this[originalInstanceKey] = new e;
                break;
            case 1:
                this[originalInstanceKey] = new e(n[0]);
                break;
            case 2:
                this[originalInstanceKey] = new e(n[0], n[1]);
                break;
            case 3:
                this[originalInstanceKey] = new e(n[0], n[1], n[2]);
                break;
            case 4:
                this[originalInstanceKey] = new e(n[0], n[1], n[2], n[3]);
                break;
            default:
                throw new Error("Arg list too long.")
            }
        };
        var n, i = new e(function () {});
        for (n in i) "XMLHttpRequest" === t && "responseBlob" === n || ! function (e) {
            "function" == typeof i[e] ? _global$1[t].prototype[e] = function () {
                return this[originalInstanceKey][e].apply(this[originalInstanceKey], arguments)
            } : Object.defineProperty(_global$1[t].prototype, e, {
                set: function (n) {
                    "function" == typeof n ? this[originalInstanceKey][e] = Zone.current.wrap(n, t + "." + e) : this[originalInstanceKey][e] = n
                }
                , get: function () {
                    return this[originalInstanceKey][e]
                }
            })
        }(n);
        for (n in e) "prototype" !== n && e.hasOwnProperty(n) && (_global$1[t][n] = e[n])
    }
}

function createNamedFn(t, e) {
    try {
        return Function("f", "return function " + t + "(){return f(this, arguments)}")(e)
    }
    catch (t) {
        return function () {
            return e(this, arguments)
        }
    }
}

function patchMethod(t, e, n) {
    for (var i = t; i && !i.hasOwnProperty(e);) i = Object.getPrototypeOf(i);
    !i && t[e] && (i = t);
    var r, o = zoneSymbol(e);
    return i && !(r = i[o]) && (r = i[o] = i[e], i[e] = createNamedFn(e, n(r, o, e))), r
}

function eventTargetPatch(t) {
    var e = []
        , n = t.wtf;
    n ? e = WTF_ISSUE_555.split(",").map(function (t) {
        return "HTML" + t + "Element"
    }).concat(NO_EVENT_TARGET) : t[EVENT_TARGET] ? e.push(EVENT_TARGET) : e = NO_EVENT_TARGET;
    for (var i = 0; i < e.length; i++) {
        var r = t[e[i]];
        patchEventTargetMethods(r && r.prototype)
    }
}

function propertyPatch() {
    Object.defineProperty = function (t, e, n) {
        if (isUnconfigurable(t, e)) throw new TypeError("Cannot assign to read only property '" + e + "' of " + t);
        var i = n.configurable;
        return "prototype" !== e && (n = rewriteDescriptor(t, e, n)), _tryDefineProperty(t, e, n, i)
    }, Object.defineProperties = function (t, e) {
        return Object.keys(e).forEach(function (n) {
            Object.defineProperty(t, n, e[n])
        }), t
    }, Object.create = function (t, e) {
        return "object" != typeof e || Object.isFrozen(e) || Object.keys(e).forEach(function (n) {
            e[n] = rewriteDescriptor(t, n, e[n])
        }), _create(t, e)
    }, Object.getOwnPropertyDescriptor = function (t, e) {
        var n = _getOwnPropertyDescriptor(t, e);
        return isUnconfigurable(t, e) && (n.configurable = !1), n
    }
}

function _redefineProperty(t, e, n) {
    var i = n.configurable;
    return n = rewriteDescriptor(t, e, n), _tryDefineProperty(t, e, n, i)
}

function isUnconfigurable(t, e) {
    return t && t[unconfigurablesKey] && t[unconfigurablesKey][e]
}

function rewriteDescriptor(t, e, n) {
    return n.configurable = !0, n.configurable || (t[unconfigurablesKey] || _defineProperty(t, unconfigurablesKey, {
        writable: !0
        , value: {}
    }), t[unconfigurablesKey][e] = !0), n
}

function _tryDefineProperty(t, e, n, i) {
    try {
        return _defineProperty(t, e, n)
    }
    catch (o) {
        if (!n.configurable) throw o;
        "undefined" == typeof i ? delete n.configurable : n.configurable = i;
        try {
            return _defineProperty(t, e, n)
        }
        catch (i) {
            var r = null;
            try {
                r = JSON.stringify(n)
            }
            catch (t) {
                r = r.toString()
            }
            console.log("Attempting to configure '" + e + "' with descriptor '" + r + "' on object '" + t + "' and got error, giving up: " + i)
        }
    }
}

function registerElementPatch(t) {
    if (isBrowser && "registerElement" in t.document) {
        var e = document.registerElement
            , n = ["createdCallback", "attachedCallback", "detachedCallback", "attributeChangedCallback"];
        document.registerElement = function (t, i) {
            return i && i.prototype && n.forEach(function (t) {
                var e = "Document.registerElement::" + t;
                if (i.prototype.hasOwnProperty(t)) {
                    var n = Object.getOwnPropertyDescriptor(i.prototype, t);
                    n && n.value ? (n.value = Zone.current.wrap(n.value, e), _redefineProperty(i.prototype, t, n)) : i.prototype[t] = Zone.current.wrap(i.prototype[t], e)
                }
                else i.prototype[t] && (i.prototype[t] = Zone.current.wrap(i.prototype[t], e))
            }), e.apply(document, [t, i])
        }
    }
}

function apply(t) {
    var e = t.WebSocket;
    t.EventTarget || patchEventTargetMethods(e.prototype), t.WebSocket = function (t, n) {
        var i, r = arguments.length > 1 ? new e(t, n) : new e(t)
            , o = Object.getOwnPropertyDescriptor(r, "onmessage");
        return o && o.configurable === !1 ? (i = Object.create(r), ["addEventListener", "removeEventListener", "send", "close"].forEach(function (t) {
            i[t] = function () {
                return r[t].apply(r, arguments)
            }
        })) : i = r, patchOnProperties(i, ["close", "error", "message", "open"]), i
    };
    for (var n in e) t.WebSocket[n] = e[n]
}

function propertyDescriptorPatch(t) {
    if (!isNode) {
        var e = "undefined" != typeof WebSocket;
        canPatchViaPropertyDescriptor() ? (isBrowser && patchOnProperties(HTMLElement.prototype, eventNames), patchOnProperties(XMLHttpRequest.prototype, null), "undefined" != typeof IDBIndex && (patchOnProperties(IDBIndex.prototype, null), patchOnProperties(IDBRequest.prototype, null), patchOnProperties(IDBOpenDBRequest.prototype, null), patchOnProperties(IDBDatabase.prototype, null), patchOnProperties(IDBTransaction.prototype, null), patchOnProperties(IDBCursor.prototype, null)), e && patchOnProperties(WebSocket.prototype, null)) : (patchViaCapturingAllTheEvents(), patchClass("XMLHttpRequest"), e && apply(t))
    }
}

function canPatchViaPropertyDescriptor() {
    if (isBrowser && !Object.getOwnPropertyDescriptor(HTMLElement.prototype, "onclick") && "undefined" != typeof Element) {
        var t = Object.getOwnPropertyDescriptor(Element.prototype, "onclick");
        if (t && !t.configurable) return !1
    }
    Object.defineProperty(XMLHttpRequest.prototype, "onreadystatechange", {
        get: function () {
            return !0
        }
    });
    var e = new XMLHttpRequest
        , n = !!e.onreadystatechange;
    return Object.defineProperty(XMLHttpRequest.prototype, "onreadystatechange", {}), n
}

function patchViaCapturingAllTheEvents() {
    for (var t = function (t) {
            var e = eventNames[t]
                , n = "on" + e;
            document.addEventListener(e, function (t) {
                var e, i, r = t.target;
                for (i = r ? r.constructor.name + "." + n : "unknown." + n; r;) r[n] && !r[n][unboundKey] && (e = Zone.current.wrap(r[n], i), e[unboundKey] = r[n], r[n] = e), r = r.parentElement
            }, !0)
        }, e = 0; e < eventNames.length; e++) t(e)
}

function patchTimer(t, e, n, i) {
    function r(e) {
        var n = e.data;
        return n.args[0] = e.invoke, n.handleId = s.apply(t, n.args), e
    }

    function o(t) {
        return a(t.data.handleId)
    }
    var s = null
        , a = null;
    e += i, n += i, s = patchMethod(t, e, function (n) {
        return function (s, a) {
            if ("function" == typeof a[0]) {
                var l = Zone.current
                    , c = {
                        handleId: null
                        , isPeriodic: "Interval" === i
                        , delay: "Timeout" === i || "Interval" === i ? a[1] || 0 : null
                        , args: a
                    }
                    , u = l.scheduleMacroTask(e, a[0], c, r, o);
                if (!u) return u;
                var h = u.data.handleId;
                return h.ref && h.unref && (u.ref = h.ref.bind(h), u.unref = h.unref.bind(h)), u
            }
            return n.apply(t, a)
        }
    }), a = patchMethod(t, n, function (e) {
        return function (n, i) {
            var r = i[0];
            r && "string" == typeof r.type ? (r.cancelFn && r.data.isPeriodic || 0 === r.runCount) && r.zone.cancelTask(r) : e.apply(t, i)
        }
    })
}

function patchXHR(t) {
    function e(t) {
        var e = t[XHR_TASK];
        return e
    }

    function n(t) {
        var e = t.data;
        e.target.addEventListener("readystatechange", function () {
            e.target.readyState === e.target.DONE && (e.aborted || t.invoke())
        });
        var n = e.target[XHR_TASK];
        return n || (e.target[XHR_TASK] = t), s.apply(e.target, e.args), t
    }

    function i() {}

    function r(t) {
        var e = t.data;
        return e.aborted = !0, a.apply(e.target, e.args)
    }
    var o = patchMethod(t.XMLHttpRequest.prototype, "open", function () {
            return function (t, e) {
                return t[XHR_SYNC] = 0 == e[2], o.apply(t, e)
            }
        })
        , s = patchMethod(t.XMLHttpRequest.prototype, "send", function () {
            return function (t, e) {
                var o = Zone.current;
                if (t[XHR_SYNC]) return s.apply(t, e);
                var a = {
                    target: t
                    , isPeriodic: !1
                    , delay: null
                    , args: e
                    , aborted: !1
                };
                return o.scheduleMacroTask("XMLHttpRequest.send", i, a, n, r)
            }
        })
        , a = patchMethod(t.XMLHttpRequest.prototype, "abort", function (t) {
            return function (t, n) {
                var i = e(t);
                if (i && "string" == typeof i.type) {
                    if (null == i.cancelFn) return;
                    i.zone.cancelTask(i)
                }
            }
        })
}! function (t, e, n) {
    "use strict";
    ! function (t) {
        function e(i) {
            if (n[i]) return n[i].exports;
            var r = n[i] = {
                exports: {}
                , id: i
                , loaded: !1
            };
            return t[i].call(r.exports, r, r.exports, e), r.loaded = !0, r.exports
        }
        var n = {};
        return e.m = t, e.c = n, e.p = "", e(0)
    }([function (t, e, n) {
        n(1), n(50), n(51), n(52), n(54), n(55), n(58), n(59), n(60), n(61), n(62), n(63), n(64), n(65), n(66), n(68), n(70), n(72), n(74), n(77), n(78), n(79), n(83), n(87), n(88), n(89), n(90), n(92), n(93), n(94), n(95), n(96), n(98), n(100), n(101), n(102), n(104), n(105), n(106), n(108), n(109), n(110), n(112), n(113), n(114), n(115), n(116), n(117), n(118), n(119), n(120), n(121), n(122), n(123), n(124), n(125), n(127), n(131), n(132), n(133), n(134), n(138), n(140), n(141), n(142), n(143), n(144), n(145), n(146), n(147), n(148), n(149), n(150), n(151), n(152), n(153), n(159), n(160), n(162), n(163), n(164), n(168), n(169), n(170), n(171), n(172), n(174), n(175), n(176), n(177), n(180), n(182), n(183), n(184), n(186), n(188), n(190), n(191), n(192), n(194), n(195), n(196), n(197), n(203), n(206), n(207), n(209), n(210), n(211), n(212), n(213), n(214), n(215), n(216), n(217), n(218), n(219), n(220), n(222), n(223), n(224), n(225), n(226), n(227), n(228), n(229), n(231), n(234), n(235), n(238), n(239), n(240), n(241), n(242), n(243), n(244), n(245), n(246), n(247), n(248), n(250), n(251), n(252), n(253), n(254), n(255), n(256), n(257), n(259), n(260), n(262), n(263), n(264), n(265), n(268), n(269), n(270), n(271), n(272), n(273), n(274), n(275), n(277), n(278), n(279), n(280), n(281), n(282), n(283), n(284), n(285), n(286), n(287), n(288), t.exports = n(289)
    }, function (t, e, i) {
        var r = i(2)
            , o = i(3)
            , s = i(4)
            , a = i(6)
            , l = i(16)
            , c = i(20).KEY
            , u = i(5)
            , h = i(21)
            , f = i(22)
            , p = i(17)
            , d = i(23)
            , g = i(24)
            , v = i(25)
            , y = i(27)
            , m = i(40)
            , x = i(43)
            , b = i(10)
            , w = i(30)
            , k = i(14)
            , S = i(15)
            , T = i(44)
            , A = i(47)
            , C = i(49)
            , P = i(9)
            , E = i(28)
            , M = C.f
            , L = P.f
            , O = A.f
            , D = r.Symbol
            , _ = r.JSON
            , I = _ && _.stringify
            , N = "prototype"
            , F = d("_hidden")
            , R = d("toPrimitive")
            , j = {}.propertyIsEnumerable
            , z = h("symbol-registry")
            , H = h("symbols")
            , B = h("op-symbols")
            , W = Object[N]
            , X = "function" == typeof D
            , G = r.QObject
            , Y = !G || !G[N] || !G[N].findChild
            , q = s && u(function () {
                return 7 != T(L({}, "a", {
                    get: function () {
                        return L(this, "a", {
                            value: 7
                        }).a
                    }
                })).a
            }) ? function (t, e, n) {
                var i = M(W, e);
                i && delete W[e], L(t, e, n), i && t !== W && L(W, e, i)
            } : L
            , V = function (t) {
                var e = H[t] = T(D[N]);
                return e._k = t, e
            }
            , U = X && "symbol" == typeof D.iterator ? function (t) {
                return "symbol" == typeof t
            } : function (t) {
                return t instanceof D
            }
            , Z = function (t, e, n) {
                return t === W && Z(B, e, n), b(t), e = k(e, !0), b(n), o(H, e) ? (n.enumerable ? (o(t, F) && t[F][e] && (t[F][e] = !1), n = T(n, {
                    enumerable: S(0, !1)
                })) : (o(t, F) || L(t, F, S(1, {})), t[F][e] = !0), q(t, e, n)) : L(t, e, n)
            }
            , $ = function (t, e) {
                b(t);
                for (var n, i = m(e = w(e)), r = 0, o = i.length; o > r;) Z(t, n = i[r++], e[n]);
                return t
            }
            , K = function (t, e) {
                return e === n ? T(t) : $(T(t), e)
            }
            , J = function (t) {
                var e = j.call(this, t = k(t, !0));
                return !(this === W && o(H, t) && !o(B, t)) && (!(e || !o(this, t) || !o(H, t) || o(this, F) && this[F][t]) || e)
            }
            , Q = function (t, e) {
                if (t = w(t), e = k(e, !0), t !== W || !o(H, e) || o(B, e)) {
                    var n = M(t, e);
                    return !n || !o(H, e) || o(t, F) && t[F][e] || (n.enumerable = !0), n
                }
            }
            , tt = function (t) {
                for (var e, n = O(w(t)), i = [], r = 0; n.length > r;) o(H, e = n[r++]) || e == F || e == c || i.push(e);
                return i
            }
            , et = function (t) {
                for (var e, n = t === W, i = O(n ? B : w(t)), r = [], s = 0; i.length > s;) o(H, e = i[s++]) && (!n || o(W, e)) && r.push(H[e]);
                return r
            };
        X || (D = function () {
            if (this instanceof D) throw TypeError("Symbol is not a constructor!");
            var t = p(arguments.length > 0 ? arguments[0] : n)
                , e = function (n) {
                    this === W && e.call(B, n), o(this, F) && o(this[F], t) && (this[F][t] = !1), q(this, t, S(1, n))
                };
            return s && Y && q(W, t, {
                configurable: !0
                , set: e
            }), V(t)
        }, l(D[N], "toString", function () {
            return this._k
        }), C.f = Q, P.f = Z, i(48).f = A.f = tt, i(42).f = J, i(41).f = et, s && !i(26) && l(W, "propertyIsEnumerable", J, !0), g.f = function (t) {
            return V(d(t))
        }), a(a.G + a.W + a.F * !X, {
            Symbol: D
        });
        for (var nt = "hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables".split(","), it = 0; nt.length > it;) d(nt[it++]);
        for (var nt = E(d.store), it = 0; nt.length > it;) v(nt[it++]);
        a(a.S + a.F * !X, "Symbol", {
            for: function (t) {
                return o(z, t += "") ? z[t] : z[t] = D(t)
            }
            , keyFor: function (t) {
                if (U(t)) return y(z, t);
                throw TypeError(t + " is not a symbol!")
            }
            , useSetter: function () {
                Y = !0
            }
            , useSimple: function () {
                Y = !1
            }
        }), a(a.S + a.F * !X, "Object", {
            create: K
            , defineProperty: Z
            , defineProperties: $
            , getOwnPropertyDescriptor: Q
            , getOwnPropertyNames: tt
            , getOwnPropertySymbols: et
        }), _ && a(a.S + a.F * (!X || u(function () {
            var t = D();
            return "[null]" != I([t]) || "{}" != I({
                a: t
            }) || "{}" != I(Object(t))
        })), "JSON", {
            stringify: function (t) {
                if (t !== n && !U(t)) {
                    for (var e, i, r = [t], o = 1; arguments.length > o;) r.push(arguments[o++]);
                    return e = r[1], "function" == typeof e && (i = e), !i && x(e) || (e = function (t, e) {
                        return i && (e = i.call(this, t, e)), U(e) ? void 0 : e
                    }), r[1] = e, I.apply(_, r)
                }
            }
        }), D[N][R] || i(8)(D[N], R, D[N].valueOf), f(D, "Symbol"), f(Math, "Math", !0), f(r.JSON, "JSON", !0)
    }, function (t, n) {
        var i = t.exports = "undefined" != typeof window && window.Math == Math ? window : "undefined" != typeof self && self.Math == Math ? self : Function("return this")();
        "number" == typeof e && (e = i)
    }, function (t, e) {
        var n = {}.hasOwnProperty;
        t.exports = function (t, e) {
            return n.call(t, e)
        }
    }, function (t, e, n) {
        t.exports = !n(5)(function () {
            return 7 != Object.defineProperty({}, "a", {
                get: function () {
                    return 7
                }
            }).a
        })
    }, function (t, e) {
        t.exports = function (t) {
            try {
                return !!t()
            }
            catch (t) {
                return !0
            }
        }
    }, function (t, e, i) {
        var r = i(2)
            , o = i(7)
            , s = i(8)
            , a = i(16)
            , l = i(18)
            , c = "prototype"
            , u = function (t, e, i) {
                var h, f, p, d, g = t & u.F
                    , v = t & u.G
                    , y = t & u.S
                    , m = t & u.P
                    , x = t & u.B
                    , b = v ? r : y ? r[e] || (r[e] = {}) : (r[e] || {})[c]
                    , w = v ? o : o[e] || (o[e] = {})
                    , k = w[c] || (w[c] = {});
                v && (i = e);
                for (h in i) f = !g && b && b[h] !== n, p = (f ? b : i)[h], d = x && f ? l(p, r) : m && "function" == typeof p ? l(Function.call, p) : p, b && a(b, h, p, t & u.U), w[h] != p && s(w, h, d), m && k[h] != p && (k[h] = p)
            };
        r.core = o, u.F = 1, u.G = 2, u.S = 4, u.P = 8, u.B = 16, u.W = 32, u.U = 64, u.R = 128, t.exports = u
    }, function (e, n) {
        var i = e.exports = {
            version: "2.4.0"
        };
        "number" == typeof t && (t = i)
    }, function (t, e, n) {
        var i = n(9)
            , r = n(15);
        t.exports = n(4) ? function (t, e, n) {
            return i.f(t, e, r(1, n))
        } : function (t, e, n) {
            return t[e] = n, t
        }
    }, function (t, e, n) {
        var i = n(10)
            , r = n(12)
            , o = n(14)
            , s = Object.defineProperty;
        e.f = n(4) ? Object.defineProperty : function (t, e, n) {
            if (i(t), e = o(e, !0), i(n), r) try {
                return s(t, e, n)
            }
            catch (t) {}
            if ("get" in n || "set" in n) throw TypeError("Accessors not supported!");
            return "value" in n && (t[e] = n.value), t
        }
    }, function (t, e, n) {
        var i = n(11);
        t.exports = function (t) {
            if (!i(t)) throw TypeError(t + " is not an object!");
            return t
        }
    }, function (t, e) {
        t.exports = function (t) {
            return "object" == typeof t ? null !== t : "function" == typeof t
        }
    }, function (t, e, n) {
        t.exports = !n(4) && !n(5)(function () {
            return 7 != Object.defineProperty(n(13)("div"), "a", {
                get: function () {
                    return 7
                }
            }).a
        })
    }, function (t, e, n) {
        var i = n(11)
            , r = n(2).document
            , o = i(r) && i(r.createElement);
        t.exports = function (t) {
            return o ? r.createElement(t) : {}
        }
    }, function (t, e, n) {
        var i = n(11);
        t.exports = function (t, e) {
            if (!i(t)) return t;
            var n, r;
            if (e && "function" == typeof (n = t.toString) && !i(r = n.call(t))) return r;
            if ("function" == typeof (n = t.valueOf) && !i(r = n.call(t))) return r;
            if (!e && "function" == typeof (n = t.toString) && !i(r = n.call(t))) return r;
            throw TypeError("Can't convert object to primitive value")
        }
    }, function (t, e) {
        t.exports = function (t, e) {
            return {
                enumerable: !(1 & t)
                , configurable: !(2 & t)
                , writable: !(4 & t)
                , value: e
            }
        }
    }, function (t, e, n) {
        var i = n(2)
            , r = n(8)
            , o = n(3)
            , s = n(17)("src")
            , a = "toString"
            , l = Function[a]
            , c = ("" + l).split(a);
        n(7).inspectSource = function (t) {
            return l.call(t)
        }, (t.exports = function (t, e, n, a) {
            var l = "function" == typeof n;
            l && (o(n, "name") || r(n, "name", e)), t[e] !== n && (l && (o(n, s) || r(n, s, t[e] ? "" + t[e] : c.join(String(e)))), t === i ? t[e] = n : a ? t[e] ? t[e] = n : r(t, e, n) : (delete t[e], r(t, e, n)))
        })(Function.prototype, a, function () {
            return "function" == typeof this && this[s] || l.call(this)
        })
    }, function (t, e) {
        var i = 0
            , r = Math.random();
        t.exports = function (t) {
            return "Symbol(".concat(t === n ? "" : t, ")_", (++i + r).toString(36))
        }
    }, function (t, e, i) {
        var r = i(19);
        t.exports = function (t, e, i) {
            if (r(t), e === n) return t;
            switch (i) {
            case 1:
                return function (n) {
                    return t.call(e, n)
                };
            case 2:
                return function (n, i) {
                    return t.call(e, n, i)
                };
            case 3:
                return function (n, i, r) {
                    return t.call(e, n, i, r)
                }
            }
            return function () {
                return t.apply(e, arguments)
            }
        }
    }, function (t, e) {
        t.exports = function (t) {
            if ("function" != typeof t) throw TypeError(t + " is not a function!");
            return t
        }
    }, function (t, e, n) {
        var i = n(17)("meta")
            , r = n(11)
            , o = n(3)
            , s = n(9).f
            , a = 0
            , l = Object.isExtensible || function () {
                return !0
            }
            , c = !n(5)(function () {
                return l(Object.preventExtensions({}))
            })
            , u = function (t) {
                s(t, i, {
                    value: {
                        i: "O" + ++a
                        , w: {}
                    }
                })
            }
            , h = function (t, e) {
                if (!r(t)) return "symbol" == typeof t ? t : ("string" == typeof t ? "S" : "P") + t;
                if (!o(t, i)) {
                    if (!l(t)) return "F";
                    if (!e) return "E";
                    u(t)
                }
                return t[i].i
            }
            , f = function (t, e) {
                if (!o(t, i)) {
                    if (!l(t)) return !0;
                    if (!e) return !1;
                    u(t)
                }
                return t[i].w
            }
            , p = function (t) {
                return c && d.NEED && l(t) && !o(t, i) && u(t), t
            }
            , d = t.exports = {
                KEY: i
                , NEED: !1
                , fastKey: h
                , getWeak: f
                , onFreeze: p
            }
    }, function (t, e, n) {
        var i = n(2)
            , r = "__core-js_shared__"
            , o = i[r] || (i[r] = {});
        t.exports = function (t) {
            return o[t] || (o[t] = {})
        }
    }, function (t, e, n) {
        var i = n(9).f
            , r = n(3)
            , o = n(23)("toStringTag");
        t.exports = function (t, e, n) {
            t && !r(t = n ? t : t.prototype, o) && i(t, o, {
                configurable: !0
                , value: e
            })
        }
    }, function (t, e, n) {
        var i = n(21)("wks")
            , r = n(17)
            , o = n(2).Symbol
            , s = "function" == typeof o
            , a = t.exports = function (t) {
                return i[t] || (i[t] = s && o[t] || (s ? o : r)("Symbol." + t))
            };
        a.store = i
    }, function (t, e, n) {
        e.f = n(23)
    }, function (t, e, n) {
        var i = n(2)
            , r = n(7)
            , o = n(26)
            , s = n(24)
            , a = n(9).f;
        t.exports = function (t) {
            var e = r.Symbol || (r.Symbol = o ? {} : i.Symbol || {});
            "_" == t.charAt(0) || t in e || a(e, t, {
                value: s.f(t)
            })
        }
    }, function (t, e) {
        t.exports = !1
    }, function (t, e, n) {
        var i = n(28)
            , r = n(30);
        t.exports = function (t, e) {
            for (var n, o = r(t), s = i(o), a = s.length, l = 0; a > l;)
                if (o[n = s[l++]] === e) return n
        }
    }, function (t, e, n) {
        var i = n(29)
            , r = n(39);
        t.exports = Object.keys || function (t) {
            return i(t, r)
        }
    }, function (t, e, n) {
        var i = n(3)
            , r = n(30)
            , o = n(34)(!1)
            , s = n(38)("IE_PROTO");
        t.exports = function (t, e) {
            var n, a = r(t)
                , l = 0
                , c = [];
            for (n in a) n != s && i(a, n) && c.push(n);
            for (; e.length > l;) i(a, n = e[l++]) && (~o(c, n) || c.push(n));
            return c
        }
    }, function (t, e, n) {
        var i = n(31)
            , r = n(33);
        t.exports = function (t) {
            return i(r(t))
        }
    }, function (t, e, n) {
        var i = n(32);
        t.exports = Object("z").propertyIsEnumerable(0) ? Object : function (t) {
            return "String" == i(t) ? t.split("") : Object(t)
        }
    }, function (t, e) {
        var n = {}.toString;
        t.exports = function (t) {
            return n.call(t).slice(8, -1)
        }
    }, function (t, e) {
        t.exports = function (t) {
            if (t == n) throw TypeError("Can't call method on  " + t);
            return t
        }
    }, function (t, e, n) {
        var i = n(30)
            , r = n(35)
            , o = n(37);
        t.exports = function (t) {
            return function (e, n, s) {
                var a, l = i(e)
                    , c = r(l.length)
                    , u = o(s, c);
                if (t && n != n) {
                    for (; c > u;)
                        if (a = l[u++], a != a) return !0
                }
                else
                    for (; c > u; u++)
                        if ((t || u in l) && l[u] === n) return t || u || 0; return !t && -1
            }
        }
    }, function (t, e, n) {
        var i = n(36)
            , r = Math.min;
        t.exports = function (t) {
            return t > 0 ? r(i(t), 9007199254740991) : 0
        }
    }, function (t, e) {
        var n = Math.ceil
            , i = Math.floor;
        t.exports = function (t) {
            return isNaN(t = +t) ? 0 : (t > 0 ? i : n)(t)
        }
    }, function (t, e, n) {
        var i = n(36)
            , r = Math.max
            , o = Math.min;
        t.exports = function (t, e) {
            return t = i(t), 0 > t ? r(t + e, 0) : o(t, e)
        }
    }, function (t, e, n) {
        var i = n(21)("keys")
            , r = n(17);
        t.exports = function (t) {
            return i[t] || (i[t] = r(t))
        }
    }, function (t, e) {
        t.exports = "constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf".split(",")
    }, function (t, e, n) {
        var i = n(28)
            , r = n(41)
            , o = n(42);
        t.exports = function (t) {
            var e = i(t)
                , n = r.f;
            if (n)
                for (var s, a = n(t), l = o.f, c = 0; a.length > c;) l.call(t, s = a[c++]) && e.push(s);
            return e
        }
    }, function (t, e) {
        e.f = Object.getOwnPropertySymbols
    }, function (t, e) {
        e.f = {}.propertyIsEnumerable
    }, function (t, e, n) {
        var i = n(32);
        t.exports = Array.isArray || function (t) {
            return "Array" == i(t)
        }
    }, function (t, e, i) {
        var r = i(10)
            , o = i(45)
            , s = i(39)
            , a = i(38)("IE_PROTO")
            , l = function () {}
            , c = "prototype"
            , u = function () {
                var t, e = i(13)("iframe")
                    , n = s.length
                    , r = ">";
                for (e.style.display = "none", i(46).appendChild(e), e.src = "javascript:", t = e.contentWindow.document, t.open(), t.write("<script>document.F=Object</script" + r), t.close(), u = t.F; n--;) delete u[c][s[n]];
                return u()
            };
        t.exports = Object.create || function (t, e) {
            var i;
            return null !== t ? (l[c] = r(t), i = new l, l[c] = null, i[a] = t) : i = u(), e === n ? i : o(i, e)
        }
    }, function (t, e, n) {
        var i = n(9)
            , r = n(10)
            , o = n(28);
        t.exports = n(4) ? Object.defineProperties : function (t, e) {
            r(t);
            for (var n, s = o(e), a = s.length, l = 0; a > l;) i.f(t, n = s[l++], e[n]);
            return t
        }
    }, function (t, e, n) {
        t.exports = n(2).document && document.documentElement
    }, function (t, e, n) {
        var i = n(30)
            , r = n(48).f
            , o = {}.toString
            , s = "object" == typeof window && window && Object.getOwnPropertyNames ? Object.getOwnPropertyNames(window) : []
            , a = function (t) {
                try {
                    return r(t)
                }
                catch (t) {
                    return s.slice()
                }
            };
        t.exports.f = function (t) {
            return s && "[object Window]" == o.call(t) ? a(t) : r(i(t))
        }
    }, function (t, e, n) {
        var i = n(29)
            , r = n(39).concat("length", "prototype");
        e.f = Object.getOwnPropertyNames || function (t) {
            return i(t, r)
        }
    }, function (t, e, n) {
        var i = n(42)
            , r = n(15)
            , o = n(30)
            , s = n(14)
            , a = n(3)
            , l = n(12)
            , c = Object.getOwnPropertyDescriptor;
        e.f = n(4) ? c : function (t, e) {
            if (t = o(t), e = s(e, !0), l) try {
                return c(t, e)
            }
            catch (t) {}
            return a(t, e) ? r(!i.f.call(t, e), t[e]) : void 0
        }
    }, function (t, e, n) {
        var i = n(6);
        i(i.S + i.F * !n(4), "Object", {
            defineProperty: n(9).f
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S + i.F * !n(4), "Object", {
            defineProperties: n(45)
        })
    }, function (t, e, n) {
        var i = n(30)
            , r = n(49).f;
        n(53)("getOwnPropertyDescriptor", function () {
            return function (t, e) {
                return r(i(t), e)
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(7)
            , o = n(5);
        t.exports = function (t, e) {
            var n = (r.Object || {})[t] || Object[t]
                , s = {};
            s[t] = e(n), i(i.S + i.F * o(function () {
                n(1)
            }), "Object", s)
        }
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Object", {
            create: n(44)
        })
    }, function (t, e, n) {
        var i = n(56)
            , r = n(57);
        n(53)("getPrototypeOf", function () {
            return function (t) {
                return r(i(t))
            }
        })
    }, function (t, e, n) {
        var i = n(33);
        t.exports = function (t) {
            return Object(i(t))
        }
    }, function (t, e, n) {
        var i = n(3)
            , r = n(56)
            , o = n(38)("IE_PROTO")
            , s = Object.prototype;
        t.exports = Object.getPrototypeOf || function (t) {
            return t = r(t), i(t, o) ? t[o] : "function" == typeof t.constructor && t instanceof t.constructor ? t.constructor.prototype : t instanceof Object ? s : null
        }
    }, function (t, e, n) {
        var i = n(56)
            , r = n(28);
        n(53)("keys", function () {
            return function (t) {
                return r(i(t))
            }
        })
    }, function (t, e, n) {
        n(53)("getOwnPropertyNames", function () {
            return n(47).f
        })
    }, function (t, e, n) {
        var i = n(11)
            , r = n(20).onFreeze;
        n(53)("freeze", function (t) {
            return function (e) {
                return t && i(e) ? t(r(e)) : e
            }
        })
    }, function (t, e, n) {
        var i = n(11)
            , r = n(20).onFreeze;
        n(53)("seal", function (t) {
            return function (e) {
                return t && i(e) ? t(r(e)) : e
            }
        })
    }, function (t, e, n) {
        var i = n(11)
            , r = n(20).onFreeze;
        n(53)("preventExtensions", function (t) {
            return function (e) {
                return t && i(e) ? t(r(e)) : e
            }
        })
    }, function (t, e, n) {
        var i = n(11);
        n(53)("isFrozen", function (t) {
            return function (e) {
                return !i(e) || !!t && t(e)
            }
        })
    }, function (t, e, n) {
        var i = n(11);
        n(53)("isSealed", function (t) {
            return function (e) {
                return !i(e) || !!t && t(e)
            }
        })
    }, function (t, e, n) {
        var i = n(11);
        n(53)("isExtensible", function (t) {
            return function (e) {
                return !!i(e) && (!t || t(e))
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S + i.F, "Object", {
            assign: n(67)
        })
    }, function (t, e, n) {
        var i = n(28)
            , r = n(41)
            , o = n(42)
            , s = n(56)
            , a = n(31)
            , l = Object.assign;
        t.exports = !l || n(5)(function () {
            var t = {}
                , e = {}
                , n = Symbol()
                , i = "abcdefghijklmnopqrst";
            return t[n] = 7, i.split("").forEach(function (t) {
                e[t] = t
            }), 7 != l({}, t)[n] || Object.keys(l({}, e)).join("") != i
        }) ? function (t, e) {
            for (var n = s(t), l = arguments.length, c = 1, u = r.f, h = o.f; l > c;)
                for (var f, p = a(arguments[c++]), d = u ? i(p).concat(u(p)) : i(p), g = d.length, v = 0; g > v;) h.call(p, f = d[v++]) && (n[f] = p[f]);
            return n
        } : l
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Object", {
            is: n(69)
        })
    }, function (t, e) {
        t.exports = Object.is || function (t, e) {
            return t === e ? 0 !== t || 1 / t === 1 / e : t != t && e != e
        }
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Object", {
            setPrototypeOf: n(71).set
        })
    }, function (t, e, i) {
        var r = i(11)
            , o = i(10)
            , s = function (t, e) {
                if (o(t), !r(e) && null !== e) throw TypeError(e + ": can't set as prototype!")
            };
        t.exports = {
            set: Object.setPrototypeOf || ("__proto__" in {} ? function (t, e, n) {
                try {
                    n = i(18)(Function.call, i(49).f(Object.prototype, "__proto__").set, 2), n(t, []), e = !(t instanceof Array)
                }
                catch (t) {
                    e = !0
                }
                return function (t, i) {
                    return s(t, i), e ? t.__proto__ = i : n(t, i), t
                }
            }({}, !1) : n)
            , check: s
        }
    }, function (t, e, n) {
        var i = n(73)
            , r = {};
        r[n(23)("toStringTag")] = "z", r + "" != "[object z]" && n(16)(Object.prototype, "toString", function () {
            return "[object " + i(this) + "]"
        }, !0)
    }, function (t, e, i) {
        var r = i(32)
            , o = i(23)("toStringTag")
            , s = "Arguments" == r(function () {
                return arguments
            }())
            , a = function (t, e) {
                try {
                    return t[e]
                }
                catch (t) {}
            };
        t.exports = function (t) {
            var e, i, l;
            return t === n ? "Undefined" : null === t ? "Null" : "string" == typeof (i = a(e = Object(t), o)) ? i : s ? r(e) : "Object" == (l = r(e)) && "function" == typeof e.callee ? "Arguments" : l
        }
    }, function (t, e, n) {
        var i = n(6);
        i(i.P, "Function", {
            bind: n(75)
        })
    }, function (t, e, n) {
        var i = n(19)
            , r = n(11)
            , o = n(76)
            , s = [].slice
            , a = {}
            , l = function (t, e, n) {
                if (!(e in a)) {
                    for (var i = [], r = 0; e > r; r++) i[r] = "a[" + r + "]";
                    a[e] = Function("F,a", "return new F(" + i.join(",") + ")")
                }
                return a[e](t, n)
            };
        t.exports = Function.bind || function (t) {
            var e = i(this)
                , n = s.call(arguments, 1)
                , a = function () {
                    var i = n.concat(s.call(arguments));
                    return this instanceof a ? l(e, i.length, i) : o(e, i, t)
                };
            return r(e.prototype) && (a.prototype = e.prototype), a
        }
    }, function (t, e) {
        t.exports = function (t, e, i) {
            var r = i === n;
            switch (e.length) {
            case 0:
                return r ? t() : t.call(i);
            case 1:
                return r ? t(e[0]) : t.call(i, e[0]);
            case 2:
                return r ? t(e[0], e[1]) : t.call(i, e[0], e[1]);
            case 3:
                return r ? t(e[0], e[1], e[2]) : t.call(i, e[0], e[1], e[2]);
            case 4:
                return r ? t(e[0], e[1], e[2], e[3]) : t.call(i, e[0], e[1], e[2], e[3])
            }
            return t.apply(i, e)
        }
    }, function (t, e, n) {
        var i = n(9).f
            , r = n(15)
            , o = n(3)
            , s = Function.prototype
            , a = /^\s*function ([^ (]*)/
            , l = "name"
            , c = Object.isExtensible || function () {
                return !0
            };
        l in s || n(4) && i(s, l, {
            configurable: !0
            , get: function () {
                try {
                    var t = this
                        , e = ("" + t).match(a)[1];
                    return o(t, l) || !c(t) || i(t, l, r(5, e)), e
                }
                catch (t) {
                    return ""
                }
            }
        })
    }, function (t, e, n) {
        var i = n(11)
            , r = n(57)
            , o = n(23)("hasInstance")
            , s = Function.prototype;
        o in s || n(9).f(s, o, {
            value: function (t) {
                if ("function" != typeof this || !i(t)) return !1;
                if (!i(this.prototype)) return t instanceof this;
                for (; t = r(t);)
                    if (this.prototype === t) return !0;
                return !1
            }
        })
    }, function (t, e, n) {
        var i = n(2)
            , r = n(3)
            , o = n(32)
            , s = n(80)
            , a = n(14)
            , l = n(5)
            , c = n(48).f
            , u = n(49).f
            , h = n(9).f
            , f = n(81).trim
            , p = "Number"
            , d = i[p]
            , g = d
            , v = d.prototype
            , y = o(n(44)(v)) == p
            , m = "trim" in String.prototype
            , x = function (t) {
                var e = a(t, !1);
                if ("string" == typeof e && e.length > 2) {
                    e = m ? e.trim() : f(e, 3);
                    var n, i, r, o = e.charCodeAt(0);
                    if (43 === o || 45 === o) {
                        if (n = e.charCodeAt(2), 88 === n || 120 === n) return NaN
                    }
                    else if (48 === o) {
                        switch (e.charCodeAt(1)) {
                        case 66:
                        case 98:
                            i = 2, r = 49;
                            break;
                        case 79:
                        case 111:
                            i = 8, r = 55;
                            break;
                        default:
                            return +e
                        }
                        for (var s, l = e.slice(2), c = 0, u = l.length; u > c; c++)
                            if (s = l.charCodeAt(c), 48 > s || s > r) return NaN;
                        return parseInt(l, i)
                    }
                }
                return +e
            };
        if (!d(" 0o1") || !d("0b1") || d("+0x1")) {
            d = function (t) {
                var e = 1 > arguments.length ? 0 : t
                    , n = this;
                return n instanceof d && (y ? l(function () {
                    v.valueOf.call(n)
                }) : o(n) != p) ? s(new g(x(e)), n, d) : x(e)
            };
            for (var b, w = n(4) ? c(g) : "MAX_VALUE,MIN_VALUE,NaN,NEGATIVE_INFINITY,POSITIVE_INFINITY,EPSILON,isFinite,isInteger,isNaN,isSafeInteger,MAX_SAFE_INTEGER,MIN_SAFE_INTEGER,parseFloat,parseInt,isInteger".split(","), k = 0; w.length > k; k++) r(g, b = w[k]) && !r(d, b) && h(d, b, u(g, b));
            d.prototype = v, v.constructor = d, n(16)(i, p, d)
        }
    }, function (t, e, n) {
        var i = n(11)
            , r = n(71).set;
        t.exports = function (t, e, n) {
            var o, s = e.constructor;
            return s !== n && "function" == typeof s && (o = s.prototype) !== n.prototype && i(o) && r && r(t, o), t
        }
    }, function (t, e, n) {
        var i = n(6)
            , r = n(33)
            , o = n(5)
            , s = n(82)
            , a = "[" + s + "]"
            , l = "​"
            , c = RegExp("^" + a + a + "*")
            , u = RegExp(a + a + "*$")
            , h = function (t, e, n) {
                var r = {}
                    , a = o(function () {
                        return !!s[t]() || l[t]() != l
                    })
                    , c = r[t] = a ? e(f) : s[t];
                n && (r[n] = c), i(i.P + i.F * a, "String", r)
            }
            , f = h.trim = function (t, e) {
                return t = String(r(t)), 1 & e && (t = t.replace(c, "")), 2 & e && (t = t.replace(u, "")), t
            };
        t.exports = h
    }, function (t, e) {
        t.exports = "\t\n\v\f\r   ᠎             　\u2028\u2029\ufeff"
    }, function (t, e, n) {
        var i = n(6)
            , r = (n(84), n(36))
            , o = n(85)
            , s = n(86)
            , a = 1..toFixed
            , l = Math.floor
            , c = [0, 0, 0, 0, 0, 0]
            , u = "Number.toFixed: incorrect invocation!"
            , h = "0"
            , f = function (t, e) {
                for (var n = -1, i = e; ++n < 6;) i += t * c[n], c[n] = i % 1e7, i = l(i / 1e7)
            }
            , p = function (t) {
                for (var e = 6, n = 0; --e >= 0;) n += c[e], c[e] = l(n / t), n = n % t * 1e7
            }
            , d = function () {
                for (var t = 6, e = ""; --t >= 0;)
                    if ("" !== e || 0 === t || 0 !== c[t]) {
                        var n = String(c[t]);
                        e = "" === e ? n : e + s.call(h, 7 - n.length) + n
                    }
                return e
            }
            , g = function (t, e, n) {
                return 0 === e ? n : e % 2 === 1 ? g(t, e - 1, n * t) : g(t * t, e / 2, n)
            }
            , v = function (t) {
                for (var e = 0, n = t; n >= 4096;) e += 12, n /= 4096;
                for (; n >= 2;) e += 1, n /= 2;
                return e
            };
        i(i.P + i.F * (!!a && ("0.000" !== 8e-5.toFixed(3) || "1" !== .9. toFixed(0) || "1.25" !== 1.255.toFixed(2) || "1000000000000000128" !== (0xde0b6b3a7640080).toFixed(0)) || !n(5)(function () {
            a.call({})
        })), "Number", {
            toFixed: function (t) {
                var e, n, i, a, l = o(this, u)
                    , c = r(t)
                    , y = ""
                    , m = h;
                if (0 > c || c > 20) throw RangeError(u);
                if (l != l) return "NaN";
                if (-1e21 >= l || l >= 1e21) return String(l);
                if (0 > l && (y = "-", l = -l), l > 1e-21)
                    if (e = v(l * g(2, 69, 1)) - 69, n = 0 > e ? l * g(2, -e, 1) : l / g(2, e, 1), n *= 4503599627370496, e = 52 - e, e > 0) {
                        for (f(0, n), i = c; i >= 7;) f(1e7, 0), i -= 7;
                        for (f(g(10, i, 1), 0), i = e - 1; i >= 23;) p(1 << 23), i -= 23;
                        p(1 << i), f(1, 1), p(2), m = d()
                    }
                    else f(0, n), f(1 << -e, 0), m = d() + s.call(h, c);
                return c > 0 ? (a = m.length, m = y + (c >= a ? "0." + s.call(h, c - a) + m : m.slice(0, a - c) + "." + m.slice(a - c))) : m = y + m, m
            }
        })
    }, function (t, e) {
        t.exports = function (t, e, i, r) {
            if (!(t instanceof e) || r !== n && r in t) throw TypeError(i + ": incorrect invocation!");
            return t
        }
    }, function (t, e, n) {
        var i = n(32);
        t.exports = function (t, e) {
            if ("number" != typeof t && "Number" != i(t)) throw TypeError(e);
            return +t
        }
    }, function (t, e, n) {
        var i = n(36)
            , r = n(33);
        t.exports = function (t) {
            var e = String(r(this))
                , n = ""
                , o = i(t);
            if (0 > o || o == 1 / 0) throw RangeError("Count can't be negative");
            for (; o > 0;
                (o >>>= 1) && (e += e)) 1 & o && (n += e);
            return n
        }
    }, function (t, e, i) {
        var r = i(6)
            , o = i(5)
            , s = i(85)
            , a = 1..toPrecision;
        r(r.P + r.F * (o(function () {
            return "1" !== a.call(1, n)
        }) || !o(function () {
            a.call({})
        })), "Number", {
            toPrecision: function (t) {
                var e = s(this, "Number#toPrecision: incorrect invocation!");
                return t === n ? a.call(e) : a.call(e, t)
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Number", {
            EPSILON: Math.pow(2, -52)
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(2).isFinite;
        i(i.S, "Number", {
            isFinite: function (t) {
                return "number" == typeof t && r(t)
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Number", {
            isInteger: n(91)
        })
    }, function (t, e, n) {
        var i = n(11)
            , r = Math.floor;
        t.exports = function (t) {
            return !i(t) && isFinite(t) && r(t) === t
        }
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Number", {
            isNaN: function (t) {
                return t != t
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(91)
            , o = Math.abs;
        i(i.S, "Number", {
            isSafeInteger: function (t) {
                return r(t) && o(t) <= 9007199254740991
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Number", {
            MAX_SAFE_INTEGER: 9007199254740991
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Number", {
            MIN_SAFE_INTEGER: -9007199254740991
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(97);
        i(i.S + i.F * (Number.parseFloat != r), "Number", {
            parseFloat: r
        })
    }, function (t, e, n) {
        var i = n(2).parseFloat
            , r = n(81).trim;
        t.exports = 1 / i(n(82) + "-0") !== -(1 / 0) ? function (t) {
            var e = r(String(t), 3)
                , n = i(e);
            return 0 === n && "-" == e.charAt(0) ? -0 : n
        } : i
    }, function (t, e, n) {
        var i = n(6)
            , r = n(99);
        i(i.S + i.F * (Number.parseInt != r), "Number", {
            parseInt: r
        })
    }, function (t, e, n) {
        var i = n(2).parseInt
            , r = n(81).trim
            , o = n(82)
            , s = /^[\-+]?0[xX]/;
        t.exports = 8 !== i(o + "08") || 22 !== i(o + "0x16") ? function (t, e) {
            var n = r(String(t), 3);
            return i(n, e >>> 0 || (s.test(n) ? 16 : 10))
        } : i
    }, function (t, e, n) {
        var i = n(6)
            , r = n(99);
        i(i.G + i.F * (parseInt != r), {
            parseInt: r
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(97);
        i(i.G + i.F * (parseFloat != r), {
            parseFloat: r
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(103)
            , o = Math.sqrt
            , s = Math.acosh;
        i(i.S + i.F * !(s && 710 == Math.floor(s(Number.MAX_VALUE)) && s(1 / 0) == 1 / 0), "Math", {
            acosh: function (t) {
                return (t = +t) < 1 ? NaN : t > 94906265.62425156 ? Math.log(t) + Math.LN2 : r(t - 1 + o(t - 1) * o(t + 1))
            }
        })
    }, function (t, e) {
        t.exports = Math.log1p || function (t) {
            return (t = +t) > -1e-8 && 1e-8 > t ? t - t * t / 2 : Math.log(1 + t)
        }
    }, function (t, e, n) {
        function i(t) {
            return isFinite(t = +t) && 0 != t ? 0 > t ? -i(-t) : Math.log(t + Math.sqrt(t * t + 1)) : t
        }
        var r = n(6)
            , o = Math.asinh;
        r(r.S + r.F * !(o && 1 / o(0) > 0), "Math", {
            asinh: i
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = Math.atanh;
        i(i.S + i.F * !(r && 1 / r(-0) < 0), "Math", {
            atanh: function (t) {
                return 0 == (t = +t) ? t : Math.log((1 + t) / (1 - t)) / 2
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(107);
        i(i.S, "Math", {
            cbrt: function (t) {
                return r(t = +t) * Math.pow(Math.abs(t), 1 / 3)
            }
        })
    }, function (t, e) {
        t.exports = Math.sign || function (t) {
            return 0 == (t = +t) || t != t ? t : 0 > t ? -1 : 1
        }
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Math", {
            clz32: function (t) {
                return (t >>>= 0) ? 31 - Math.floor(Math.log(t + .5) * Math.LOG2E) : 32
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = Math.exp;
        i(i.S, "Math", {
            cosh: function (t) {
                return (r(t = +t) + r(-t)) / 2
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(111);
        i(i.S + i.F * (r != Math.expm1), "Math", {
            expm1: r
        })
    }, function (t, e) {
        var n = Math.expm1;
        t.exports = !n || n(10) > 22025.465794806718 || n(10) < 22025.465794806718 || -2e-17 != n(-2e-17) ? function (t) {
            return 0 == (t = +t) ? t : t > -1e-6 && 1e-6 > t ? t + t * t / 2 : Math.exp(t) - 1
        } : n
    }, function (t, e, n) {
        var i = n(6)
            , r = n(107)
            , o = Math.pow
            , s = o(2, -52)
            , a = o(2, -23)
            , l = o(2, 127) * (2 - a)
            , c = o(2, -126)
            , u = function (t) {
                return t + 1 / s - 1 / s
            };
        i(i.S, "Math", {
            fround: function (t) {
                var e, n, i = Math.abs(t)
                    , o = r(t);
                return c > i ? o * u(i / c / a) * c * a : (e = (1 + a / s) * i, n = e - (e - i), n > l || n != n ? o * (1 / 0) : o * n)
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = Math.abs;
        i(i.S, "Math", {
            hypot: function (t, e) {
                for (var n, i, o = 0, s = 0, a = arguments.length, l = 0; a > s;) n = r(arguments[s++]), n > l ? (i = l / n, o = o * i * i + 1, l = n) : n > 0 ? (i = n / l, o += i * i) : o += n;
                return l === 1 / 0 ? 1 / 0 : l * Math.sqrt(o)
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = Math.imul;
        i(i.S + i.F * n(5)(function () {
            return -5 != r(4294967295, 5) || 2 != r.length
        }), "Math", {
            imul: function (t, e) {
                var n = 65535
                    , i = +t
                    , r = +e
                    , o = n & i
                    , s = n & r;
                return 0 | o * s + ((n & i >>> 16) * s + o * (n & r >>> 16) << 16 >>> 0)
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Math", {
            log10: function (t) {
                return Math.log(t) / Math.LN10
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Math", {
            log1p: n(103)
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Math", {
            log2: function (t) {
                return Math.log(t) / Math.LN2
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Math", {
            sign: n(107)
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(111)
            , o = Math.exp;
        i(i.S + i.F * n(5)(function () {
            return -2e-17 != !Math.sinh(-2e-17)
        }), "Math", {
            sinh: function (t) {
                return Math.abs(t = +t) < 1 ? (r(t) - r(-t)) / 2 : (o(t - 1) - o(-t - 1)) * (Math.E / 2)
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(111)
            , o = Math.exp;
        i(i.S, "Math", {
            tanh: function (t) {
                var e = r(t = +t)
                    , n = r(-t);
                return e == 1 / 0 ? 1 : n == 1 / 0 ? -1 : (e - n) / (o(t) + o(-t))
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Math", {
            trunc: function (t) {
                return (t > 0 ? Math.floor : Math.ceil)(t)
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(37)
            , o = String.fromCharCode
            , s = String.fromCodePoint;
        i(i.S + i.F * (!!s && 1 != s.length), "String", {
            fromCodePoint: function (t) {
                for (var e, n = [], i = arguments.length, s = 0; i > s;) {
                    if (e = +arguments[s++], r(e, 1114111) !== e) throw RangeError(e + " is not a valid code point");
                    n.push(65536 > e ? o(e) : o(((e -= 65536) >> 10) + 55296, e % 1024 + 56320))
                }
                return n.join("")
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(30)
            , o = n(35);
        i(i.S, "String", {
            raw: function (t) {
                for (var e = r(t.raw), n = o(e.length), i = arguments.length, s = [], a = 0; n > a;) s.push(String(e[a++])), i > a && s.push(String(arguments[a]));
                return s.join("")
            }
        })
    }, function (t, e, n) {
        n(81)("trim", function (t) {
            return function () {
                return t(this, 3)
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(126)(!1);
        i(i.P, "String", {
            codePointAt: function (t) {
                return r(this, t)
            }
        })
    }, function (t, e, i) {
        var r = i(36)
            , o = i(33);
        t.exports = function (t) {
            return function (e, i) {
                var s, a, l = String(o(e))
                    , c = r(i)
                    , u = l.length;
                return 0 > c || c >= u ? t ? "" : n : (s = l.charCodeAt(c), 55296 > s || s > 56319 || c + 1 === u || (a = l.charCodeAt(c + 1)) < 56320 || a > 57343 ? t ? l.charAt(c) : s : t ? l.slice(c, c + 2) : (s - 55296 << 10) + (a - 56320) + 65536)
            }
        }
    }, function (t, e, i) {
        var r = i(6)
            , o = i(35)
            , s = i(128)
            , a = "endsWith"
            , l = "" [a];
        r(r.P + r.F * i(130)(a), "String", {
            endsWith: function (t) {
                var e = s(this, t, a)
                    , i = arguments.length > 1 ? arguments[1] : n
                    , r = o(e.length)
                    , c = i === n ? r : Math.min(o(i), r)
                    , u = String(t);
                return l ? l.call(e, u, c) : e.slice(c - u.length, c) === u
            }
        })
    }, function (t, e, n) {
        var i = n(129)
            , r = n(33);
        t.exports = function (t, e, n) {
            if (i(e)) throw TypeError("String#" + n + " doesn't accept regex!");
            return String(r(t))
        }
    }, function (t, e, i) {
        var r = i(11)
            , o = i(32)
            , s = i(23)("match");
        t.exports = function (t) {
            var e;
            return r(t) && ((e = t[s]) !== n ? !!e : "RegExp" == o(t))
        }
    }, function (t, e, n) {
        var i = n(23)("match");
        t.exports = function (t) {
            var e = /./;
            try {
                "/./" [t](e)
            }
            catch (n) {
                try {
                    return e[i] = !1, !"/./" [t](e)
                }
                catch (t) {}
            }
            return !0
        }
    }, function (t, e, i) {
        var r = i(6)
            , o = i(128)
            , s = "includes";
        r(r.P + r.F * i(130)(s), "String", {
            includes: function (t) {
                return !!~o(this, t, s).indexOf(t, arguments.length > 1 ? arguments[1] : n)
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.P, "String", {
            repeat: n(86)
        })
    }, function (t, e, i) {
        var r = i(6)
            , o = i(35)
            , s = i(128)
            , a = "startsWith"
            , l = "" [a];
        r(r.P + r.F * i(130)(a), "String", {
            startsWith: function (t) {
                var e = s(this, t, a)
                    , i = o(Math.min(arguments.length > 1 ? arguments[1] : n, e.length))
                    , r = String(t);
                return l ? l.call(e, r, i) : e.slice(i, i + r.length) === r
            }
        })
    }, function (t, e, i) {
        var r = i(126)(!0);
        i(135)(String, "String", function (t) {
            this._t = String(t), this._i = 0
        }, function () {
            var t, e = this._t
                , i = this._i;
            return i >= e.length ? {
                value: n
                , done: !0
            } : (t = r(e, i), this._i += t.length, {
                value: t
                , done: !1
            })
        })
    }, function (t, e, i) {
        var r = i(26)
            , o = i(6)
            , s = i(16)
            , a = i(8)
            , l = i(3)
            , c = i(136)
            , u = i(137)
            , h = i(22)
            , f = i(57)
            , p = i(23)("iterator")
            , d = !([].keys && "next" in [].keys())
            , g = "@@iterator"
            , v = "keys"
            , y = "values"
            , m = function () {
                return this
            };
        t.exports = function (t, e, i, x, b, w, k) {
            u(i, e, x);
            var S, T, A, C = function (t) {
                    if (!d && t in L) return L[t];
                    switch (t) {
                    case v:
                        return function () {
                            return new i(this, t)
                        };
                    case y:
                        return function () {
                            return new i(this, t)
                        }
                    }
                    return function () {
                        return new i(this, t)
                    }
                }
                , P = e + " Iterator"
                , E = b == y
                , M = !1
                , L = t.prototype
                , O = L[p] || L[g] || b && L[b]
                , D = O || C(b)
                , _ = b ? E ? C("entries") : D : n
                , I = "Array" == e ? L.entries || O : O;
            if (I && (A = f(I.call(new t)), A !== Object.prototype && (h(A, P, !0), r || l(A, p) || a(A, p, m))), E && O && O.name !== y && (M = !0, D = function () {
                    return O.call(this)
                }), r && !k || !d && !M && L[p] || a(L, p, D), c[e] = D, c[P] = m, b)
                if (S = {
                        values: E ? D : C(y)
                        , keys: w ? D : C(v)
                        , entries: _
                    }, k)
                    for (T in S) T in L || s(L, T, S[T]);
                else o(o.P + o.F * (d || M), e, S);
            return S
        }
    }, function (t, e) {
        t.exports = {}
    }, function (t, e, n) {
        var i = n(44)
            , r = n(15)
            , o = n(22)
            , s = {};
        n(8)(s, n(23)("iterator"), function () {
            return this
        }), t.exports = function (t, e, n) {
            t.prototype = i(s, {
                next: r(1, n)
            }), o(t, e + " Iterator")
        }
    }, function (t, e, n) {
        n(139)("anchor", function (t) {
            return function (e) {
                return t(this, "a", "name", e)
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(5)
            , o = n(33)
            , s = /"/g
            , a = function (t, e, n, i) {
                var r = String(o(t))
                    , a = "<" + e;
                return "" !== n && (a += " " + n + '="' + String(i).replace(s, "&quot;") + '"'), a + ">" + r + "</" + e + ">"
            };
        t.exports = function (t, e) {
            var n = {};
            n[t] = e(a), i(i.P + i.F * r(function () {
                var e = "" [t]('"');
                return e !== e.toLowerCase() || e.split('"').length > 3
            }), "String", n)
        }
    }, function (t, e, n) {
        n(139)("big", function (t) {
            return function () {
                return t(this, "big", "", "")
            }
        })
    }, function (t, e, n) {
        n(139)("blink", function (t) {
            return function () {
                return t(this, "blink", "", "")
            }
        })
    }, function (t, e, n) {
        n(139)("bold", function (t) {
            return function () {
                return t(this, "b", "", "")
            }
        })
    }, function (t, e, n) {
        n(139)("fixed", function (t) {
            return function () {
                return t(this, "tt", "", "")
            }
        })
    }, function (t, e, n) {
        n(139)("fontcolor", function (t) {
            return function (e) {
                return t(this, "font", "color", e)
            }
        })
    }, function (t, e, n) {
        n(139)("fontsize", function (t) {
            return function (e) {
                return t(this, "font", "size", e)
            }
        })
    }, function (t, e, n) {
        n(139)("italics", function (t) {
            return function () {
                return t(this, "i", "", "")
            }
        })
    }, function (t, e, n) {
        n(139)("link", function (t) {
            return function (e) {
                return t(this, "a", "href", e)
            }
        })
    }, function (t, e, n) {
        n(139)("small", function (t) {
            return function () {
                return t(this, "small", "", "")
            }
        })
    }, function (t, e, n) {
        n(139)("strike", function (t) {
            return function () {
                return t(this, "strike", "", "")
            }
        })
    }, function (t, e, n) {
        n(139)("sub", function (t) {
            return function () {
                return t(this, "sub", "", "")
            }
        })
    }, function (t, e, n) {
        n(139)("sup", function (t) {
            return function () {
                return t(this, "sup", "", "")
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Array", {
            isArray: n(43)
        })
    }, function (t, e, i) {
        var r = i(18)
            , o = i(6)
            , s = i(56)
            , a = i(154)
            , l = i(155)
            , c = i(35)
            , u = i(156)
            , h = i(157);
        o(o.S + o.F * !i(158)(function (t) {
            Array.from(t)
        }), "Array", {
            from: function (t) {
                var e, i, o, f, p = s(t)
                    , d = "function" == typeof this ? this : Array
                    , g = arguments.length
                    , v = g > 1 ? arguments[1] : n
                    , y = v !== n
                    , m = 0
                    , x = h(p);
                if (y && (v = r(v, g > 2 ? arguments[2] : n, 2)), x == n || d == Array && l(x))
                    for (e = c(p.length), i = new d(e); e > m; m++) u(i, m, y ? v(p[m], m) : p[m]);
                else
                    for (f = x.call(p), i = new d; !(o = f.next()).done; m++) u(i, m, y ? a(f, v, [o.value, m], !0) : o.value);
                return i.length = m, i
            }
        })
    }, function (t, e, i) {
        var r = i(10);
        t.exports = function (t, e, i, o) {
            try {
                return o ? e(r(i)[0], i[1]) : e(i)
            }
            catch (e) {
                var s = t.return;
                throw s !== n && r(s.call(t)), e
            }
        }
    }, function (t, e, i) {
        var r = i(136)
            , o = i(23)("iterator")
            , s = Array.prototype;
        t.exports = function (t) {
            return t !== n && (r.Array === t || s[o] === t)
        }
    }, function (t, e, n) {
        var i = n(9)
            , r = n(15);
        t.exports = function (t, e, n) {
            e in t ? i.f(t, e, r(0, n)) : t[e] = n
        }
    }, function (t, e, i) {
        var r = i(73)
            , o = i(23)("iterator")
            , s = i(136);
        t.exports = i(7).getIteratorMethod = function (t) {
            return t != n ? t[o] || t["@@iterator"] || s[r(t)] : void 0
        }
    }, function (t, e, n) {
        var i = n(23)("iterator")
            , r = !1;
        try {
            var o = [7][i]();
            o.return = function () {
                r = !0
            }, Array.from(o, function () {
                throw 2
            })
        }
        catch (t) {}
        t.exports = function (t, e) {
            if (!e && !r) return !1;
            var n = !1;
            try {
                var o = [7]
                    , s = o[i]();
                s.next = function () {
                    return {
                        done: n = !0
                    }
                }, o[i] = function () {
                    return s
                }, t(o)
            }
            catch (t) {}
            return n
        }
    }, function (t, e, n) {
        var i = n(6)
            , r = n(156);
        i(i.S + i.F * n(5)(function () {
            function t() {}
            return !(Array.of.call(t) instanceof t)
        }), "Array", {
            of: function () {
                for (var t = 0, e = arguments.length, n = new("function" == typeof this ? this : Array)(e); e > t;) r(n, t, arguments[t++]);
                return n.length = e, n
            }
        })
    }, function (t, e, i) {
        var r = i(6)
            , o = i(30)
            , s = [].join;
        r(r.P + r.F * (i(31) != Object || !i(161)(s)), "Array", {
            join: function (t) {
                return s.call(o(this), t === n ? "," : t)
            }
        })
    }, function (t, e, n) {
        var i = n(5);
        t.exports = function (t, e) {
            return !!t && i(function () {
                e ? t.call(null, function () {}, 1) : t.call(null)
            })
        }
    }, function (t, e, i) {
        var r = i(6)
            , o = i(46)
            , s = i(32)
            , a = i(37)
            , l = i(35)
            , c = [].slice;
        r(r.P + r.F * i(5)(function () {
            o && c.call(o)
        }), "Array", {
            slice: function (t, e) {
                var i = l(this.length)
                    , r = s(this);
                if (e = e === n ? i : e, "Array" == r) return c.call(this, t, e);
                for (var o = a(t, i), u = a(e, i), h = l(u - o), f = Array(h), p = 0; h > p; p++) f[p] = "String" == r ? this.charAt(o + p) : this[o + p];
                return f
            }
        })
    }, function (t, e, i) {
        var r = i(6)
            , o = i(19)
            , s = i(56)
            , a = i(5)
            , l = [].sort
            , c = [1, 2, 3];
        r(r.P + r.F * (a(function () {
            c.sort(n)
        }) || !a(function () {
            c.sort(null)
        }) || !i(161)(l)), "Array", {
            sort: function (t) {
                return t === n ? l.call(s(this)) : l.call(s(this), o(t))
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(165)(0)
            , o = n(161)([].forEach, !0);
        i(i.P + i.F * !o, "Array", {
            forEach: function (t) {
                return r(this, t, arguments[1])
            }
        })
    }, function (t, e, i) {
        var r = i(18)
            , o = i(31)
            , s = i(56)
            , a = i(35)
            , l = i(166);
        t.exports = function (t, e) {
            var i = 1 == t
                , c = 2 == t
                , u = 3 == t
                , h = 4 == t
                , f = 6 == t
                , p = 5 == t || f
                , d = e || l;
            return function (e, l, g) {
                for (var v, y, m = s(e), x = o(m), b = r(l, g, 3), w = a(x.length), k = 0, S = i ? d(e, w) : c ? d(e, 0) : n; w > k; k++)
                    if ((p || k in x) && (v = x[k], y = b(v, k, m), t))
                        if (i) S[k] = y;
                        else if (y) switch (t) {
                case 3:
                    return !0;
                case 5:
                    return v;
                case 6:
                    return k;
                case 2:
                    S.push(v)
                }
                else if (h) return !1;
                return f ? -1 : u || h ? h : S
            }
        }
    }, function (t, e, n) {
        var i = n(167);
        t.exports = function (t, e) {
            return new(i(t))(e)
        }
    }, function (t, e, i) {
        var r = i(11)
            , o = i(43)
            , s = i(23)("species");
        t.exports = function (t) {
            var e;
            return o(t) && (e = t.constructor, "function" != typeof e || e !== Array && !o(e.prototype) || (e = n), r(e) && (e = e[s], null === e && (e = n))), e === n ? Array : e
        }
    }, function (t, e, n) {
        var i = n(6)
            , r = n(165)(1);
        i(i.P + i.F * !n(161)([].map, !0), "Array", {
            map: function (t) {
                return r(this, t, arguments[1])
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(165)(2);
        i(i.P + i.F * !n(161)([].filter, !0), "Array", {
            filter: function (t) {
                return r(this, t, arguments[1])
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(165)(3);
        i(i.P + i.F * !n(161)([].some, !0), "Array", {
            some: function (t) {
                return r(this, t, arguments[1])
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(165)(4);
        i(i.P + i.F * !n(161)([].every, !0), "Array", {
            every: function (t) {
                return r(this, t, arguments[1])
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(173);
        i(i.P + i.F * !n(161)([].reduce, !0), "Array", {
            reduce: function (t) {
                return r(this, t, arguments.length, arguments[1], !1)
            }
        })
    }, function (t, e, n) {
        var i = n(19)
            , r = n(56)
            , o = n(31)
            , s = n(35);
        t.exports = function (t, e, n, a, l) {
            i(e);
            var c = r(t)
                , u = o(c)
                , h = s(c.length)
                , f = l ? h - 1 : 0
                , p = l ? -1 : 1;
            if (2 > n)
                for (;;) {
                    if (f in u) {
                        a = u[f], f += p;
                        break
                    }
                    if (f += p, l ? 0 > f : f >= h) throw TypeError("Reduce of empty array with no initial value")
                }
            for (; l ? f >= 0 : h > f; f += p) f in u && (a = e(a, u[f], f, c));
            return a
        }
    }, function (t, e, n) {
        var i = n(6)
            , r = n(173);
        i(i.P + i.F * !n(161)([].reduceRight, !0), "Array", {
            reduceRight: function (t) {
                return r(this, t, arguments.length, arguments[1], !0)
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(34)(!1)
            , o = [].indexOf
            , s = !!o && 1 / [1].indexOf(1, -0) < 0;
        i(i.P + i.F * (s || !n(161)(o)), "Array", {
            indexOf: function (t) {
                return s ? o.apply(this, arguments) || 0 : r(this, t, arguments[1])
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(30)
            , o = n(36)
            , s = n(35)
            , a = [].lastIndexOf
            , l = !!a && 1 / [1].lastIndexOf(1, -0) < 0;
        i(i.P + i.F * (l || !n(161)(a)), "Array", {
            lastIndexOf: function (t) {
                if (l) return a.apply(this, arguments) || 0;
                var e = r(this)
                    , n = s(e.length)
                    , i = n - 1;
                for (arguments.length > 1 && (i = Math.min(i, o(arguments[1]))), 0 > i && (i = n + i); i >= 0; i--)
                    if (i in e && e[i] === t) return i || 0;
                return -1
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.P, "Array", {
            copyWithin: n(178)
        }), n(179)("copyWithin")
    }, function (t, e, i) {
        var r = i(56)
            , o = i(37)
            , s = i(35);
        t.exports = [].copyWithin || function (t, e) {
            var i = r(this)
                , a = s(i.length)
                , l = o(t, a)
                , c = o(e, a)
                , u = arguments.length > 2 ? arguments[2] : n
                , h = Math.min((u === n ? a : o(u, a)) - c, a - l)
                , f = 1;
            for (l > c && c + h > l && (f = -1, c += h - 1, l += h - 1); h-- > 0;) c in i ? i[l] = i[c] : delete i[l], l += f, c += f;
            return i
        }
    }, function (t, e, i) {
        var r = i(23)("unscopables")
            , o = Array.prototype;
        o[r] == n && i(8)(o, r, {}), t.exports = function (t) {
            o[r][t] = !0
        }
    }, function (t, e, n) {
        var i = n(6);
        i(i.P, "Array", {
            fill: n(181)
        }), n(179)("fill")
    }, function (t, e, i) {
        var r = i(56)
            , o = i(37)
            , s = i(35);
        t.exports = function (t) {
            for (var e = r(this), i = s(e.length), a = arguments.length, l = o(a > 1 ? arguments[1] : n, i), c = a > 2 ? arguments[2] : n, u = c === n ? i : o(c, i); u > l;) e[l++] = t;
            return e
        }
    }, function (t, e, i) {
        var r = i(6)
            , o = i(165)(5)
            , s = "find"
            , a = !0;
        s in [] && Array(1)[s](function () {
            a = !1
        }), r(r.P + r.F * a, "Array", {
            find: function (t) {
                return o(this, t, arguments.length > 1 ? arguments[1] : n)
            }
        }), i(179)(s)
    }, function (t, e, i) {
        var r = i(6)
            , o = i(165)(6)
            , s = "findIndex"
            , a = !0;
        s in [] && Array(1)[s](function () {
            a = !1
        }), r(r.P + r.F * a, "Array", {
            findIndex: function (t) {
                return o(this, t, arguments.length > 1 ? arguments[1] : n)
            }
        }), i(179)(s)
    }, function (t, e, i) {
        var r = i(179)
            , o = i(185)
            , s = i(136)
            , a = i(30);
        t.exports = i(135)(Array, "Array", function (t, e) {
            this._t = a(t), this._i = 0, this._k = e
        }, function () {
            var t = this._t
                , e = this._k
                , i = this._i++;
            return !t || i >= t.length ? (this._t = n, o(1)) : "keys" == e ? o(0, i) : "values" == e ? o(0, t[i]) : o(0, [i, t[i]])
        }, "values"), s.Arguments = s.Array, r("keys"), r("values"), r("entries")
    }, function (t, e) {
        t.exports = function (t, e) {
            return {
                value: e
                , done: !!t
            }
        }
    }, function (t, e, n) {
        n(187)("Array")
    }, function (t, e, n) {
        var i = n(2)
            , r = n(9)
            , o = n(4)
            , s = n(23)("species");
        t.exports = function (t) {
            var e = i[t];
            o && e && !e[s] && r.f(e, s, {
                configurable: !0
                , get: function () {
                    return this
                }
            })
        }
    }, function (t, e, i) {
        var r = i(2)
            , o = i(80)
            , s = i(9).f
            , a = i(48).f
            , l = i(129)
            , c = i(189)
            , u = r.RegExp
            , h = u
            , f = u.prototype
            , p = /a/g
            , d = /a/g
            , g = new u(p) !== p;
        if (i(4) && (!g || i(5)(function () {
                return d[i(23)("match")] = !1, u(p) != p || u(d) == d || "/a/i" != u(p, "i")
            }))) {
            u = function (t, e) {
                var i = this instanceof u
                    , r = l(t)
                    , s = e === n;
                return !i && r && t.constructor === u && s ? t : o(g ? new h(r && !s ? t.source : t, e) : h((r = t instanceof u) ? t.source : t, r && s ? c.call(t) : e), i ? this : f, u)
            };
            for (var v = (function (t) {
                    t in u || s(u, t, {
                        configurable: !0
                        , get: function () {
                            return h[t]
                        }
                        , set: function (e) {
                            h[t] = e
                        }
                    })
                }), y = a(h), m = 0; y.length > m;) v(y[m++]);
            f.constructor = u, u.prototype = f, i(16)(r, "RegExp", u)
        }
        i(187)("RegExp")
    }, function (t, e, n) {
        var i = n(10);
        t.exports = function () {
            var t = i(this)
                , e = "";
            return t.global && (e += "g"), t.ignoreCase && (e += "i"), t.multiline && (e += "m"), t.unicode && (e += "u"), t.sticky && (e += "y"), e
        }
    }, function (t, e, i) {
        i(191);
        var r = i(10)
            , o = i(189)
            , s = i(4)
            , a = "toString"
            , l = /./ [a]
            , c = function (t) {
                i(16)(RegExp.prototype, a, t, !0)
            };
        i(5)(function () {
            return "/a/b" != l.call({
                source: "a"
                , flags: "b"
            })
        }) ? c(function () {
            var t = r(this);
            return "/".concat(t.source, "/", "flags" in t ? t.flags : !s && t instanceof RegExp ? o.call(t) : n)
        }) : l.name != a && c(function () {
            return l.call(this)
        })
    }, function (t, e, n) {
        n(4) && "g" != /./g.flags && n(9).f(RegExp.prototype, "flags", {
            configurable: !0
            , get: n(189)
        })
    }, function (t, e, i) {
        i(193)("match", 1, function (t, e, i) {
            return [function (i) {
                var r = t(this)
                    , o = i == n ? n : i[e];
                return o !== n ? o.call(i, r) : new RegExp(i)[e](String(r))
            }, i]
        })
    }, function (t, e, n) {
        var i = n(8)
            , r = n(16)
            , o = n(5)
            , s = n(33)
            , a = n(23);
        t.exports = function (t, e, n) {
            var l = a(t)
                , c = n(s, l, "" [t])
                , u = c[0]
                , h = c[1];
            o(function () {
                var e = {};
                return e[l] = function () {
                    return 7
                }, 7 != "" [t](e)
            }) && (r(String.prototype, t, u), i(RegExp.prototype, l, 2 == e ? function (t, e) {
                return h.call(t, this, e)
            } : function (t) {
                return h.call(t, this)
            }))
        }
    }, function (t, e, i) {
        i(193)("replace", 2, function (t, e, i) {
            return [function (r, o) {
                var s = t(this)
                    , a = r == n ? n : r[e];
                return a !== n ? a.call(r, s, o) : i.call(String(s), r, o)
            }, i]
        })
    }, function (t, e, i) {
        i(193)("search", 1, function (t, e, i) {
            return [function (i) {
                var r = t(this)
                    , o = i == n ? n : i[e];
                return o !== n ? o.call(i, r) : new RegExp(i)[e](String(r))
            }, i]
        })
    }, function (t, e, i) {
        i(193)("split", 2, function (t, e, r) {
            var o = i(129)
                , s = r
                , a = [].push
                , l = "split"
                , c = "length"
                , u = "lastIndex";
            if ("c" == "abbc" [l](/(b)*/)[1] || 4 != "test" [l](/(?:)/, -1)[c] || 2 != "ab" [l](/(?:ab)*/)[c] || 4 != "." [l](/(.?)(.?)/)[c] || "." [l](/()()/)[c] > 1 || "" [l](/.?/)[c]) {
                var h = /()??/.exec("")[1] === n;
                r = function (t, e) {
                    var i = String(this);
                    if (t === n && 0 === e) return [];
                    if (!o(t)) return s.call(i, t, e);
                    var r, l, f, p, d, g = []
                        , v = (t.ignoreCase ? "i" : "") + (t.multiline ? "m" : "") + (t.unicode ? "u" : "") + (t.sticky ? "y" : "")
                        , y = 0
                        , m = e === n ? 4294967295 : e >>> 0
                        , x = new RegExp(t.source, v + "g");
                    for (h || (r = new RegExp("^" + x.source + "$(?!\\s)", v));
                        (l = x.exec(i)) && (f = l.index + l[0][c], !(f > y && (g.push(i.slice(y, l.index)), !h && l[c] > 1 && l[0].replace(r, function () {
                            for (d = 1; arguments[c] - 2 > d; d++) arguments[d] === n && (l[d] = n)
                        }), l[c] > 1 && i[c] > l.index && a.apply(g, l.slice(1)), p = l[0][c], y = f, g[c] >= m)));) x[u] === l.index && x[u]++;
                    return y === i[c] ? !p && x.test("") || g.push("") : g.push(i.slice(y)), g[c] > m ? g.slice(0, m) : g
                }
            }
            else "0" [l](n, 0)[c] && (r = function (t, e) {
                return t === n && 0 === e ? [] : s.call(this, t, e)
            });
            return [function (i, o) {
                var s = t(this)
                    , a = i == n ? n : i[e];
                return a !== n ? a.call(i, s, o) : r.call(String(s), i, o)
            }, r]
        })
    }, function (t, e, i) {
        var r, o, s, a = i(26)
            , l = i(2)
            , c = i(18)
            , u = i(73)
            , h = i(6)
            , f = i(11)
            , p = (i(10), i(19))
            , d = i(84)
            , g = i(198)
            , v = (i(71).set, i(199))
            , y = i(200).set
            , m = i(201)()
            , x = "Promise"
            , b = l.TypeError
            , w = l.process
            , k = l[x]
            , w = l.process
            , S = "process" == u(w)
            , T = function () {}
            , A = !! function () {
                try {
                    var t = k.resolve(1)
                        , e = (t.constructor = {})[i(23)("species")] = function (t) {
                            t(T, T)
                        };
                    return (S || "function" == typeof PromiseRejectionEvent) && t.then(T) instanceof e
                }
                catch (t) {}
            }()
            , C = function (t, e) {
                return t === e || t === k && e === s
            }
            , P = function (t) {
                var e;
                return !(!f(t) || "function" != typeof (e = t.then)) && e
            }
            , E = function (t) {
                return C(k, t) ? new M(t) : new o(t)
            }
            , M = o = function (t) {
                var e, i;
                this.promise = new t(function (t, r) {
                    if (e !== n || i !== n) throw b("Bad Promise constructor");
                    e = t, i = r
                }), this.resolve = p(e), this.reject = p(i)
            }
            , L = function (t) {
                try {
                    t()
                }
                catch (t) {
                    return {
                        error: t
                    }
                }
            }
            , O = function (t, e) {
                if (!t._n) {
                    t._n = !0;
                    var n = t._c;
                    m(function () {
                        for (var i = t._v, r = 1 == t._s, o = 0, s = function (e) {
                                var n, o, s = r ? e.ok : e.fail
                                    , a = e.resolve
                                    , l = e.reject
                                    , c = e.domain;
                                try {
                                    s ? (r || (2 == t._h && I(t), t._h = 1), s === !0 ? n = i : (c && c.enter(), n = s(i), c && c.exit()), n === e.promise ? l(b("Promise-chain cycle")) : (o = P(n)) ? o.call(n, a, l) : a(n)) : l(i)
                                }
                                catch (t) {
                                    l(t)
                                }
                            }; n.length > o;) s(n[o++]);
                        t._c = [], t._n = !1, e && !t._h && D(t)
                    })
                }
            }
            , D = function (t) {
                y.call(l, function () {
                    var e, i, r, o = t._v;
                    if (_(t) && (e = L(function () {
                            S ? w.emit("unhandledRejection", o, t) : (i = l.onunhandledrejection) ? i({
                                promise: t
                                , reason: o
                            }) : (r = l.console) && r.error && r.error("Unhandled promise rejection", o)
                        }), t._h = S || _(t) ? 2 : 1), t._a = n, e) throw e.error
                })
            }
            , _ = function (t) {
                if (1 == t._h) return !1;
                for (var e, n = t._a || t._c, i = 0; n.length > i;)
                    if (e = n[i++], e.fail || !_(e.promise)) return !1;
                return !0
            }
            , I = function (t) {
                y.call(l, function () {
                    var e;
                    S ? w.emit("rejectionHandled", t) : (e = l.onrejectionhandled) && e({
                        promise: t
                        , reason: t._v
                    })
                })
            }
            , N = function (t) {
                var e = this;
                e._d || (e._d = !0, e = e._w || e, e._v = t, e._s = 2, e._a || (e._a = e._c.slice()), O(e, !0))
            }
            , F = function (t) {
                var e, n = this;
                if (!n._d) {
                    n._d = !0, n = n._w || n;
                    try {
                        if (n === t) throw b("Promise can't be resolved itself");
                        (e = P(t)) ? m(function () {
                            var i = {
                                _w: n
                                , _d: !1
                            };
                            try {
                                e.call(t, c(F, i, 1), c(N, i, 1))
                            }
                            catch (t) {
                                N.call(i, t)
                            }
                        }): (n._v = t, n._s = 1, O(n, !1))
                    }
                    catch (t) {
                        N.call({
                            _w: n
                            , _d: !1
                        }, t)
                    }
                }
            };
        A || (k = function (t) {
            d(this, k, x, "_h"), p(t), r.call(this);
            try {
                t(c(F, this, 1), c(N, this, 1))
            }
            catch (t) {
                N.call(this, t)
            }
        }, r = function (t) {
            this._c = [], this._a = n, this._s = 0, this._d = !1, this._v = n, this._h = 0, this._n = !1
        }, r.prototype = i(202)(k.prototype, {
            then: function (t, e) {
                var i = E(v(this, k));
                return i.ok = "function" != typeof t || t, i.fail = "function" == typeof e && e, i.domain = S ? w.domain : n, this._c.push(i), this._a && this._a.push(i), this._s && O(this, !1), i.promise
            }
            , catch: function (t) {
                return this.then(n, t)
            }
        }), M = function () {
            var t = new r;
            this.promise = t, this.resolve = c(F, t, 1), this.reject = c(N, t, 1)
        }), h(h.G + h.W + h.F * !A, {
            Promise: k
        }), i(22)(k, x), i(187)(x), s = i(7)[x], h(h.S + h.F * !A, x, {
            reject: function (t) {
                var e = E(this)
                    , n = e.reject;
                return n(t), e.promise
            }
        }), h(h.S + h.F * (a || !A), x, {
            resolve: function (t) {
                if (t instanceof k && C(t.constructor, this)) return t;
                var e = E(this)
                    , n = e.resolve;
                return n(t), e.promise
            }
        }), h(h.S + h.F * !(A && i(158)(function (t) {
            k.all(t).catch(T)
        })), x, {
            all: function (t) {
                var e = this
                    , i = E(e)
                    , r = i.resolve
                    , o = i.reject
                    , s = L(function () {
                        var i = []
                            , s = 0
                            , a = 1;
                        g(t, !1, function (t) {
                            var l = s++
                                , c = !1;
                            i.push(n), a++, e.resolve(t).then(function (t) {
                                c || (c = !0, i[l] = t, --a || r(i))
                            }, o)
                        }), --a || r(i)
                    });
                return s && o(s.error), i.promise
            }
            , race: function (t) {
                var e = this
                    , n = E(e)
                    , i = n.reject
                    , r = L(function () {
                        g(t, !1, function (t) {
                            e.resolve(t).then(n.resolve, i)
                        })
                    });
                return r && i(r.error), n.promise
            }
        })
    }, function (t, e, n) {
        var i = n(18)
            , r = n(154)
            , o = n(155)
            , s = n(10)
            , a = n(35)
            , l = n(157)
            , c = {}
            , u = {}
            , e = t.exports = function (t, e, n, h, f) {
                var p, d, g, v, y = f ? function () {
                        return t
                    } : l(t)
                    , m = i(n, h, e ? 2 : 1)
                    , x = 0;
                if ("function" != typeof y) throw TypeError(t + " is not iterable!");
                if (o(y)) {
                    for (p = a(t.length); p > x; x++)
                        if (v = e ? m(s(d = t[x])[0], d[1]) : m(t[x]), v === c || v === u) return v
                }
                else
                    for (g = y.call(t); !(d = g.next()).done;)
                        if (v = r(g, m, d.value, e), v === c || v === u) return v
            };
        e.BREAK = c, e.RETURN = u
    }, function (t, e, i) {
        var r = i(10)
            , o = i(19)
            , s = i(23)("species");
        t.exports = function (t, e) {
            var i, a = r(t).constructor;
            return a === n || (i = r(a)[s]) == n ? e : o(i)
        }
    }, function (t, e, n) {
        var i, r, o, s = n(18)
            , a = n(76)
            , l = n(46)
            , c = n(13)
            , u = n(2)
            , h = u.process
            , f = u.setImmediate
            , p = u.clearImmediate
            , d = u.MessageChannel
            , g = 0
            , v = {}
            , y = "onreadystatechange"
            , m = function () {
                var t = +this;
                if (v.hasOwnProperty(t)) {
                    var e = v[t];
                    delete v[t], e()
                }
            }
            , x = function (t) {
                m.call(t.data)
            };
        f && p || (f = function (t) {
            for (var e = [], n = 1; arguments.length > n;) e.push(arguments[n++]);
            return v[++g] = function () {
                a("function" == typeof t ? t : Function(t), e)
            }, i(g), g
        }, p = function (t) {
            delete v[t]
        }, "process" == n(32)(h) ? i = function (t) {
            h.nextTick(s(m, t, 1))
        } : d ? (r = new d, o = r.port2, r.port1.onmessage = x, i = s(o.postMessage, o, 1)) : u.addEventListener && "function" == typeof postMessage && !u.importScripts ? (i = function (t) {
            u.postMessage(t + "", "*")
        }, u.addEventListener("message", x, !1)) : i = y in c("script") ? function (t) {
            l.appendChild(c("script"))[y] = function () {
                l.removeChild(this), m.call(t)
            }
        } : function (t) {
            setTimeout(s(m, t, 1), 0)
        }), t.exports = {
            set: f
            , clear: p
        }
    }, function (t, e, i) {
        var r = i(2)
            , o = i(200).set
            , s = r.MutationObserver || r.WebKitMutationObserver
            , a = r.process
            , l = r.Promise
            , c = "process" == i(32)(a);
        t.exports = function () {
            var t, e, i, u = function () {
                var r, o;
                for (c && (r = a.domain) && r.exit(); t;) {
                    o = t.fn, t = t.next;
                    try {
                        o()
                    }
                    catch (r) {
                        throw t ? i() : e = n, r
                    }
                }
                e = n, r && r.enter()
            };
            if (c) i = function () {
                a.nextTick(u)
            };
            else if (s) {
                var h = !0
                    , f = document.createTextNode("");
                new s(u).observe(f, {
                    characterData: !0
                }), i = function () {
                    f.data = h = !h
                }
            }
            else if (l && l.resolve) {
                var p = l.resolve();
                i = function () {
                    p.then(u)
                }
            }
            else i = function () {
                o.call(r, u)
            };
            return function (r) {
                var o = {
                    fn: r
                    , next: n
                };
                e && (e.next = o), t || (t = o, i()), e = o
            }
        }
    }, function (t, e, n) {
        var i = n(16);
        t.exports = function (t, e, n) {
            for (var r in e) i(t, r, e[r], n);
            return t
        }
    }, function (t, e, i) {
        var r = i(204);
        t.exports = i(205)("Map", function (t) {
            return function () {
                return t(this, arguments.length > 0 ? arguments[0] : n)
            }
        }, {
            get: function (t) {
                var e = r.getEntry(this, t);
                return e && e.v
            }
            , set: function (t, e) {
                return r.def(this, 0 === t ? 0 : t, e)
            }
        }, r, !0)
    }, function (t, e, i) {
        var r = i(9).f
            , o = i(44)
            , s = (i(8), i(202))
            , a = i(18)
            , l = i(84)
            , c = i(33)
            , u = i(198)
            , h = i(135)
            , f = i(185)
            , p = i(187)
            , d = i(4)
            , g = i(20).fastKey
            , v = d ? "_s" : "size"
            , y = function (t, e) {
                var n, i = g(e);
                if ("F" !== i) return t._i[i];
                for (n = t._f; n; n = n.n)
                    if (n.k == e) return n
            };
        t.exports = {
            getConstructor: function (t, e, i, h) {
                var f = t(function (t, r) {
                    l(t, f, e, "_i"), t._i = o(null), t._f = n, t._l = n, t[v] = 0, r != n && u(r, i, t[h], t)
                });
                return s(f.prototype, {
                    clear: function () {
                        for (var t = this, e = t._i, i = t._f; i; i = i.n) i.r = !0, i.p && (i.p = i.p.n = n), delete e[i.i];
                        t._f = t._l = n, t[v] = 0
                    }
                    , delete: function (t) {
                        var e = this
                            , n = y(e, t);
                        if (n) {
                            var i = n.n
                                , r = n.p;
                            delete e._i[n.i], n.r = !0, r && (r.n = i), i && (i.p = r), e._f == n && (e._f = i), e._l == n && (e._l = r), e[v]--
                        }
                        return !!n
                    }
                    , forEach: function (t) {
                        l(this, f, "forEach");
                        for (var e, i = a(t, arguments.length > 1 ? arguments[1] : n, 3); e = e ? e.n : this._f;)
                            for (i(e.v, e.k, this); e && e.r;) e = e.p
                    }
                    , has: function (t) {
                        return !!y(this, t)
                    }
                }), d && r(f.prototype, "size", {
                    get: function () {
                        return c(this[v])
                    }
                }), f
            }
            , def: function (t, e, i) {
                var r, o, s = y(t, e);
                return s ? s.v = i : (t._l = s = {
                    i: o = g(e, !0)
                    , k: e
                    , v: i
                    , p: r = t._l
                    , n: n
                    , r: !1
                }, t._f || (t._f = s), r && (r.n = s), t[v]++, "F" !== o && (t._i[o] = s)), t
            }
            , getEntry: y
            , setStrong: function (t, e, i) {
                h(t, e, function (t, e) {
                    this._t = t, this._k = e, this._l = n
                }, function () {
                    for (var t = this, e = t._k, i = t._l; i && i.r;) i = i.p;
                    return t._t && (t._l = i = i ? i.n : t._t._f) ? "keys" == e ? f(0, i.k) : "values" == e ? f(0, i.v) : f(0, [i.k, i.v]) : (t._t = n, f(1))
                }, i ? "entries" : "values", !i, !0), p(e)
            }
        }
    }, function (t, e, i) {
        var r = i(2)
            , o = i(6)
            , s = i(16)
            , a = i(202)
            , l = i(20)
            , c = i(198)
            , u = i(84)
            , h = i(11)
            , f = i(5)
            , p = i(158)
            , d = i(22)
            , g = i(80);
        t.exports = function (t, e, i, v, y, m) {
            var x = r[t]
                , b = x
                , w = y ? "set" : "add"
                , k = b && b.prototype
                , S = {}
                , T = function (t) {
                    var e = k[t];
                    s(k, t, "delete" == t ? function (t) {
                        return !(m && !h(t)) && e.call(this, 0 === t ? 0 : t)
                    } : "has" == t ? function (t) {
                        return !(m && !h(t)) && e.call(this, 0 === t ? 0 : t)
                    } : "get" == t ? function (t) {
                        return m && !h(t) ? n : e.call(this, 0 === t ? 0 : t)
                    } : "add" == t ? function (t) {
                        return e.call(this, 0 === t ? 0 : t), this
                    } : function (t, n) {
                        return e.call(this, 0 === t ? 0 : t, n), this
                    })
                };
            if ("function" == typeof b && (m || k.forEach && !f(function () {
                    (new b).entries().next()
                }))) {
                var A = new b
                    , C = A[w](m ? {} : -0, 1) != A
                    , P = f(function () {
                        A.has(1)
                    })
                    , E = p(function (t) {
                        new b(t)
                    })
                    , M = !m && f(function () {
                        for (var t = new b, e = 5; e--;) t[w](e, e);
                        return !t.has(-0)
                    });
                E || (b = e(function (e, i) {
                    u(e, b, t);
                    var r = g(new x, e, b);
                    return i != n && c(i, y, r[w], r), r
                }), b.prototype = k, k.constructor = b), (P || M) && (T("delete"), T("has"), y && T("get")), (M || C) && T(w), m && k.clear && delete k.clear
            }
            else b = v.getConstructor(e, t, y, w), a(b.prototype, i), l.NEED = !0;
            return d(b, t), S[t] = b, o(o.G + o.W + o.F * (b != x), S), m || v.setStrong(b, t, y), b
        }
    }, function (t, e, i) {
        var r = i(204);
        t.exports = i(205)("Set", function (t) {
            return function () {
                return t(this, arguments.length > 0 ? arguments[0] : n)
            }
        }, {
            add: function (t) {
                return r.def(this, t = 0 === t ? 0 : t, t)
            }
        }, r)
    }, function (t, e, i) {
        var r, o = i(165)(0)
            , s = i(16)
            , a = i(20)
            , l = i(67)
            , c = i(208)
            , u = i(11)
            , h = (i(3), a.getWeak)
            , f = Object.isExtensible
            , p = c.ufstore
            , d = {}
            , g = function (t) {
                return function () {
                    return t(this, arguments.length > 0 ? arguments[0] : n)
                }
            }
            , v = {
                get: function (t) {
                    if (u(t)) {
                        var e = h(t);
                        return e === !0 ? p(this).get(t) : e ? e[this._i] : n
                    }
                }
                , set: function (t, e) {
                    return c.def(this, t, e)
                }
            }
            , y = t.exports = i(205)("WeakMap", g, v, c, !0, !0);
        7 != (new y).set((Object.freeze || Object)(d), 7).get(d) && (r = c.getConstructor(g), l(r.prototype, v), a.NEED = !0, o(["delete", "has", "get", "set"], function (t) {
            var e = y.prototype
                , n = e[t];
            s(e, t, function (e, i) {
                if (u(e) && !f(e)) {
                    this._f || (this._f = new r);
                    var o = this._f[t](e, i);
                    return "set" == t ? this : o
                }
                return n.call(this, e, i)
            })
        }))
    }, function (t, e, i) {
        var r = i(202)
            , o = i(20).getWeak
            , s = i(10)
            , a = i(11)
            , l = i(84)
            , c = i(198)
            , u = i(165)
            , h = i(3)
            , f = u(5)
            , p = u(6)
            , d = 0
            , g = function (t) {
                return t._l || (t._l = new v)
            }
            , v = function () {
                this.a = []
            }
            , y = function (t, e) {
                return f(t.a, function (t) {
                    return t[0] === e
                })
            };
        v.prototype = {
            get: function (t) {
                var e = y(this, t);
                return e ? e[1] : void 0
            }
            , has: function (t) {
                return !!y(this, t)
            }
            , set: function (t, e) {
                var n = y(this, t);
                n ? n[1] = e : this.a.push([t, e])
            }
            , delete: function (t) {
                var e = p(this.a, function (e) {
                    return e[0] === t
                });
                return ~e && this.a.splice(e, 1), !!~e
            }
        }, t.exports = {
            getConstructor: function (t, e, i, s) {
                var u = t(function (t, r) {
                    l(t, u, e, "_i"), t._i = d++, t._l = n, r != n && c(r, i, t[s], t)
                });
                return r(u.prototype, {
                    delete: function (t) {
                        if (!a(t)) return !1;
                        var e = o(t);
                        return e === !0 ? g(this).delete(t) : e && h(e, this._i) && delete e[this._i]
                    }
                    , has: function (t) {
                        if (!a(t)) return !1;
                        var e = o(t);
                        return e === !0 ? g(this).has(t) : e && h(e, this._i)
                    }
                }), u
            }
            , def: function (t, e, n) {
                var i = o(s(e), !0);
                return i === !0 ? g(t).set(e, n) : i[t._i] = n, t
            }
            , ufstore: g
        }
    }, function (t, e, i) {
        var r = i(208);
        i(205)("WeakSet", function (t) {
            return function () {
                return t(this, arguments.length > 0 ? arguments[0] : n)
            }
        }, {
            add: function (t) {
                return r.def(this, t, !0)
            }
        }, r, !1, !0)
    }, function (t, e, n) {
        var i = n(6)
            , r = n(19)
            , o = n(10)
            , s = Function.apply;
        i(i.S, "Reflect", {
            apply: function (t, e, n) {
                return s.call(r(t), e, o(n))
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(44)
            , o = n(19)
            , s = n(10)
            , a = n(11)
            , l = n(75);
        i(i.S + i.F * n(5)(function () {
            function t() {}
            return !(Reflect.construct(function () {}, [], t) instanceof t)
        }), "Reflect", {
            construct: function (t, e) {
                o(t), s(e);
                var n = 3 > arguments.length ? t : o(arguments[2]);
                if (t == n) {
                    switch (e.length) {
                    case 0:
                        return new t;
                    case 1:
                        return new t(e[0]);
                    case 2:
                        return new t(e[0], e[1]);
                    case 3:
                        return new t(e[0], e[1], e[2]);
                    case 4:
                        return new t(e[0], e[1], e[2], e[3])
                    }
                    var i = [null];
                    return i.push.apply(i, e), new(l.apply(t, i))
                }
                var c = n.prototype
                    , u = r(a(c) ? c : Object.prototype)
                    , h = Function.apply.call(t, u, e);
                return a(h) ? h : u
            }
        })
    }, function (t, e, n) {
        var i = n(9)
            , r = n(6)
            , o = n(10)
            , s = n(14);
        r(r.S + r.F * n(5)(function () {
            Reflect.defineProperty(i.f({}, 1, {
                value: 1
            }), 1, {
                value: 2
            })
        }), "Reflect", {
            defineProperty: function (t, e, n) {
                o(t), e = s(e, !0), o(n);
                try {
                    return i.f(t, e, n), !0
                }
                catch (t) {
                    return !1
                }
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(49).f
            , o = n(10);
        i(i.S, "Reflect", {
            deleteProperty: function (t, e) {
                var n = r(o(t), e);
                return !(n && !n.configurable) && delete t[e]
            }
        })
    }, function (t, e, i) {
        var r = i(6)
            , o = i(10)
            , s = function (t) {
                this._t = o(t), this._i = 0;
                var e, n = this._k = [];
                for (e in t) n.push(e)
            };
        i(137)(s, "Object", function () {
            var t, e = this
                , i = e._k;
            do
                if (e._i >= i.length) return {
                    value: n
                    , done: !0
                };
            while (!((t = i[e._i++]) in e._t));
            return {
                value: t
                , done: !1
            }
        }), r(r.S, "Reflect", {
            enumerate: function (t) {
                return new s(t)
            }
        })
    }, function (t, e, i) {
        function r(t, e) {
            var i, l, h = 3 > arguments.length ? t : arguments[2];
            return u(t) === h ? t[e] : (i = o.f(t, e)) ? a(i, "value") ? i.value : i.get !== n ? i.get.call(h) : n : c(l = s(t)) ? r(l, e, h) : void 0
        }
        var o = i(49)
            , s = i(57)
            , a = i(3)
            , l = i(6)
            , c = i(11)
            , u = i(10);
        l(l.S, "Reflect", {
            get: r
        })
    }, function (t, e, n) {
        var i = n(49)
            , r = n(6)
            , o = n(10);
        r(r.S, "Reflect", {
            getOwnPropertyDescriptor: function (t, e) {
                return i.f(o(t), e)
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(57)
            , o = n(10);
        i(i.S, "Reflect", {
            getPrototypeOf: function (t) {
                return r(o(t))
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Reflect", {
            has: function (t, e) {
                return e in t
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(10)
            , o = Object.isExtensible;
        i(i.S, "Reflect", {
            isExtensible: function (t) {
                return r(t), !o || o(t)
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Reflect", {
            ownKeys: n(221)
        })
    }, function (t, e, n) {
        var i = n(48)
            , r = n(41)
            , o = n(10)
            , s = n(2).Reflect;
        t.exports = s && s.ownKeys || function (t) {
            var e = i.f(o(t))
                , n = r.f;
            return n ? e.concat(n(t)) : e
        }
    }, function (t, e, n) {
        var i = n(6)
            , r = n(10)
            , o = Object.preventExtensions;
        i(i.S, "Reflect", {
            preventExtensions: function (t) {
                r(t);
                try {
                    return o && o(t), !0
                }
                catch (t) {
                    return !1
                }
            }
        })
    }, function (t, e, i) {
        function r(t, e, i) {
            var c, p, d = 4 > arguments.length ? t : arguments[3]
                , g = s.f(h(t), e);
            if (!g) {
                if (f(p = a(t))) return r(p, e, i, d);
                g = u(0)
            }
            return l(g, "value") ? !(g.writable === !1 || !f(d)) && (c = s.f(d, e) || u(0), c.value = i, o.f(d, e, c), !0) : g.set !== n && (g.set.call(d, i), !0)
        }
        var o = i(9)
            , s = i(49)
            , a = i(57)
            , l = i(3)
            , c = i(6)
            , u = i(15)
            , h = i(10)
            , f = i(11);
        c(c.S, "Reflect", {
            set: r
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(71);
        r && i(i.S, "Reflect", {
            setPrototypeOf: function (t, e) {
                r.check(t, e);
                try {
                    return r.set(t, e), !0
                }
                catch (t) {
                    return !1
                }
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Date", {
            now: function () {
                return (new Date).getTime()
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(56)
            , o = n(14);
        i(i.P + i.F * n(5)(function () {
            return null !== new Date(NaN).toJSON() || 1 !== Date.prototype.toJSON.call({
                toISOString: function () {
                    return 1
                }
            })
        }), "Date", {
            toJSON: function (t) {
                var e = r(this)
                    , n = o(e);
                return "number" != typeof n || isFinite(n) ? e.toISOString() : null
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(5)
            , o = Date.prototype.getTime
            , s = function (t) {
                return t > 9 ? t : "0" + t
            };
        i(i.P + i.F * (r(function () {
            return "0385-07-25T07:06:39.999Z" != new Date(-5e13 - 1).toISOString()
        }) || !r(function () {
            new Date(NaN).toISOString()
        })), "Date", {
            toISOString: function () {
                if (!isFinite(o.call(this))) throw RangeError("Invalid time value");
                var t = this
                    , e = t.getUTCFullYear()
                    , n = t.getUTCMilliseconds()
                    , i = 0 > e ? "-" : e > 9999 ? "+" : "";
                return i + ("00000" + Math.abs(e)).slice(i ? -6 : -4) + "-" + s(t.getUTCMonth() + 1) + "-" + s(t.getUTCDate()) + "T" + s(t.getUTCHours()) + ":" + s(t.getUTCMinutes()) + ":" + s(t.getUTCSeconds()) + "." + (n > 99 ? n : "0" + s(n)) + "Z"
            }
        })
    }, function (t, e, n) {
        var i = Date.prototype
            , r = "Invalid Date"
            , o = "toString"
            , s = i[o]
            , a = i.getTime;
        new Date(NaN) + "" != r && n(16)(i, o, function () {
            var t = a.call(this);
            return t === t ? s.call(this) : r
        })
    }, function (t, e, n) {
        var i = n(23)("toPrimitive")
            , r = Date.prototype;
        i in r || n(8)(r, i, n(230))
    }, function (t, e, n) {
        var i = n(10)
            , r = n(14)
            , o = "number";
        t.exports = function (t) {
            if ("string" !== t && t !== o && "default" !== t) throw TypeError("Incorrect hint");
            return r(i(this), t != o)
        }
    }, function (t, e, i) {
        var r = i(6)
            , o = i(232)
            , s = i(233)
            , a = i(10)
            , l = i(37)
            , c = i(35)
            , u = i(11)
            , h = (i(23)("typed_array"), i(2).ArrayBuffer)
            , f = i(199)
            , p = s.ArrayBuffer
            , d = s.DataView
            , g = o.ABV && h.isView
            , v = p.prototype.slice
            , y = o.VIEW
            , m = "ArrayBuffer";
        r(r.G + r.W + r.F * (h !== p), {
            ArrayBuffer: p
        }), r(r.S + r.F * !o.CONSTR, m, {
            isView: function (t) {
                return g && g(t) || u(t) && y in t
            }
        }), r(r.P + r.U + r.F * i(5)(function () {
            return !new p(2).slice(1, n).byteLength
        }), m, {
            slice: function (t, e) {
                if (v !== n && e === n) return v.call(a(this), t);
                for (var i = a(this).byteLength, r = l(t, i), o = l(e === n ? i : e, i), s = new(f(this, p))(c(o - r)), u = new d(this), h = new d(s), g = 0; o > r;) h.setUint8(g++, u.getUint8(r++));
                return s
            }
        }), i(187)(m)
    }, function (t, e, n) {
        for (var i, r = n(2), o = n(8), s = n(17), a = s("typed_array"), l = s("view"), c = !(!r.ArrayBuffer || !r.DataView), u = c, h = 0, f = 9, p = "Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array".split(","); f > h;)(i = r[p[h++]]) ? (o(i.prototype, a, !0), o(i.prototype, l, !0)) : u = !1;
        t.exports = {
            ABV: c
            , CONSTR: u
            , TYPED: a
            , VIEW: l
        }
    }, function (t, e, i) {
        var r = i(2)
            , o = i(4)
            , s = i(26)
            , a = i(232)
            , l = i(8)
            , c = i(202)
            , u = i(5)
            , h = i(84)
            , f = i(36)
            , p = i(35)
            , d = i(48).f
            , g = i(9).f
            , v = i(181)
            , y = i(22)
            , m = "ArrayBuffer"
            , x = "DataView"
            , b = "prototype"
            , w = "Wrong length!"
            , k = "Wrong index!"
            , S = r[m]
            , T = r[x]
            , A = r.Math
            , C = r.RangeError
            , P = r.Infinity
            , E = S
            , M = A.abs
            , L = A.pow
            , O = A.floor
            , D = A.log
            , _ = A.LN2
            , I = "buffer"
            , N = "byteLength"
            , F = "byteOffset"
            , R = o ? "_b" : I
            , j = o ? "_l" : N
            , z = o ? "_o" : F
            , H = function (t, e, n) {
                var i, r, o, s = Array(n)
                    , a = 8 * n - e - 1
                    , l = (1 << a) - 1
                    , c = l >> 1
                    , u = 23 === e ? L(2, -24) - L(2, -77) : 0
                    , h = 0
                    , f = 0 > t || 0 === t && 0 > 1 / t ? 1 : 0;
                for (t = M(t), t != t || t === P ? (r = t != t ? 1 : 0, i = l) : (i = O(D(t) / _), t * (o = L(2, -i)) < 1 && (i--, o *= 2), t += i + c >= 1 ? u / o : u * L(2, 1 - c), t * o >= 2 && (i++, o /= 2), i + c >= l ? (r = 0, i = l) : i + c >= 1 ? (r = (t * o - 1) * L(2, e), i += c) : (r = t * L(2, c - 1) * L(2, e), i = 0)); e >= 8; s[h++] = 255 & r, r /= 256, e -= 8);
                for (i = i << e | r, a += e; a > 0; s[h++] = 255 & i, i /= 256, a -= 8);
                return s[--h] |= 128 * f, s
            }
            , B = function (t, e, n) {
                var i, r = 8 * n - e - 1
                    , o = (1 << r) - 1
                    , s = o >> 1
                    , a = r - 7
                    , l = n - 1
                    , c = t[l--]
                    , u = 127 & c;
                for (c >>= 7; a > 0; u = 256 * u + t[l], l--, a -= 8);
                for (i = u & (1 << -a) - 1, u >>= -a, a += e; a > 0; i = 256 * i + t[l], l--, a -= 8);
                if (0 === u) u = 1 - s;
                else {
                    if (u === o) return i ? NaN : c ? -P : P;
                    i += L(2, e), u -= s
                }
                return (c ? -1 : 1) * i * L(2, u - e)
            }
            , W = function (t) {
                return t[3] << 24 | t[2] << 16 | t[1] << 8 | t[0]
            }
            , X = function (t) {
                return [255 & t]
            }
            , G = function (t) {
                return [255 & t, t >> 8 & 255]
            }
            , Y = function (t) {
                return [255 & t, t >> 8 & 255, t >> 16 & 255, t >> 24 & 255]
            }
            , q = function (t) {
                return H(t, 52, 8)
            }
            , V = function (t) {
                return H(t, 23, 4)
            }
            , U = function (t, e, n) {
                g(t[b], e, {
                    get: function () {
                        return this[n]
                    }
                })
            }
            , Z = function (t, e, n, i) {
                var r = +n
                    , o = f(r);
                if (r != o || 0 > o || o + e > t[j]) throw C(k);
                var s = t[R]._b
                    , a = o + t[z]
                    , l = s.slice(a, a + e);
                return i ? l : l.reverse()
            }
            , $ = function (t, e, n, i, r, o) {
                var s = +n
                    , a = f(s);
                if (s != a || 0 > a || a + e > t[j]) throw C(k);
                for (var l = t[R]._b, c = a + t[z], u = i(+r), h = 0; e > h; h++) l[c + h] = u[o ? h : e - h - 1]
            }
            , K = function (t, e) {
                h(t, S, m);
                var n = +e
                    , i = p(n);
                if (n != i) throw C(w);
                return i
            };
        if (a.ABV) {
            if (!u(function () {
                    new S
                }) || !u(function () {
                    new S(.5)
                })) {
                S = function (t) {
                    return new E(K(this, t))
                };
                for (var J, Q = S[b] = E[b], tt = d(E), et = 0; tt.length > et;)(J = tt[et++]) in S || l(S, J, E[J]);
                s || (Q.constructor = S)
            }
            var nt = new T(new S(2))
                , it = T[b].setInt8;
            nt.setInt8(0, 2147483648), nt.setInt8(1, 2147483649), !nt.getInt8(0) && nt.getInt8(1) || c(T[b], {
                setInt8: function (t, e) {
                    it.call(this, t, e << 24 >> 24)
                }
                , setUint8: function (t, e) {
                    it.call(this, t, e << 24 >> 24)
                }
            }, !0)
        }
        else S = function (t) {
            var e = K(this, t);
            this._b = v.call(Array(e), 0), this[j] = e
        }, T = function (t, e, i) {
            h(this, T, x), h(t, S, x);
            var r = t[j]
                , o = f(e);
            if (0 > o || o > r) throw C("Wrong offset!");
            if (i = i === n ? r - o : p(i), o + i > r) throw C(w);
            this[R] = t, this[z] = o, this[j] = i
        }, o && (U(S, N, "_l"), U(T, I, "_b"), U(T, N, "_l"), U(T, F, "_o")), c(T[b], {
            getInt8: function (t) {
                return Z(this, 1, t)[0] << 24 >> 24
            }
            , getUint8: function (t) {
                return Z(this, 1, t)[0]
            }
            , getInt16: function (t) {
                var e = Z(this, 2, t, arguments[1]);
                return (e[1] << 8 | e[0]) << 16 >> 16
            }
            , getUint16: function (t) {
                var e = Z(this, 2, t, arguments[1]);
                return e[1] << 8 | e[0]
            }
            , getInt32: function (t) {
                return W(Z(this, 4, t, arguments[1]))
            }
            , getUint32: function (t) {
                return W(Z(this, 4, t, arguments[1])) >>> 0
            }
            , getFloat32: function (t) {
                return B(Z(this, 4, t, arguments[1]), 23, 4)
            }
            , getFloat64: function (t) {
                return B(Z(this, 8, t, arguments[1]), 52, 8)
            }
            , setInt8: function (t, e) {
                $(this, 1, t, X, e)
            }
            , setUint8: function (t, e) {
                $(this, 1, t, X, e)
            }
            , setInt16: function (t, e) {
                $(this, 2, t, G, e, arguments[2])
            }
            , setUint16: function (t, e) {
                $(this, 2, t, G, e, arguments[2])
            }
            , setInt32: function (t, e) {
                $(this, 4, t, Y, e, arguments[2])
            }
            , setUint32: function (t, e) {
                $(this, 4, t, Y, e, arguments[2])
            }
            , setFloat32: function (t, e) {
                $(this, 4, t, V, e, arguments[2])
            }
            , setFloat64: function (t, e) {
                $(this, 8, t, q, e, arguments[2])
            }
        });
        y(S, m), y(T, x), l(T[b], a.VIEW, !0), e[m] = S, e[x] = T
    }, function (t, e, n) {
        var i = n(6);
        i(i.G + i.W + i.F * !n(232).ABV, {
            DataView: n(233).DataView
        })
    }, function (t, e, n) {
        n(236)("Int8", 1, function (t) {
            return function (e, n, i) {
                return t(this, e, n, i)
            }
        })
    }, function (t, e, i) {
        if (i(4)) {
            var r = i(26)
                , o = i(2)
                , s = i(5)
                , a = i(6)
                , l = i(232)
                , c = i(233)
                , u = i(18)
                , h = i(84)
                , f = i(15)
                , p = i(8)
                , d = i(202)
                , g = (i(91), i(36))
                , v = i(35)
                , y = i(37)
                , m = i(14)
                , x = i(3)
                , b = i(69)
                , w = i(73)
                , k = i(11)
                , S = i(56)
                , T = i(155)
                , A = i(44)
                , C = i(57)
                , P = i(48).f
                , E = (i(237), i(157))
                , M = i(17)
                , L = i(23)
                , O = i(165)
                , D = i(34)
                , _ = i(199)
                , I = i(184)
                , N = i(136)
                , F = i(158)
                , R = i(187)
                , j = i(181)
                , z = i(178)
                , H = i(9)
                , B = i(49)
                , W = H.f
                , X = B.f
                , G = o.RangeError
                , Y = o.TypeError
                , q = o.Uint8Array
                , V = "ArrayBuffer"
                , U = "Shared" + V
                , Z = "BYTES_PER_ELEMENT"
                , $ = "prototype"
                , K = Array[$]
                , J = c.ArrayBuffer
                , Q = c.DataView
                , tt = O(0)
                , et = O(2)
                , nt = O(3)
                , it = O(4)
                , rt = O(5)
                , ot = O(6)
                , st = D(!0)
                , at = D(!1)
                , lt = I.values
                , ct = I.keys
                , ut = I.entries
                , ht = K.lastIndexOf
                , ft = K.reduce
                , pt = K.reduceRight
                , dt = K.join
                , gt = K.sort
                , vt = K.slice
                , yt = K.toString
                , mt = K.toLocaleString
                , xt = L("iterator")
                , bt = L("toStringTag")
                , wt = M("typed_constructor")
                , kt = M("def_constructor")
                , St = l.CONSTR
                , Tt = l.TYPED
                , At = l.VIEW
                , Ct = "Wrong length!"
                , Pt = O(1, function (t, e) {
                    return _t(_(t, t[kt]), e)
                })
                , Et = s(function () {
                    return 1 === new q(new Uint16Array([1]).buffer)[0]
                })
                , Mt = !!q && !!q[$].set && s(function () {
                    new q(1).set({})
                })
                , Lt = function (t, e) {
                    if (t === n) throw Y(Ct);
                    var i = +t
                        , r = v(t);
                    if (e && !b(i, r)) throw G(Ct);
                    return r
                }
                , Ot = function (t, e) {
                    var n = g(t);
                    if (0 > n || n % e) throw G("Wrong offset!");
                    return n
                }
                , Dt = function (t) {
                    if (k(t) && Tt in t) return t;
                    throw Y(t + " is not a typed array!")
                }
                , _t = function (t, e) {
                    if (!(k(t) && wt in t)) throw Y("It is not a typed array constructor!");
                    return new t(e)
                }
                , It = function (t, e) {
                    return Nt(_(t, t[kt]), e)
                }
                , Nt = function (t, e) {
                    for (var n = 0, i = e.length, r = _t(t, i); i > n;) r[n] = e[n++];
                    return r
                }
                , Ft = function (t, e, n) {
                    W(t, e, {
                        get: function () {
                            return this._d[n]
                        }
                    })
                }
                , Rt = function (t) {
                    var e, i, r, o, s, a, l = S(t)
                        , c = arguments.length
                        , h = c > 1 ? arguments[1] : n
                        , f = h !== n
                        , p = E(l);
                    if (p != n && !T(p)) {
                        for (a = p.call(l), r = [], e = 0; !(s = a.next()).done; e++) r.push(s.value);
                        l = r
                    }
                    for (f && c > 2 && (h = u(h, arguments[2], 2)), e = 0, i = v(l.length), o = _t(this, i); i > e; e++) o[e] = f ? h(l[e], e) : l[e];
                    return o
                }
                , jt = function () {
                    for (var t = 0, e = arguments.length, n = _t(this, e); e > t;) n[t] = arguments[t++];
                    return n
                }
                , zt = !!q && s(function () {
                    mt.call(new q(1))
                })
                , Ht = function () {
                    return mt.apply(zt ? vt.call(Dt(this)) : Dt(this), arguments)
                }
                , Bt = {
                    copyWithin: function (t, e) {
                        return z.call(Dt(this), t, e, arguments.length > 2 ? arguments[2] : n)
                    }
                    , every: function (t) {
                        return it(Dt(this), t, arguments.length > 1 ? arguments[1] : n)
                    }
                    , fill: function (t) {
                        return j.apply(Dt(this), arguments)
                    }
                    , filter: function (t) {
                        return It(this, et(Dt(this), t, arguments.length > 1 ? arguments[1] : n))
                    }
                    , find: function (t) {
                        return rt(Dt(this), t, arguments.length > 1 ? arguments[1] : n)
                    }
                    , findIndex: function (t) {
                        return ot(Dt(this), t, arguments.length > 1 ? arguments[1] : n)
                    }
                    , forEach: function (t) {
                        tt(Dt(this), t, arguments.length > 1 ? arguments[1] : n)
                    }
                    , indexOf: function (t) {
                        return at(Dt(this), t, arguments.length > 1 ? arguments[1] : n)
                    }
                    , includes: function (t) {
                        return st(Dt(this), t, arguments.length > 1 ? arguments[1] : n)
                    }
                    , join: function (t) {
                        return dt.apply(Dt(this), arguments)
                    }
                    , lastIndexOf: function (t) {
                        return ht.apply(Dt(this), arguments)
                    }
                    , map: function (t) {
                        return Pt(Dt(this), t, arguments.length > 1 ? arguments[1] : n)
                    }
                    , reduce: function (t) {
                        return ft.apply(Dt(this), arguments)
                    }
                    , reduceRight: function (t) {
                        return pt.apply(Dt(this), arguments)
                    }
                    , reverse: function () {
                        for (var t, e = this, n = Dt(e).length, i = Math.floor(n / 2), r = 0; i > r;) t = e[r], e[r++] = e[--n], e[n] = t;
                        return e
                    }
                    , some: function (t) {
                        return nt(Dt(this), t, arguments.length > 1 ? arguments[1] : n)
                    }
                    , sort: function (t) {
                        return gt.call(Dt(this), t)
                    }
                    , subarray: function (t, e) {
                        var i = Dt(this)
                            , r = i.length
                            , o = y(t, r);
                        return new(_(i, i[kt]))(i.buffer, i.byteOffset + o * i.BYTES_PER_ELEMENT, v((e === n ? r : y(e, r)) - o))
                    }
                }
                , Wt = function (t, e) {
                    return It(this, vt.call(Dt(this), t, e))
                }
                , Xt = function (t) {
                    Dt(this);
                    var e = Ot(arguments[1], 1)
                        , n = this.length
                        , i = S(t)
                        , r = v(i.length)
                        , o = 0;
                    if (r + e > n) throw G(Ct);
                    for (; r > o;) this[e + o] = i[o++]
                }
                , Gt = {
                    entries: function () {
                        return ut.call(Dt(this))
                    }
                    , keys: function () {
                        return ct.call(Dt(this))
                    }
                    , values: function () {
                        return lt.call(Dt(this))
                    }
                }
                , Yt = function (t, e) {
                    return k(t) && t[Tt] && "symbol" != typeof e && e in t && String(+e) == String(e)
                }
                , qt = function (t, e) {
                    return Yt(t, e = m(e, !0)) ? f(2, t[e]) : X(t, e)
                }
                , Vt = function (t, e, n) {
                    return !(Yt(t, e = m(e, !0)) && k(n) && x(n, "value")) || x(n, "get") || x(n, "set") || n.configurable || x(n, "writable") && !n.writable || x(n, "enumerable") && !n.enumerable ? W(t, e, n) : (t[e] = n.value, t)
                };
            St || (B.f = qt, H.f = Vt), a(a.S + a.F * !St, "Object", {
                getOwnPropertyDescriptor: qt
                , defineProperty: Vt
            }), s(function () {
                yt.call({})
            }) && (yt = mt = function () {
                return dt.call(this)
            });
            var Ut = d({}, Bt);
            d(Ut, Gt), p(Ut, xt, Gt.values), d(Ut, {
                slice: Wt
                , set: Xt
                , constructor: function () {}
                , toString: yt
                , toLocaleString: Ht
            }), Ft(Ut, "buffer", "b"), Ft(Ut, "byteOffset", "o"), Ft(Ut, "byteLength", "l"), Ft(Ut, "length", "e"), W(Ut, bt, {
                get: function () {
                    return this[Tt]
                }
            }), t.exports = function (t, e, i, c) {
                c = !!c;
                var u = t + (c ? "Clamped" : "") + "Array"
                    , f = "Uint8Array" != u
                    , d = "get" + t
                    , g = "set" + t
                    , y = o[u]
                    , m = y || {}
                    , x = y && C(y)
                    , b = !y || !l.ABV
                    , S = {}
                    , T = y && y[$]
                    , E = function (t, n) {
                        var i = t._d;
                        return i.v[d](n * e + i.o, Et)
                    }
                    , M = function (t, n, i) {
                        var r = t._d;
                        c && (i = (i = Math.round(i)) < 0 ? 0 : i > 255 ? 255 : 255 & i), r.v[g](n * e + r.o, i, Et)
                    }
                    , L = function (t, e) {
                        W(t, e, {
                            get: function () {
                                return E(this, e)
                            }
                            , set: function (t) {
                                return M(this, e, t)
                            }
                            , enumerable: !0
                        })
                    };
                b ? (y = i(function (t, i, r, o) {
                    h(t, y, u, "_d");
                    var s, a, l, c, f = 0
                        , d = 0;
                    if (k(i)) {
                        if (!(i instanceof J || (c = w(i)) == V || c == U)) return Tt in i ? Nt(y, i) : Rt.call(y, i);
                        s = i, d = Ot(r, e);
                        var g = i.byteLength;
                        if (o === n) {
                            if (g % e) throw G(Ct);
                            if (a = g - d, 0 > a) throw G(Ct)
                        }
                        else if (a = v(o) * e, a + d > g) throw G(Ct);
                        l = a / e
                    }
                    else l = Lt(i, !0), a = l * e, s = new J(a);
                    for (p(t, "_d", {
                            b: s
                            , o: d
                            , l: a
                            , e: l
                            , v: new Q(s)
                        }); l > f;) L(t, f++)
                }), T = y[$] = A(Ut), p(T, "constructor", y)) : F(function (t) {
                    new y(null), new y(t)
                }, !0) || (y = i(function (t, i, r, o) {
                    h(t, y, u);
                    var s;
                    return k(i) ? i instanceof J || (s = w(i)) == V || s == U ? o !== n ? new m(i, Ot(r, e), o) : r !== n ? new m(i, Ot(r, e)) : new m(i) : Tt in i ? Nt(y, i) : Rt.call(y, i) : new m(Lt(i, f))
                }), tt(x !== Function.prototype ? P(m).concat(P(x)) : P(m), function (t) {
                    t in y || p(y, t, m[t])
                }), y[$] = T, r || (T.constructor = y));
                var O = T[xt]
                    , D = !!O && ("values" == O.name || O.name == n)
                    , _ = Gt.values;
                p(y, wt, !0), p(T, Tt, u), p(T, At, !0), p(T, kt, y), (c ? new y(1)[bt] == u : bt in T) || W(T, bt, {
                    get: function () {
                        return u
                    }
                }), S[u] = y, a(a.G + a.W + a.F * (y != m), S), a(a.S, u, {
                    BYTES_PER_ELEMENT: e
                    , from: Rt
                    , of: jt
                }), Z in T || p(T, Z, e), a(a.P, u, Bt), R(u), a(a.P + a.F * Mt, u, {
                    set: Xt
                }), a(a.P + a.F * !D, u, Gt), a(a.P + a.F * (T.toString != yt), u, {
                    toString: yt
                }), a(a.P + a.F * s(function () {
                    new y(1).slice()
                }), u, {
                    slice: Wt
                }), a(a.P + a.F * (s(function () {
                    return [1, 2].toLocaleString() != new y([1, 2]).toLocaleString()
                }) || !s(function () {
                    T.toLocaleString.call([1, 2])
                })), u, {
                    toLocaleString: Ht
                }), N[u] = D ? O : _, r || D || p(T, xt, _)
            }
        }
        else t.exports = function () {}
    }, function (t, e, i) {
        var r = i(73)
            , o = i(23)("iterator")
            , s = i(136);
        t.exports = i(7).isIterable = function (t) {
            var e = Object(t);
            return e[o] !== n || "@@iterator" in e || s.hasOwnProperty(r(e))
        }
    }, function (t, e, n) {
        n(236)("Uint8", 1, function (t) {
            return function (e, n, i) {
                return t(this, e, n, i)
            }
        })
    }, function (t, e, n) {
        n(236)("Uint8", 1, function (t) {
            return function (e, n, i) {
                return t(this, e, n, i)
            }
        }, !0)
    }, function (t, e, n) {
        n(236)("Int16", 2, function (t) {
            return function (e, n, i) {
                return t(this, e, n, i)
            }
        })
    }, function (t, e, n) {
        n(236)("Uint16", 2, function (t) {
            return function (e, n, i) {
                return t(this, e, n, i)
            }
        })
    }, function (t, e, n) {
        n(236)("Int32", 4, function (t) {
            return function (e, n, i) {
                return t(this, e, n, i)
            }
        })
    }, function (t, e, n) {
        n(236)("Uint32", 4, function (t) {
            return function (e, n, i) {
                return t(this, e, n, i)
            }
        })
    }, function (t, e, n) {
        n(236)("Float32", 4, function (t) {
            return function (e, n, i) {
                return t(this, e, n, i)
            }
        })
    }, function (t, e, n) {
        n(236)("Float64", 8, function (t) {
            return function (e, n, i) {
                return t(this, e, n, i)
            }
        })
    }, function (t, e, i) {
        var r = i(6)
            , o = i(34)(!0);
        r(r.P, "Array", {
            includes: function (t) {
                return o(this, t, arguments.length > 1 ? arguments[1] : n)
            }
        }), i(179)("includes")
    }, function (t, e, n) {
        var i = n(6)
            , r = n(126)(!0);
        i(i.P, "String", {
            at: function (t) {
                return r(this, t)
            }
        })
    }, function (t, e, i) {
        var r = i(6)
            , o = i(249);
        r(r.P, "String", {
            padStart: function (t) {
                return o(this, t, arguments.length > 1 ? arguments[1] : n, !0)
            }
        })
    }, function (t, e, i) {
        var r = i(35)
            , o = i(86)
            , s = i(33);
        t.exports = function (t, e, i, a) {
            var l = String(s(t))
                , c = l.length
                , u = i === n ? " " : String(i)
                , h = r(e);
            if (c >= h || "" == u) return l;
            var f = h - c
                , p = o.call(u, Math.ceil(f / u.length));
            return p.length > f && (p = p.slice(0, f)), a ? p + l : l + p
        }
    }, function (t, e, i) {
        var r = i(6)
            , o = i(249);
        r(r.P, "String", {
            padEnd: function (t) {
                return o(this, t, arguments.length > 1 ? arguments[1] : n, !1)
            }
        })
    }, function (t, e, n) {
        n(81)("trimLeft", function (t) {
            return function () {
                return t(this, 1)
            }
        }, "trimStart")
    }, function (t, e, n) {
        n(81)("trimRight", function (t) {
            return function () {
                return t(this, 2)
            }
        }, "trimEnd")
    }, function (t, e, n) {
        var i = n(6)
            , r = n(33)
            , o = n(35)
            , s = n(129)
            , a = n(189)
            , l = RegExp.prototype
            , c = function (t, e) {
                this._r = t, this._s = e
            };
        n(137)(c, "RegExp String", function () {
            var t = this._r.exec(this._s);
            return {
                value: t
                , done: null === t
            }
        }), i(i.P, "String", {
            matchAll: function (t) {
                if (r(this), !s(t)) throw TypeError(t + " is not a regexp!");
                var e = String(this)
                    , n = "flags" in l ? String(t.flags) : a.call(t)
                    , i = new RegExp(t.source, ~n.indexOf("g") ? n : "g" + n);
                return i.lastIndex = o(t.lastIndex), new c(i, e)
            }
        })
    }, function (t, e, n) {
        n(25)("asyncIterator")
    }, function (t, e, n) {
        n(25)("observable")
    }, function (t, e, n) {
        var i = n(6)
            , r = n(221)
            , o = n(30)
            , s = n(49)
            , a = n(156);
        i(i.S, "Object", {
            getOwnPropertyDescriptors: function (t) {
                for (var e, n = o(t), i = s.f, l = r(n), c = {}, u = 0; l.length > u;) a(c, e = l[u++], i(n, e));
                return c
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(258)(!1);
        i(i.S, "Object", {
            values: function (t) {
                return r(t)
            }
        })
    }, function (t, e, n) {
        var i = n(28)
            , r = n(30)
            , o = n(42).f;
        t.exports = function (t) {
            return function (e) {
                for (var n, s = r(e), a = i(s), l = a.length, c = 0, u = []; l > c;) o.call(s, n = a[c++]) && u.push(t ? [n, s[n]] : s[n]);
                return u
            }
        }
    }, function (t, e, n) {
        var i = n(6)
            , r = n(258)(!0);
        i(i.S, "Object", {
            entries: function (t) {
                return r(t)
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(56)
            , o = n(19)
            , s = n(9);
        n(4) && i(i.P + n(261), "Object", {
            __defineGetter__: function (t, e) {
                s.f(r(this), t, {
                    get: o(e)
                    , enumerable: !0
                    , configurable: !0
                })
            }
        })
    }, function (t, e, n) {
        t.exports = n(26) || !n(5)(function () {
            var t = Math.random();
            __defineSetter__.call(null, t, function () {}), delete n(2)[t]
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(56)
            , o = n(19)
            , s = n(9);
        n(4) && i(i.P + n(261), "Object", {
            __defineSetter__: function (t, e) {
                s.f(r(this), t, {
                    set: o(e)
                    , enumerable: !0
                    , configurable: !0
                })
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(56)
            , o = n(14)
            , s = n(57)
            , a = n(49).f;
        n(4) && i(i.P + n(261), "Object", {
            __lookupGetter__: function (t) {
                var e, n = r(this)
                    , i = o(t, !0);
                do
                    if (e = a(n, i)) return e.get;
                while (n = s(n))
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(56)
            , o = n(14)
            , s = n(57)
            , a = n(49).f;
        n(4) && i(i.P + n(261), "Object", {
            __lookupSetter__: function (t) {
                var e, n = r(this)
                    , i = o(t, !0);
                do
                    if (e = a(n, i)) return e.set;
                while (n = s(n))
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.P + i.R, "Map", {
            toJSON: n(266)("Map")
        })
    }, function (t, e, n) {
        var i = n(73)
            , r = n(267);
        t.exports = function (t) {
            return function () {
                if (i(this) != t) throw TypeError(t + "#toJSON isn't generic");
                return r(this)
            }
        }
    }, function (t, e, n) {
        var i = n(198);
        t.exports = function (t, e) {
            var n = [];
            return i(t, !1, n.push, n, e), n
        }
    }, function (t, e, n) {
        var i = n(6);
        i(i.P + i.R, "Set", {
            toJSON: n(266)("Set")
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "System", {
            global: n(2)
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(32);
        i(i.S, "Error", {
            isError: function (t) {
                return "Error" === r(t)
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Math", {
            iaddh: function (t, e, n, i) {
                var r = t >>> 0
                    , o = e >>> 0
                    , s = n >>> 0;
                return o + (i >>> 0) + ((r & s | (r | s) & ~(r + s >>> 0)) >>> 31) | 0
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Math", {
            isubh: function (t, e, n, i) {
                var r = t >>> 0
                    , o = e >>> 0
                    , s = n >>> 0;
                return o - (i >>> 0) - ((~r & s | ~(r ^ s) & r - s >>> 0) >>> 31) | 0
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Math", {
            imulh: function (t, e) {
                var n = 65535
                    , i = +t
                    , r = +e
                    , o = i & n
                    , s = r & n
                    , a = i >> 16
                    , l = r >> 16
                    , c = (a * s >>> 0) + (o * s >>> 16);
                return a * l + (c >> 16) + ((o * l >>> 0) + (c & n) >> 16)
            }
        })
    }, function (t, e, n) {
        var i = n(6);
        i(i.S, "Math", {
            umulh: function (t, e) {
                var n = 65535
                    , i = +t
                    , r = +e
                    , o = i & n
                    , s = r & n
                    , a = i >>> 16
                    , l = r >>> 16
                    , c = (a * s >>> 0) + (o * s >>> 16);
                return a * l + (c >>> 16) + ((o * l >>> 0) + (c & n) >>> 16)
            }
        })
    }, function (t, e, n) {
        var i = n(276)
            , r = n(10)
            , o = i.key
            , s = i.set;
        i.exp({
            defineMetadata: function (t, e, n, i) {
                s(t, e, r(n), o(i))
            }
        })
    }, function (t, e, i) {
        var r = i(203)
            , o = i(6)
            , s = i(21)("metadata")
            , a = s.store || (s.store = new(i(207)))
            , l = function (t, e, i) {
                var o = a.get(t);
                if (!o) {
                    if (!i) return n;
                    a.set(t, o = new r)
                }
                var s = o.get(e);
                if (!s) {
                    if (!i) return n;
                    o.set(e, s = new r)
                }
                return s
            }
            , c = function (t, e, i) {
                var r = l(e, i, !1);
                return r !== n && r.has(t)
            }
            , u = function (t, e, i) {
                var r = l(e, i, !1);
                return r === n ? n : r.get(t)
            }
            , h = function (t, e, n, i) {
                l(n, i, !0).set(t, e)
            }
            , f = function (t, e) {
                var n = l(t, e, !1)
                    , i = [];
                return n && n.forEach(function (t, e) {
                    i.push(e)
                }), i
            }
            , p = function (t) {
                return t === n || "symbol" == typeof t ? t : String(t)
            }
            , d = function (t) {
                o(o.S, "Reflect", t)
            };
        t.exports = {
            store: a
            , map: l
            , has: c
            , get: u
            , set: h
            , keys: f
            , key: p
            , exp: d
        }
    }, function (t, e, i) {
        var r = i(276)
            , o = i(10)
            , s = r.key
            , a = r.map
            , l = r.store;
        r.exp({
            deleteMetadata: function (t, e) {
                var i = 3 > arguments.length ? n : s(arguments[2])
                    , r = a(o(e), i, !1);
                if (r === n || !r.delete(t)) return !1;
                if (r.size) return !0;
                var c = l.get(e);
                return c.delete(i), !!c.size || l.delete(e)
            }
        })
    }, function (t, e, i) {
        var r = i(276)
            , o = i(10)
            , s = i(57)
            , a = r.has
            , l = r.get
            , c = r.key
            , u = function (t, e, i) {
                var r = a(t, e, i);
                if (r) return l(t, e, i);
                var o = s(e);
                return null !== o ? u(t, o, i) : n
            };
        r.exp({
            getMetadata: function (t, e) {
                return u(t, o(e), 3 > arguments.length ? n : c(arguments[2]))
            }
        })
    }, function (t, e, i) {
        var r = i(206)
            , o = i(267)
            , s = i(276)
            , a = i(10)
            , l = i(57)
            , c = s.keys
            , u = s.key
            , h = function (t, e) {
                var n = c(t, e)
                    , i = l(t);
                if (null === i) return n;
                var s = h(i, e);
                return s.length ? n.length ? o(new r(n.concat(s))) : s : n
            };
        s.exp({
            getMetadataKeys: function (t) {
                return h(a(t), 2 > arguments.length ? n : u(arguments[1]))
            }
        })
    }, function (t, e, i) {
        var r = i(276)
            , o = i(10)
            , s = r.get
            , a = r.key;
        r.exp({
            getOwnMetadata: function (t, e) {
                return s(t, o(e), 3 > arguments.length ? n : a(arguments[2]))
            }
        })
    }, function (t, e, i) {
        var r = i(276)
            , o = i(10)
            , s = r.keys
            , a = r.key;
        r.exp({
            getOwnMetadataKeys: function (t) {
                return s(o(t), 2 > arguments.length ? n : a(arguments[1]))
            }
        })
    }, function (t, e, i) {
        var r = i(276)
            , o = i(10)
            , s = i(57)
            , a = r.has
            , l = r.key
            , c = function (t, e, n) {
                var i = a(t, e, n);
                if (i) return !0;
                var r = s(e);
                return null !== r && c(t, r, n)
            };
        r.exp({
            hasMetadata: function (t, e) {
                return c(t, o(e), 3 > arguments.length ? n : l(arguments[2]))
            }
        })
    }, function (t, e, i) {
        var r = i(276)
            , o = i(10)
            , s = r.has
            , a = r.key;
        r.exp({
            hasOwnMetadata: function (t, e) {
                return s(t, o(e), 3 > arguments.length ? n : a(arguments[2]))
            }
        })
    }, function (t, e, i) {
        var r = i(276)
            , o = i(10)
            , s = i(19)
            , a = r.key
            , l = r.set;
        r.exp({
            metadata: function (t, e) {
                return function (i, r) {
                    l(t, e, (r !== n ? o : s)(i), a(r))
                }
            }
        })
    }, function (t, e, n) {
        var i = n(6)
            , r = n(201)()
            , o = n(2).process
            , s = "process" == n(32)(o);
        i(i.G, {
            asap: function (t) {
                var e = s && o.domain;
                r(e ? e.bind(t) : t)
            }
        })
    }, function (t, e, i) {
        var r = i(6)
            , o = i(2)
            , s = i(7)
            , a = i(201)()
            , l = i(23)("observable")
            , c = i(19)
            , u = i(10)
            , h = i(84)
            , f = i(202)
            , p = i(8)
            , d = i(198)
            , g = d.RETURN
            , v = function (t) {
                return null == t ? n : c(t)
            }
            , y = function (t) {
                var e = t._c;
                e && (t._c = n, e())
            }
            , m = function (t) {
                return t._o === n
            }
            , x = function (t) {
                m(t) || (t._o = n, y(t))
            }
            , b = function (t, e) {
                u(t), this._c = n, this._o = t, t = new w(this);
                try {
                    var i = e(t)
                        , r = i;
                    null != i && ("function" == typeof i.unsubscribe ? i = function () {
                        r.unsubscribe()
                    } : c(i), this._c = i)
                }
                catch (e) {
                    return void t.error(e)
                }
                m(this) && y(this)
            };
        b.prototype = f({}, {
            unsubscribe: function () {
                x(this)
            }
        });
        var w = function (t) {
            this._s = t
        };
        w.prototype = f({}, {
            next: function (t) {
                var e = this._s;
                if (!m(e)) {
                    var n = e._o;
                    try {
                        var i = v(n.next);
                        if (i) return i.call(n, t)
                    }
                    catch (t) {
                        try {
                            x(e)
                        }
                        finally {
                            throw t
                        }
                    }
                }
            }
            , error: function (t) {
                var e = this._s;
                if (m(e)) throw t;
                var i = e._o;
                e._o = n;
                try {
                    var r = v(i.error);
                    if (!r) throw t;
                    t = r.call(i, t)
                }
                catch (t) {
                    try {
                        y(e)
                    }
                    finally {
                        throw t
                    }
                }
                return y(e), t
            }
            , complete: function (t) {
                var e = this._s;
                if (!m(e)) {
                    var i = e._o;
                    e._o = n;
                    try {
                        var r = v(i.complete);
                        t = r ? r.call(i, t) : n
                    }
                    catch (t) {
                        try {
                            y(e)
                        }
                        finally {
                            throw t
                        }
                    }
                    return y(e), t
                }
            }
        });
        var k = function (t) {
            h(this, k, "Observable", "_f")._f = c(t)
        };
        f(k.prototype, {
            subscribe: function (t) {
                return new b(t, this._f)
            }
            , forEach: function (t) {
                var e = this;
                return new(s.Promise || o.Promise)(function (n, i) {
                    c(t);
                    var r = e.subscribe({
                        next: function (e) {
                            try {
                                return t(e)
                            }
                            catch (t) {
                                i(t), r.unsubscribe()
                            }
                        }
                        , error: i
                        , complete: n
                    })
                })
            }
        }), f(k, {
            from: function (t) {
                var e = "function" == typeof this ? this : k
                    , n = v(u(t)[l]);
                if (n) {
                    var i = u(n.call(t));
                    return i.constructor === e ? i : new e(function (t) {
                        return i.subscribe(t)
                    })
                }
                return new e(function (e) {
                    var n = !1;
                    return a(function () {
                            if (!n) {
                                try {
                                    if (d(t, !1, function (t) {
                                            return e.next(t), n ? g : void 0
                                        }) === g) return
                                }
                                catch (t) {
                                    if (n) throw t;
                                    return void e.error(t)
                                }
                                e.complete()
                            }
                        })
                        , function () {
                            n = !0
                        }
                })
            }
            , of: function () {
                for (var t = 0, e = arguments.length, n = Array(e); e > t;) n[t] = arguments[t++];
                return new("function" == typeof this ? this : k)(function (t) {
                    var e = !1;
                    return a(function () {
                            if (!e) {
                                for (var i = 0; n.length > i; ++i)
                                    if (t.next(n[i]), e) return;
                                t.complete()
                            }
                        })
                        , function () {
                            e = !0
                        }
                })
            }
        }), p(k.prototype, l, function () {
            return this
        }), r(r.G, {
            Observable: k
        }), i(187)("Observable")
    }, function (t, e, n) {
        var i = n(6)
            , r = n(200);
        i(i.G + i.B, {
            setImmediate: r.set
            , clearImmediate: r.clear
        })
    }, function (t, e, n) {
        for (var i = n(184), r = n(16), o = n(2), s = n(8), a = n(136), l = n(23), c = l("iterator"), u = l("toStringTag"), h = a.Array, f = ["NodeList", "DOMTokenList", "MediaList", "StyleSheetList", "CSSRuleList"], p = 0; 5 > p; p++) {
            var d, g = f[p]
                , v = o[g]
                , y = v && v.prototype;
            if (y) {
                y[c] || s(y, c, h), y[u] || s(y, u, g), a[g] = h;
                for (d in i) y[d] || r(y, d, i[d], !0)
            }
        }
    }, function (t, e, n) {
        var i = n(2)
            , r = n(6)
            , o = n(76)
            , s = n(290)
            , a = i.navigator
            , l = !!a && /MSIE .\./.test(a.userAgent)
            , c = function (t) {
                return l ? function (e, n) {
                    return t(o(s, [].slice.call(arguments, 2), "function" == typeof e ? e : Function(e)), n)
                } : t
            };
        r(r.G + r.B + r.F * l, {
            setTimeout: c(i.setTimeout)
            , setInterval: c(i.setInterval)
        })
    }, function (t, e, n) {
        var i = n(291)
            , r = n(76)
            , o = n(19);
        t.exports = function () {
            for (var t = o(this), e = arguments.length, n = Array(e), s = 0, a = i._, l = !1; e > s;)(n[s] = arguments[s++]) === a && (l = !0);
            return function () {
                var i, o = this
                    , s = arguments.length
                    , c = 0
                    , u = 0;
                if (!l && !s) return r(t, n, o);
                if (i = n.slice(), l)
                    for (; e > c; c++) i[c] === a && (i[c] = arguments[u++]);
                for (; s > u;) i.push(arguments[u++]);
                return r(t, i, o)
            }
        }
    }, function (t, e, n) {
        t.exports = n(2)
    }]), "undefined" != typeof module && module.exports ? module.exports = t : "function" == typeof define && define.amd ? define(function () {
        return t
    }) : e.core = t
}(1, 1);
var Zone$1 = function (t) {
        function e(t) {
            return "__zone_symbol__" + t
        }

        function n() {
            0 == A && 0 == k.length && (t[m] ? t[m].resolve(0)[x](o) : t[y](o, 0))
        }

        function i(t) {
            n(), k.push(t)
        }

        function r(t) {
            var e = t && t.rejection;
            e && console.error("Unhandled Promise rejection:", e instanceof Error ? e.message : e, "; Zone:", t.zone.name, "; Task:", t.task && t.task.source, "; Value:", e, e instanceof Error ? e.stack : void 0), console.error(t)
        }

        function o() {
            if (!S) {
                for (S = !0; k.length;) {
                    var t = k;
                    k = [];
                    for (var e = 0; e < t.length; e++) {
                        var n = t[e];
                        try {
                            n.zone.runTask(n, null, null)
                        }
                        catch (t) {
                            r(t)
                        }
                    }
                }
                for (; T.length;)
                    for (var i = function () {
                            var t = T.shift();
                            try {
                                t.zone.runGuarded(function () {
                                    throw t
                                })
                            }
                            catch (t) {
                                r(t)
                            }
                        }; T.length;) i();
                S = !1
            }
        }

        function s(t) {
            return t && t.then
        }

        function a(t) {
            return t
        }

        function l(t) {
            return _.reject(t)
        }

        function c(t, e) {
            return function (n) {
                u(t, e, n)
            }
        }

        function u(t, e, i) {
            if (t[C] === M)
                if (i instanceof _ && i[C] !== M) h(i), u(t, i[C], i[P]);
                else if (s(i)) i.then(c(t, e), c(t, !1));
            else {
                t[C] = e;
                var r = t[P];
                t[P] = i;
                for (var o = 0; o < r.length;) f(t, r[o++], r[o++], r[o++], r[o++]);
                if (0 == r.length && e == O) {
                    t[C] = D;
                    try {
                        throw new Error("Uncaught (in promise): " + i)
                    }
                    catch (e) {
                        var a = e;
                        a.rejection = i, a.promise = t, a.zone = d.current, a.task = d.currentTask, T.push(a), n()
                    }
                }
            }
            return t
        }

        function h(t) {
            if (t[C] === D) {
                t[C] = O;
                for (var e = 0; e < T.length; e++)
                    if (t === T[e].promise) {
                        T.splice(e, 1);
                        break
                    }
            }
        }

        function f(t, e, n, i, r) {
            h(t);
            var o = t[C] ? i || a : r || l;
            e.scheduleMicroTask(E, function () {
                try {
                    u(n, !0, e.run(o, null, [t[P]]))
                }
                catch (t) {
                    u(n, !1, t)
                }
            })
        }

        function p(t) {
            var n = t.prototype
                , i = n[e("then")] = n.then;
            n.then = function (t, e) {
                var n = this;
                return new _(function (t, e) {
                    i.call(n, t, e)
                }).then(t, e)
            }
        }
        if (t.Zone) throw new Error("Zone already loaded.");
        var d = function () {
                function n(t, e) {
                    this._properties = null, this._parent = t, this._name = e ? e.name || "unnamed" : "<root>", this._properties = e && e.properties || {}, this._zoneDelegate = new g(this, this._parent && this._parent._zoneDelegate, e)
                }
                return n.assertZonePatched = function () {
                    if (t.Promise !== _) throw new Error("Zone.js has detected that ZoneAwarePromise `(window|global).Promise` has been overwritten.\nMost likely cause is that a Promise polyfill has been loaded after Zone.js (Polyfilling Promise api is not necessary when zone.js is loaded. If you must load one, do so before loading zone.js.)")
                }, Object.defineProperty(n, "current", {
                    get: function () {
                        return b
                    }
                    , enumerable: !0
                    , configurable: !0
                }), Object.defineProperty(n, "currentTask", {
                    get: function () {
                        return w
                    }
                    , enumerable: !0
                    , configurable: !0
                }), Object.defineProperty(n.prototype, "parent", {
                    get: function () {
                        return this._parent
                    }
                    , enumerable: !0
                    , configurable: !0
                }), Object.defineProperty(n.prototype, "name", {
                    get: function () {
                        return this._name
                    }
                    , enumerable: !0
                    , configurable: !0
                }), n.prototype.get = function (t) {
                    var e = this.getZoneWith(t);
                    if (e) return e._properties[t]
                }, n.prototype.getZoneWith = function (t) {
                    for (var e = this; e;) {
                        if (e._properties.hasOwnProperty(t)) return e;
                        e = e._parent
                    }
                    return null
                }, n.prototype.fork = function (t) {
                    if (!t) throw new Error("ZoneSpec required!");
                    return this._zoneDelegate.fork(this, t)
                }, n.prototype.wrap = function (t, e) {
                    if ("function" != typeof t) throw new Error("Expecting function got: " + t);
                    var n = this._zoneDelegate.intercept(this, t, e)
                        , i = this;
                    return function () {
                        return i.runGuarded(n, this, arguments, e)
                    }
                }, n.prototype.run = function (t, e, n, i) {
                    void 0 === e && (e = null), void 0 === n && (n = null), void 0 === i && (i = null);
                    var r = b;
                    b = this;
                    try {
                        return this._zoneDelegate.invoke(this, t, e, n, i)
                    }
                    finally {
                        b = r
                    }
                }, n.prototype.runGuarded = function (t, e, n, i) {
                    void 0 === e && (e = null), void 0 === n && (n = null), void 0 === i && (i = null);
                    var r = b;
                    b = this;
                    try {
                        try {
                            return this._zoneDelegate.invoke(this, t, e, n, i)
                        }
                        catch (t) {
                            if (this._zoneDelegate.handleError(this, t)) throw t
                        }
                    }
                    finally {
                        b = r
                    }
                }, n.prototype.runTask = function (t, e, n) {
                    if (t.runCount++, t.zone != this) throw new Error("A task can only be run in the zone which created it! (Creation: " + t.zone.name + "; Execution: " + this.name + ")");
                    var i = w;
                    w = t;
                    var r = b;
                    b = this;
                    try {
                        "macroTask" == t.type && t.data && !t.data.isPeriodic && (t.cancelFn = null);
                        try {
                            return this._zoneDelegate.invokeTask(this, t, e, n)
                        }
                        catch (t) {
                            if (this._zoneDelegate.handleError(this, t)) throw t
                        }
                    }
                    finally {
                        b = r, w = i
                    }
                }, n.prototype.scheduleMicroTask = function (t, e, n, i) {
                    return this._zoneDelegate.scheduleTask(this, new v("microTask", this, t, e, n, i, null))
                }, n.prototype.scheduleMacroTask = function (t, e, n, i, r) {
                    return this._zoneDelegate.scheduleTask(this, new v("macroTask", this, t, e, n, i, r))
                }, n.prototype.scheduleEventTask = function (t, e, n, i, r) {
                    return this._zoneDelegate.scheduleTask(this, new v("eventTask", this, t, e, n, i, r))
                }, n.prototype.cancelTask = function (t) {
                    var e = this._zoneDelegate.cancelTask(this, t);
                    return t.runCount = -1, t.cancelFn = null, e
                }, n.__symbol__ = e, n
            }()
            , g = function () {
                function t(t, e, n) {
                    this._taskCounts = {
                        microTask: 0
                        , macroTask: 0
                        , eventTask: 0
                    }, this.zone = t, this._parentDelegate = e, this._forkZS = n && (n && n.onFork ? n : e._forkZS), this._forkDlgt = n && (n.onFork ? e : e._forkDlgt), this._interceptZS = n && (n.onIntercept ? n : e._interceptZS), this._interceptDlgt = n && (n.onIntercept ? e : e._interceptDlgt), this._invokeZS = n && (n.onInvoke ? n : e._invokeZS), this._invokeDlgt = n && (n.onInvoke ? e : e._invokeDlgt), this._handleErrorZS = n && (n.onHandleError ? n : e._handleErrorZS), this._handleErrorDlgt = n && (n.onHandleError ? e : e._handleErrorDlgt), this._scheduleTaskZS = n && (n.onScheduleTask ? n : e._scheduleTaskZS), this._scheduleTaskDlgt = n && (n.onScheduleTask ? e : e._scheduleTaskDlgt), this._invokeTaskZS = n && (n.onInvokeTask ? n : e._invokeTaskZS), this._invokeTaskDlgt = n && (n.onInvokeTask ? e : e._invokeTaskDlgt), this._cancelTaskZS = n && (n.onCancelTask ? n : e._cancelTaskZS), this._cancelTaskDlgt = n && (n.onCancelTask ? e : e._cancelTaskDlgt), this._hasTaskZS = n && (n.onHasTask ? n : e._hasTaskZS), this._hasTaskDlgt = n && (n.onHasTask ? e : e._hasTaskDlgt)
                }
                return t.prototype.fork = function (t, e) {
                    return this._forkZS ? this._forkZS.onFork(this._forkDlgt, this.zone, t, e) : new d(t, e)
                }, t.prototype.intercept = function (t, e, n) {
                    return this._interceptZS ? this._interceptZS.onIntercept(this._interceptDlgt, this.zone, t, e, n) : e
                }, t.prototype.invoke = function (t, e, n, i, r) {
                    return this._invokeZS ? this._invokeZS.onInvoke(this._invokeDlgt, this.zone, t, e, n, i, r) : e.apply(n, i)
                }, t.prototype.handleError = function (t, e) {
                    return !this._handleErrorZS || this._handleErrorZS.onHandleError(this._handleErrorDlgt, this.zone, t, e)
                }, t.prototype.scheduleTask = function (t, e) {
                    try {
                        if (this._scheduleTaskZS) return this._scheduleTaskZS.onScheduleTask(this._scheduleTaskDlgt, this.zone, t, e);
                        if (e.scheduleFn) e.scheduleFn(e);
                        else {
                            if ("microTask" != e.type) throw new Error("Task is missing scheduleFn.");
                            i(e)
                        }
                        return e
                    }
                    finally {
                        t == this.zone && this._updateTaskCount(e.type, 1)
                    }
                }, t.prototype.invokeTask = function (t, e, n, i) {
                    try {
                        return this._invokeTaskZS ? this._invokeTaskZS.onInvokeTask(this._invokeTaskDlgt, this.zone, t, e, n, i) : e.callback.apply(n, i)
                    }
                    finally {
                        t != this.zone || "eventTask" == e.type || e.data && e.data.isPeriodic || this._updateTaskCount(e.type, -1)
                    }
                }, t.prototype.cancelTask = function (t, e) {
                    var n;
                    if (this._cancelTaskZS) n = this._cancelTaskZS.onCancelTask(this._cancelTaskDlgt, this.zone, t, e);
                    else {
                        if (!e.cancelFn) throw new Error("Task does not support cancellation, or is already canceled.");
                        n = e.cancelFn(e)
                    }
                    return t == this.zone && this._updateTaskCount(e.type, -1), n
                }, t.prototype.hasTask = function (t, e) {
                    return this._hasTaskZS && this._hasTaskZS.onHasTask(this._hasTaskDlgt, this.zone, t, e)
                }, t.prototype._updateTaskCount = function (t, e) {
                    var n = this._taskCounts
                        , i = n[t]
                        , r = n[t] = i + e;
                    if (r < 0) throw new Error("More tasks executed then were scheduled.");
                    if (0 == i || 0 == r) {
                        var o = {
                            microTask: n.microTask > 0
                            , macroTask: n.macroTask > 0
                            , eventTask: n.eventTask > 0
                            , change: t
                        };
                        try {
                            this.hasTask(this.zone, o)
                        }
                        finally {
                            this._parentDelegate && this._parentDelegate._updateTaskCount(t, e)
                        }
                    }
                }, t
            }()
            , v = function () {
                function t(t, e, n, i, r, s, a) {
                    this.runCount = 0, this.type = t, this.zone = e, this.source = n, this.data = r, this.scheduleFn = s, this.cancelFn = a, this.callback = i;
                    var l = this;
                    this.invoke = function () {
                        A++;
                        try {
                            return e.runTask(l, this, arguments)
                        }
                        finally {
                            1 == A && o(), A--
                        }
                    }
                }
                return t.prototype.toString = function () {
                    return this.data && "undefined" != typeof this.data.handleId ? this.data.handleId : this.toString()
                }, t
            }()
            , y = e("setTimeout")
            , m = e("Promise")
            , x = e("then")
            , b = new d(null, null)
            , w = null
            , k = []
            , S = !1
            , T = []
            , A = 0
            , C = e("state")
            , P = e("value")
            , E = "Promise.then"
            , M = null
            , L = !0
            , O = !1
            , D = 0
            , _ = function () {
                function t(e) {
                    var n = this;
                    if (!(n instanceof t)) throw new Error("Must be an instanceof Promise.");
                    n[C] = M, n[P] = [];
                    try {
                        e && e(c(n, L), c(n, O))
                    }
                    catch (t) {
                        u(n, !1, t)
                    }
                }
                return t.resolve = function (t) {
                    return u(new this(null), L, t)
                }, t.reject = function (t) {
                    return u(new this(null), O, t)
                }, t.race = function (t) {
                    function e(t) {
                        o && (o = i(t))
                    }

                    function n(t) {
                        o && (o = r(t))
                    }
                    for (var i, r, o = new this(function (t, e) {
                            i = t, r = e
                        }), a = 0, l = t; a < l.length; a++) {
                        var c = l[a];
                        s(c) || (c = this.resolve(c)), c.then(e, n)
                    }
                    return o
                }, t.all = function (t) {
                    for (var e, n, i = new this(function (t, i) {
                            e = t, n = i
                        }), r = 0, o = [], a = 0, l = t; a < l.length; a++) {
                        var c = l[a];
                        s(c) || (c = this.resolve(c)), c.then(function (t) {
                            return function (n) {
                                o[t] = n, r--, r || e(o)
                            }
                        }(r), n), r++
                    }
                    return r || e(o), i
                }, t.prototype.then = function (t, e) {
                    var n = new this.constructor(null)
                        , i = d.current;
                    return this[C] == M ? this[P].push(i, n, t, e) : f(this, i, n, t, e), n
                }, t.prototype.catch = function (t) {
                    return this.then(null, t)
                }, t
            }();
        _.resolve = _.resolve, _.reject = _.reject, _.race = _.race, _.all = _.all;
        var I = t[e("Promise")] = t.Promise;
        if (t.Promise = _, I && (p(I), "undefined" != typeof t.fetch)) {
            var N = void 0;
            try {
                N = t.fetch()
            }
            catch (e) {
                N = t.fetch("about:blank")
            }
            N.then(function () {
                return null
            }, function () {
                return null
            }), N.constructor != I && p(N.constructor)
        }
        return Promise[d.__symbol__("uncaughtPromiseErrors")] = T, t.Zone = d
    }("object" == typeof window && window || "object" == typeof self && self || global)
    , zoneSymbol = Zone.__symbol__
    , _global$1 = "object" == typeof window && window || "object" == typeof self && self || global
    , isWebWorker = "undefined" != typeof WorkerGlobalScope && self instanceof WorkerGlobalScope
    , isNode = "undefined" != typeof process && "[object process]" === {}.toString.call(process)
    , isBrowser = !isNode && !isWebWorker && !("undefined" == typeof window || !window.HTMLElement)
    , EVENT_TASKS = zoneSymbol("eventTasks")
    , ADD_EVENT_LISTENER = "addEventListener"
    , REMOVE_EVENT_LISTENER = "removeEventListener"
    , zoneAwareAddEventListener = makeZoneAwareAddListener(ADD_EVENT_LISTENER, REMOVE_EVENT_LISTENER)
    , zoneAwareRemoveEventListener = makeZoneAwareRemoveListener(REMOVE_EVENT_LISTENER)
    , originalInstanceKey = zoneSymbol("originalInstance")
    , WTF_ISSUE_555 = "Anchor,Area,Audio,BR,Base,BaseFont,Body,Button,Canvas,Content,DList,Directory,Div,Embed,FieldSet,Font,Form,Frame,FrameSet,HR,Head,Heading,Html,IFrame,Image,Input,Keygen,LI,Label,Legend,Link,Map,Marquee,Media,Menu,Meta,Meter,Mod,OList,Object,OptGroup,Option,Output,Paragraph,Pre,Progress,Quote,Script,Select,Source,Span,Style,TableCaption,TableCell,TableCol,Table,TableRow,TableSection,TextArea,Title,Track,UList,Unknown,Video"
    , NO_EVENT_TARGET = "ApplicationCache,EventSource,FileReader,InputMethodContext,MediaController,MessagePort,Node,Performance,SVGElementInstance,SharedWorker,TextTrack,TextTrackCue,TextTrackList,WebKitNamedFlow,Window,Worker,WorkerGlobalScope,XMLHttpRequest,XMLHttpRequestEventTarget,XMLHttpRequestUpload,IDBRequest,IDBOpenDBRequest,IDBDatabase,IDBTransaction,IDBCursor,DBIndex".split(",")
    , EVENT_TARGET = "EventTarget"
    , _defineProperty = Object[zoneSymbol("defineProperty")] = Object.defineProperty
    , _getOwnPropertyDescriptor = Object[zoneSymbol("getOwnPropertyDescriptor")] = Object.getOwnPropertyDescriptor
    , _create = Object.create
    , unconfigurablesKey = zoneSymbol("unconfigurables")
    , eventNames = "copy cut paste abort blur focus canplay canplaythrough change click contextmenu dblclick drag dragend dragenter dragleave dragover dragstart drop durationchange emptied ended input invalid keydown keypress keyup load loadeddata loadedmetadata loadstart message mousedown mouseenter mouseleave mousemove mouseout mouseover mouseup pause play playing progress ratechange reset scroll seeked seeking select show stalled submit suspend timeupdate volumechange waiting mozfullscreenchange mozfullscreenerror mozpointerlockchange mozpointerlockerror error webglcontextrestored webglcontextlost webglcontextcreationerror".split(" ")
    , unboundKey = zoneSymbol("unbound")
    , set = "set"
    , clear = "clear"
    , blockingMethods = ["alert", "prompt", "confirm"]
    , _global = "object" == typeof window && window || "object" == typeof self && self || global;
patchTimer(_global, set, clear, "Timeout"), patchTimer(_global, set, clear, "Interval"), patchTimer(_global, set, clear, "Immediate"), patchTimer(_global, "request", "cancel", "AnimationFrame"), patchTimer(_global, "mozRequest", "mozCancel", "AnimationFrame"), patchTimer(_global, "webkitRequest", "webkitCancel", "AnimationFrame");
for (var i = 0; i < blockingMethods.length; i++) {
    var name = blockingMethods[i];
    patchMethod(_global, name, function (t, e, n) {
        return function (e, i) {
            return Zone.current.run(t, _global, i, n)
        }
    })
}
eventTargetPatch(_global), propertyDescriptorPatch(_global), patchClass("MutationObserver"), patchClass("WebKitMutationObserver"), patchClass("FileReader"), propertyPatch(), registerElementPatch(_global), patchXHR(_global);
var XHR_TASK = zoneSymbol("xhrTask")
    , XHR_SYNC = zoneSymbol("xhrSync");
_global.navigator && _global.navigator.geolocation && patchPrototype(_global.navigator.geolocation, ["getCurrentPosition", "watchPosition"]), ! function (t, e) {
        "use strict";
        "object" == typeof module && "object" == typeof module.exports ? module.exports = t.document ? e(t, !0) : function (t) {
            if (!t.document) throw new Error("jQuery requires a window with a document");
            return e(t)
        } : e(t)
    }("undefined" != typeof window ? window : this, function (t, e) {
        "use strict";

        function n(t, e) {
            e = e || Q;
            var n = e.createElement("script");
            n.text = t, e.head.appendChild(n).parentNode.removeChild(n)
        }

        function i(t) {
            var e = !!t && "length" in t && t.length
                , n = ft.type(t);
            return "function" !== n && !ft.isWindow(t) && ("array" === n || 0 === e || "number" == typeof e && e > 0 && e - 1 in t)
        }

        function r(t, e, n) {
            if (ft.isFunction(e)) return ft.grep(t, function (t, i) {
                return !!e.call(t, i, t) !== n
            });
            if (e.nodeType) return ft.grep(t, function (t) {
                return t === e !== n
            });
            if ("string" == typeof e) {
                if (kt.test(e)) return ft.filter(e, t, n);
                e = ft.filter(e, t)
            }
            return ft.grep(t, function (t) {
                return rt.call(e, t) > -1 !== n && 1 === t.nodeType
            })
        }

        function o(t, e) {
            for (;
                (t = t[e]) && 1 !== t.nodeType;);
            return t
        }

        function s(t) {
            var e = {};
            return ft.each(t.match(Et) || [], function (t, n) {
                e[n] = !0
            }), e
        }

        function a(t) {
            return t
        }

        function l(t) {
            throw t
        }

        function c(t, e, n) {
            var i;
            try {
                t && ft.isFunction(i = t.promise) ? i.call(t).done(e).fail(n) : t && ft.isFunction(i = t.then) ? i.call(t, e, n) : e.call(void 0, t)
            }
            catch (t) {
                n.call(void 0, t)
            }
        }

        function u() {
            Q.removeEventListener("DOMContentLoaded", u), t.removeEventListener("load", u), ft.ready()
        }

        function h() {
            this.expando = ft.expando + h.uid++
        }

        function f(t, e, n) {
            var i;
            if (void 0 === n && 1 === t.nodeType)
                if (i = "data-" + e.replace(Ft, "-$&").toLowerCase(), n = t.getAttribute(i), "string" == typeof n) {
                    try {
                        n = "true" === n || "false" !== n && ("null" === n ? null : +n + "" === n ? +n : Nt.test(n) ? JSON.parse(n) : n)
                    }
                    catch (t) {}
                    It.set(t, e, n)
                }
                else n = void 0;
            return n
        }

        function p(t, e, n, i) {
            var r, o = 1
                , s = 20
                , a = i ? function () {
                    return i.cur()
                } : function () {
                    return ft.css(t, e, "")
                }
                , l = a()
                , c = n && n[3] || (ft.cssNumber[e] ? "" : "px")
                , u = (ft.cssNumber[e] || "px" !== c && +l) && jt.exec(ft.css(t, e));
            if (u && u[3] !== c) {
                c = c || u[3], n = n || [], u = +l || 1;
                do o = o || ".5", u /= o, ft.style(t, e, u + c); while (o !== (o = a() / l) && 1 !== o && --s)
            }
            return n && (u = +u || +l || 0, r = n[1] ? u + (n[1] + 1) * n[2] : +n[2], i && (i.unit = c, i.start = u, i.end = r)), r
        }

        function d(t) {
            var e, n = t.ownerDocument
                , i = t.nodeName
                , r = Wt[i];
            return r ? r : (e = n.body.appendChild(n.createElement(i)), r = ft.css(e, "display"), e.parentNode.removeChild(e), "none" === r && (r = "block"), Wt[i] = r, r)
        }

        function g(t, e) {
            for (var n, i, r = [], o = 0, s = t.length; s > o; o++) i = t[o], i.style && (n = i.style.display, e ? ("none" === n && (r[o] = _t.get(i, "display") || null, r[o] || (i.style.display = "")), "" === i.style.display && Ht(i) && (r[o] = d(i))) : "none" !== n && (r[o] = "none", _t.set(i, "display", n)));
            for (o = 0; s > o; o++) null != r[o] && (t[o].style.display = r[o]);
            return t
        }

        function v(t, e) {
            var n = "undefined" != typeof t.getElementsByTagName ? t.getElementsByTagName(e || "*") : "undefined" != typeof t.querySelectorAll ? t.querySelectorAll(e || "*") : [];
            return void 0 === e || e && ft.nodeName(t, e) ? ft.merge([t], n) : n
        }

        function y(t, e) {
            for (var n = 0, i = t.length; i > n; n++) _t.set(t[n], "globalEval", !e || _t.get(e[n], "globalEval"))
        }

        function m(t, e, n, i, r) {
            for (var o, s, a, l, c, u, h = e.createDocumentFragment(), f = [], p = 0, d = t.length; d > p; p++)
                if (o = t[p], o || 0 === o)
                    if ("object" === ft.type(o)) ft.merge(f, o.nodeType ? [o] : o);
                    else if (Vt.test(o)) {
                for (s = s || h.appendChild(e.createElement("div")), a = (Gt.exec(o) || ["", ""])[1].toLowerCase(), l = qt[a] || qt._default, s.innerHTML = l[1] + ft.htmlPrefilter(o) + l[2], u = l[0]; u--;) s = s.lastChild;
                ft.merge(f, s.childNodes), s = h.firstChild, s.textContent = ""
            }
            else f.push(e.createTextNode(o));
            for (h.textContent = "", p = 0; o = f[p++];)
                if (i && ft.inArray(o, i) > -1) r && r.push(o);
                else if (c = ft.contains(o.ownerDocument, o), s = v(h.appendChild(o), "script"), c && y(s), n)
                for (u = 0; o = s[u++];) Yt.test(o.type || "") && n.push(o);
            return h
        }

        function x() {
            return !0
        }

        function b() {
            return !1
        }

        function w() {
            try {
                return Q.activeElement
            }
            catch (t) {}
        }

        function k(t, e, n, i, r, o) {
            var s, a;
            if ("object" == typeof e) {
                "string" != typeof n && (i = i || n, n = void 0);
                for (a in e) k(t, a, n, i, e[a], o);
                return t
            }
            if (null == i && null == r ? (r = n, i = n = void 0) : null == r && ("string" == typeof n ? (r = i, i = void 0) : (r = i, i = n, n = void 0)), r === !1) r = b;
            else if (!r) return t;
            return 1 === o && (s = r, r = function (t) {
                return ft().off(t), s.apply(this, arguments)
            }, r.guid = s.guid || (s.guid = ft.guid++)), t.each(function () {
                ft.event.add(this, e, r, i, n)
            })
        }

        function S(t, e) {
            return ft.nodeName(t, "table") && ft.nodeName(11 !== e.nodeType ? e : e.firstChild, "tr") ? t.getElementsByTagName("tbody")[0] || t : t
        }

        function T(t) {
            return t.type = (null !== t.getAttribute("type")) + "/" + t.type, t
        }

        function A(t) {
            var e = ee.exec(t.type);
            return e ? t.type = e[1] : t.removeAttribute("type"), t
        }

        function C(t, e) {
            var n, i, r, o, s, a, l, c;
            if (1 === e.nodeType) {
                if (_t.hasData(t) && (o = _t.access(t), s = _t.set(e, o), c = o.events)) {
                    delete s.handle, s.events = {};
                    for (r in c)
                        for (n = 0, i = c[r].length; i > n; n++) ft.event.add(e, r, c[r][n])
                }
                It.hasData(t) && (a = It.access(t), l = ft.extend({}, a), It.set(e, l))
            }
        }

        function P(t, e) {
            var n = e.nodeName.toLowerCase();
            "input" === n && Xt.test(t.type) ? e.checked = t.checked : "input" !== n && "textarea" !== n || (e.defaultValue = t.defaultValue)
        }

        function E(t, e, i, r) {
            e = nt.apply([], e);
            var o, s, a, l, c, u, h = 0
                , f = t.length
                , p = f - 1
                , d = e[0]
                , g = ft.isFunction(d);
            if (g || f > 1 && "string" == typeof d && !ut.checkClone && te.test(d)) return t.each(function (n) {
                var o = t.eq(n);
                g && (e[0] = d.call(this, n, o.html())), E(o, e, i, r)
            });
            if (f && (o = m(e, t[0].ownerDocument, !1, t, r), s = o.firstChild, 1 === o.childNodes.length && (o = s), s || r)) {
                for (a = ft.map(v(o, "script"), T), l = a.length; f > h; h++) c = o, h !== p && (c = ft.clone(c, !0, !0), l && ft.merge(a, v(c, "script"))), i.call(t[h], c, h);
                if (l)
                    for (u = a[a.length - 1].ownerDocument, ft.map(a, A), h = 0; l > h; h++) c = a[h], Yt.test(c.type || "") && !_t.access(c, "globalEval") && ft.contains(u, c) && (c.src ? ft._evalUrl && ft._evalUrl(c.src) : n(c.textContent.replace(ne, ""), u))
            }
            return t
        }

        function M(t, e, n) {
            for (var i, r = e ? ft.filter(e, t) : t, o = 0; null != (i = r[o]); o++) n || 1 !== i.nodeType || ft.cleanData(v(i)), i.parentNode && (n && ft.contains(i.ownerDocument, i) && y(v(i, "script")), i.parentNode.removeChild(i));
            return t
        }

        function L(t, e, n) {
            var i, r, o, s, a = t.style;
            return n = n || oe(t), n && (s = n.getPropertyValue(e) || n[e], "" !== s || ft.contains(t.ownerDocument, t) || (s = ft.style(t, e)), !ut.pixelMarginRight() && re.test(s) && ie.test(e) && (i = a.width, r = a.minWidth, o = a.maxWidth, a.minWidth = a.maxWidth = a.width = s, s = n.width, a.width = i, a.minWidth = r, a.maxWidth = o)), void 0 !== s ? s + "" : s
        }

        function O(t, e) {
            return {
                get: function () {
                    return t() ? void delete this.get : (this.get = e).apply(this, arguments)
                }
            }
        }

        function D(t) {
            if (t in ue) return t;
            for (var e = t[0].toUpperCase() + t.slice(1), n = ce.length; n--;)
                if (t = ce[n] + e, t in ue) return t
        }

        function _(t, e, n) {
            var i = jt.exec(e);
            return i ? Math.max(0, i[2] - (n || 0)) + (i[3] || "px") : e
        }

        function I(t, e, n, i, r) {
            for (var o = n === (i ? "border" : "content") ? 4 : "width" === e ? 1 : 0, s = 0; 4 > o; o += 2) "margin" === n && (s += ft.css(t, n + zt[o], !0, r)), i ? ("content" === n && (s -= ft.css(t, "padding" + zt[o], !0, r)), "margin" !== n && (s -= ft.css(t, "border" + zt[o] + "Width", !0, r))) : (s += ft.css(t, "padding" + zt[o], !0, r), "padding" !== n && (s += ft.css(t, "border" + zt[o] + "Width", !0, r)));
            return s
        }

        function N(t, e, n) {
            var i, r = !0
                , o = oe(t)
                , s = "border-box" === ft.css(t, "boxSizing", !1, o);
            if (t.getClientRects().length && (i = t.getBoundingClientRect()[e]), 0 >= i || null == i) {
                if (i = L(t, e, o), (0 > i || null == i) && (i = t.style[e]), re.test(i)) return i;
                r = s && (ut.boxSizingReliable() || i === t.style[e]), i = parseFloat(i) || 0
            }
            return i + I(t, e, n || (s ? "border" : "content"), r, o) + "px"
        }

        function F(t, e, n, i, r) {
            return new F.prototype.init(t, e, n, i, r)
        }

        function R() {
            fe && (t.requestAnimationFrame(R), ft.fx.tick())
        }

        function j() {
            return t.setTimeout(function () {
                he = void 0
            }), he = ft.now()
        }

        function z(t, e) {
            var n, i = 0
                , r = {
                    height: t
                };
            for (e = e ? 1 : 0; 4 > i; i += 2 - e) n = zt[i], r["margin" + n] = r["padding" + n] = t;
            return e && (r.opacity = r.width = t), r
        }

        function H(t, e, n) {
            for (var i, r = (X.tweeners[e] || []).concat(X.tweeners["*"]), o = 0, s = r.length; s > o; o++)
                if (i = r[o].call(n, e, t)) return i
        }

        function B(t, e, n) {
            var i, r, o, s, a, l, c, u, h = "width" in e || "height" in e
                , f = this
                , p = {}
                , d = t.style
                , v = t.nodeType && Ht(t)
                , y = _t.get(t, "fxshow");
            n.queue || (s = ft._queueHooks(t, "fx"), null == s.unqueued && (s.unqueued = 0, a = s.empty.fire, s.empty.fire = function () {
                s.unqueued || a()
            }), s.unqueued++, f.always(function () {
                f.always(function () {
                    s.unqueued--, ft.queue(t, "fx").length || s.empty.fire()
                })
            }));
            for (i in e)
                if (r = e[i], pe.test(r)) {
                    if (delete e[i], o = o || "toggle" === r, r === (v ? "hide" : "show")) {
                        if ("show" !== r || !y || void 0 === y[i]) continue;
                        v = !0
                    }
                    p[i] = y && y[i] || ft.style(t, i)
                }
            if (l = !ft.isEmptyObject(e), l || !ft.isEmptyObject(p)) {
                h && 1 === t.nodeType && (n.overflow = [d.overflow, d.overflowX, d.overflowY], c = y && y.display, null == c && (c = _t.get(t, "display")), u = ft.css(t, "display"), "none" === u && (c ? u = c : (g([t], !0), c = t.style.display || c, u = ft.css(t, "display"), g([t]))), ("inline" === u || "inline-block" === u && null != c) && "none" === ft.css(t, "float") && (l || (f.done(function () {
                    d.display = c
                }), null == c && (u = d.display, c = "none" === u ? "" : u)), d.display = "inline-block")), n.overflow && (d.overflow = "hidden", f.always(function () {
                    d.overflow = n.overflow[0], d.overflowX = n.overflow[1], d.overflowY = n.overflow[2]
                })), l = !1;
                for (i in p) l || (y ? "hidden" in y && (v = y.hidden) : y = _t.access(t, "fxshow", {
                    display: c
                }), o && (y.hidden = !v), v && g([t], !0), f.done(function () {
                    v || g([t]), _t.remove(t, "fxshow");
                    for (i in p) ft.style(t, i, p[i])
                })), l = H(v ? y[i] : 0, i, f), i in y || (y[i] = l.start, v && (l.end = l.start, l.start = 0))
            }
        }

        function W(t, e) {
            var n, i, r, o, s;
            for (n in t)
                if (i = ft.camelCase(n), r = e[i], o = t[n], ft.isArray(o) && (r = o[1], o = t[n] = o[0]), n !== i && (t[i] = o, delete t[n]), s = ft.cssHooks[i], s && "expand" in s) {
                    o = s.expand(o), delete t[i];
                    for (n in o) n in t || (t[n] = o[n], e[n] = r)
                }
                else e[i] = r
        }

        function X(t, e, n) {
            var i, r, o = 0
                , s = X.prefilters.length
                , a = ft.Deferred().always(function () {
                    delete l.elem
                })
                , l = function () {
                    if (r) return !1;
                    for (var e = he || j(), n = Math.max(0, c.startTime + c.duration - e), i = n / c.duration || 0, o = 1 - i, s = 0, l = c.tweens.length; l > s; s++) c.tweens[s].run(o);
                    return a.notifyWith(t, [c, o, n]), 1 > o && l ? n : (a.resolveWith(t, [c]), !1)
                }
                , c = a.promise({
                    elem: t
                    , props: ft.extend({}, e)
                    , opts: ft.extend(!0, {
                        specialEasing: {}
                        , easing: ft.easing._default
                    }, n)
                    , originalProperties: e
                    , originalOptions: n
                    , startTime: he || j()
                    , duration: n.duration
                    , tweens: []
                    , createTween: function (e, n) {
                        var i = ft.Tween(t, c.opts, e, n, c.opts.specialEasing[e] || c.opts.easing);
                        return c.tweens.push(i), i
                    }
                    , stop: function (e) {
                        var n = 0
                            , i = e ? c.tweens.length : 0;
                        if (r) return this;
                        for (r = !0; i > n; n++) c.tweens[n].run(1);
                        return e ? (a.notifyWith(t, [c, 1, 0]), a.resolveWith(t, [c, e])) : a.rejectWith(t, [c, e]), this
                    }
                })
                , u = c.props;
            for (W(u, c.opts.specialEasing); s > o; o++)
                if (i = X.prefilters[o].call(c, t, u, c.opts)) return ft.isFunction(i.stop) && (ft._queueHooks(c.elem, c.opts.queue).stop = ft.proxy(i.stop, i)), i;
            return ft.map(u, H, c), ft.isFunction(c.opts.start) && c.opts.start.call(t, c), ft.fx.timer(ft.extend(l, {
                elem: t
                , anim: c
                , queue: c.opts.queue
            })), c.progress(c.opts.progress).done(c.opts.done, c.opts.complete).fail(c.opts.fail).always(c.opts.always)
        }

        function G(t) {
            return t.getAttribute && t.getAttribute("class") || ""
        }

        function Y(t, e, n, i) {
            var r;
            if (ft.isArray(e)) ft.each(e, function (e, r) {
                n || Ce.test(t) ? i(t, r) : Y(t + "[" + ("object" == typeof r && null != r ? e : "") + "]", r, n, i)
            });
            else if (n || "object" !== ft.type(e)) i(t, e);
            else
                for (r in e) Y(t + "[" + r + "]", e[r], n, i)
        }

        function q(t) {
            return function (e, n) {
                "string" != typeof e && (n = e, e = "*");
                var i, r = 0
                    , o = e.toLowerCase().match(Et) || [];
                if (ft.isFunction(n))
                    for (; i = o[r++];) "+" === i[0] ? (i = i.slice(1) || "*", (t[i] = t[i] || []).unshift(n)) : (t[i] = t[i] || []).push(n)
            }
        }

        function V(t, e, n, i) {
            function r(a) {
                var l;
                return o[a] = !0, ft.each(t[a] || [], function (t, a) {
                    var c = a(e, n, i);
                    return "string" != typeof c || s || o[c] ? s ? !(l = c) : void 0 : (e.dataTypes.unshift(c), r(c), !1)
                }), l
            }
            var o = {}
                , s = t === je;
            return r(e.dataTypes[0]) || !o["*"] && r("*")
        }

        function U(t, e) {
            var n, i, r = ft.ajaxSettings.flatOptions || {};
            for (n in e) void 0 !== e[n] && ((r[n] ? t : i || (i = {}))[n] = e[n]);
            return i && ft.extend(!0, t, i), t
        }

        function Z(t, e, n) {
            for (var i, r, o, s, a = t.contents, l = t.dataTypes;
                "*" === l[0];) l.shift(), void 0 === i && (i = t.mimeType || e.getResponseHeader("Content-Type"));
            if (i)
                for (r in a)
                    if (a[r] && a[r].test(i)) {
                        l.unshift(r);
                        break
                    }
            if (l[0] in n) o = l[0];
            else {
                for (r in n) {
                    if (!l[0] || t.converters[r + " " + l[0]]) {
                        o = r;
                        break
                    }
                    s || (s = r)
                }
                o = o || s
            }
            return o ? (o !== l[0] && l.unshift(o), n[o]) : void 0
        }

        function $(t, e, n, i) {
            var r, o, s, a, l, c = {}
                , u = t.dataTypes.slice();
            if (u[1])
                for (s in t.converters) c[s.toLowerCase()] = t.converters[s];
            for (o = u.shift(); o;)
                if (t.responseFields[o] && (n[t.responseFields[o]] = e), !l && i && t.dataFilter && (e = t.dataFilter(e, t.dataType)), l = o, o = u.shift())
                    if ("*" === o) o = l;
                    else if ("*" !== l && l !== o) {
                if (s = c[l + " " + o] || c["* " + o], !s)
                    for (r in c)
                        if (a = r.split(" "), a[1] === o && (s = c[l + " " + a[0]] || c["* " + a[0]])) {
                            s === !0 ? s = c[r] : c[r] !== !0 && (o = a[0], u.unshift(a[1]));
                            break
                        }
                if (s !== !0)
                    if (s && t.throws) e = s(e);
                    else try {
                        e = s(e)
                    }
                    catch (t) {
                        return {
                            state: "parsererror"
                            , error: s ? t : "No conversion from " + l + " to " + o
                        }
                    }
            }
            return {
                state: "success"
                , data: e
            }
        }

        function K(t) {
            return ft.isWindow(t) ? t : 9 === t.nodeType && t.defaultView
        }
        var J = []
            , Q = t.document
            , tt = Object.getPrototypeOf
            , et = J.slice
            , nt = J.concat
            , it = J.push
            , rt = J.indexOf
            , ot = {}
            , st = ot.toString
            , at = ot.hasOwnProperty
            , lt = at.toString
            , ct = lt.call(Object)
            , ut = {}
            , ht = "3.0.0"
            , ft = function (t, e) {
                return new ft.fn.init(t, e)
            }
            , pt = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g
            , dt = /^-ms-/
            , gt = /-([a-z])/g
            , vt = function (t, e) {
                return e.toUpperCase()
            };
        ft.fn = ft.prototype = {
            jquery: ht
            , constructor: ft
            , length: 0
            , toArray: function () {
                return et.call(this)
            }
            , get: function (t) {
                return null != t ? 0 > t ? this[t + this.length] : this[t] : et.call(this)
            }
            , pushStack: function (t) {
                var e = ft.merge(this.constructor(), t);
                return e.prevObject = this, e
            }
            , each: function (t) {
                return ft.each(this, t)
            }
            , map: function (t) {
                return this.pushStack(ft.map(this, function (e, n) {
                    return t.call(e, n, e)
                }))
            }
            , slice: function () {
                return this.pushStack(et.apply(this, arguments))
            }
            , first: function () {
                return this.eq(0)
            }
            , last: function () {
                return this.eq(-1)
            }
            , eq: function (t) {
                var e = this.length
                    , n = +t + (0 > t ? e : 0);
                return this.pushStack(n >= 0 && e > n ? [this[n]] : [])
            }
            , end: function () {
                return this.prevObject || this.constructor()
            }
            , push: it
            , sort: J.sort
            , splice: J.splice
        }, ft.extend = ft.fn.extend = function () {
            var t, e, n, i, r, o, s = arguments[0] || {}
                , a = 1
                , l = arguments.length
                , c = !1;
            for ("boolean" == typeof s && (c = s, s = arguments[a] || {}, a++), "object" == typeof s || ft.isFunction(s) || (s = {}), a === l && (s = this, a--); l > a; a++)
                if (null != (t = arguments[a]))
                    for (e in t) n = s[e], i = t[e], s !== i && (c && i && (ft.isPlainObject(i) || (r = ft.isArray(i))) ? (r ? (r = !1, o = n && ft.isArray(n) ? n : []) : o = n && ft.isPlainObject(n) ? n : {}, s[e] = ft.extend(c, o, i)) : void 0 !== i && (s[e] = i));
            return s
        }, ft.extend({
            expando: "jQuery" + (ht + Math.random()).replace(/\D/g, "")
            , isReady: !0
            , error: function (t) {
                throw new Error(t)
            }
            , noop: function () {}
            , isFunction: function (t) {
                return "function" === ft.type(t)
            }
            , isArray: Array.isArray
            , isWindow: function (t) {
                return null != t && t === t.window
            }
            , isNumeric: function (t) {
                var e = ft.type(t);
                return ("number" === e || "string" === e) && !isNaN(t - parseFloat(t))
            }
            , isPlainObject: function (t) {
                var e, n;
                return !(!t || "[object Object]" !== st.call(t)) && (!(e = tt(t)) || (n = at.call(e, "constructor") && e.constructor, "function" == typeof n && lt.call(n) === ct))
            }
            , isEmptyObject: function (t) {
                var e;
                for (e in t) return !1;
                return !0
            }
            , type: function (t) {
                return null == t ? t + "" : "object" == typeof t || "function" == typeof t ? ot[st.call(t)] || "object" : typeof t
            }
            , globalEval: function (t) {
                n(t)
            }
            , camelCase: function (t) {
                return t.replace(dt, "ms-").replace(gt, vt)
            }
            , nodeName: function (t, e) {
                return t.nodeName && t.nodeName.toLowerCase() === e.toLowerCase()
            }
            , each: function (t, e) {
                var n, r = 0;
                if (i(t))
                    for (n = t.length; n > r && e.call(t[r], r, t[r]) !== !1; r++);
                else
                    for (r in t)
                        if (e.call(t[r], r, t[r]) === !1) break; return t
            }
            , trim: function (t) {
                return null == t ? "" : (t + "").replace(pt, "")
            }
            , makeArray: function (t, e) {
                var n = e || [];
                return null != t && (i(Object(t)) ? ft.merge(n, "string" == typeof t ? [t] : t) : it.call(n, t)), n
            }
            , inArray: function (t, e, n) {
                return null == e ? -1 : rt.call(e, t, n)
            }
            , merge: function (t, e) {
                for (var n = +e.length, i = 0, r = t.length; n > i; i++) t[r++] = e[i];
                return t.length = r, t
            }
            , grep: function (t, e, n) {
                for (var i, r = [], o = 0, s = t.length, a = !n; s > o; o++) i = !e(t[o], o), i !== a && r.push(t[o]);
                return r
            }
            , map: function (t, e, n) {
                var r, o, s = 0
                    , a = [];
                if (i(t))
                    for (r = t.length; r > s; s++) o = e(t[s], s, n), null != o && a.push(o);
                else
                    for (s in t) o = e(t[s], s, n), null != o && a.push(o);
                return nt.apply([], a)
            }
            , guid: 1
            , proxy: function (t, e) {
                var n, i, r;
                return "string" == typeof e && (n = t[e], e = t, t = n), ft.isFunction(t) ? (i = et.call(arguments, 2), r = function () {
                    return t.apply(e || this, i.concat(et.call(arguments)))
                }, r.guid = t.guid = t.guid || ft.guid++, r) : void 0
            }
            , now: Date.now
            , support: ut
        }), "function" == typeof Symbol && (ft.fn[Symbol.iterator] = J[Symbol.iterator]), ft.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "), function (t, e) {
            ot["[object " + e + "]"] = e.toLowerCase()
        });
        var yt = function (t) {
            function e(t, e, n, i) {
                var r, o, s, a, l, c, u, f = e && e.ownerDocument
                    , d = e ? e.nodeType : 9;
                if (n = n || [], "string" != typeof t || !t || 1 !== d && 9 !== d && 11 !== d) return n;
                if (!i && ((e ? e.ownerDocument || e : B) !== _ && D(e), e = e || _, N)) {
                    if (11 !== d && (l = yt.exec(t)))
                        if (r = l[1]) {
                            if (9 === d) {
                                if (!(s = e.getElementById(r))) return n;
                                if (s.id === r) return n.push(s), n
                            }
                            else if (f && (s = f.getElementById(r)) && z(e, s) && s.id === r) return n.push(s), n
                        }
                        else {
                            if (l[2]) return J.apply(n, e.getElementsByTagName(t)), n;
                            if ((r = l[3]) && k.getElementsByClassName && e.getElementsByClassName) return J.apply(n, e.getElementsByClassName(r)), n
                        }
                    if (k.qsa && !q[t + " "] && (!F || !F.test(t))) {
                        if (1 !== d) f = e, u = t;
                        else if ("object" !== e.nodeName.toLowerCase()) {
                            for ((a = e.getAttribute("id")) ? a = a.replace(wt, kt) : e.setAttribute("id", a = H), c = C(t), o = c.length; o--;) c[o] = "#" + a + " " + p(c[o]);
                            u = c.join(","), f = mt.test(t) && h(e.parentNode) || e
                        }
                        if (u) try {
                            return J.apply(n, f.querySelectorAll(u)), n
                        }
                        catch (t) {}
                        finally {
                            a === H && e.removeAttribute("id")
                        }
                    }
                }
                return E(t.replace(at, "$1"), e, n, i)
            }

            function n() {
                function t(n, i) {
                    return e.push(n + " ") > S.cacheLength && delete t[e.shift()], t[n + " "] = i
                }
                var e = [];
                return t
            }

            function i(t) {
                return t[H] = !0, t
            }

            function r(t) {
                var e = _.createElement("fieldset");
                try {
                    return !!t(e)
                }
                catch (t) {
                    return !1
                }
                finally {
                    e.parentNode && e.parentNode.removeChild(e), e = null
                }
            }

            function o(t, e) {
                for (var n = t.split("|"), i = n.length; i--;) S.attrHandle[n[i]] = e
            }

            function s(t, e) {
                var n = e && t
                    , i = n && 1 === t.nodeType && 1 === e.nodeType && t.sourceIndex - e.sourceIndex;
                if (i) return i;
                if (n)
                    for (; n = n.nextSibling;)
                        if (n === e) return -1;
                return t ? 1 : -1
            }

            function a(t) {
                return function (e) {
                    var n = e.nodeName.toLowerCase();
                    return "input" === n && e.type === t
                }
            }

            function l(t) {
                return function (e) {
                    var n = e.nodeName.toLowerCase();
                    return ("input" === n || "button" === n) && e.type === t
                }
            }

            function c(t) {
                return function (e) {
                    return "label" in e && e.disabled === t || "form" in e && e.disabled === t || "form" in e && e.disabled === !1 && (e.isDisabled === t || e.isDisabled !== !t && ("label" in e || !Tt(e)) !== t)
                }
            }

            function u(t) {
                return i(function (e) {
                    return e = +e, i(function (n, i) {
                        for (var r, o = t([], n.length, e), s = o.length; s--;) n[r = o[s]] && (n[r] = !(i[r] = n[r]))
                    })
                })
            }

            function h(t) {
                return t && "undefined" != typeof t.getElementsByTagName && t
            }

            function f() {}

            function p(t) {
                for (var e = 0, n = t.length, i = ""; n > e; e++) i += t[e].value;
                return i
            }

            function d(t, e, n) {
                var i = e.dir
                    , r = e.next
                    , o = r || i
                    , s = n && "parentNode" === o
                    , a = X++;
                return e.first ? function (e, n, r) {
                    for (; e = e[i];)
                        if (1 === e.nodeType || s) return t(e, n, r)
                } : function (e, n, l) {
                    var c, u, h, f = [W, a];
                    if (l) {
                        for (; e = e[i];)
                            if ((1 === e.nodeType || s) && t(e, n, l)) return !0
                    }
                    else
                        for (; e = e[i];)
                            if (1 === e.nodeType || s)
                                if (h = e[H] || (e[H] = {}), u = h[e.uniqueID] || (h[e.uniqueID] = {}), r && r === e.nodeName.toLowerCase()) e = e[i] || e;
                                else {
                                    if ((c = u[o]) && c[0] === W && c[1] === a) return f[2] = c[2];
                                    if (u[o] = f, f[2] = t(e, n, l)) return !0
                                }
                }
            }

            function g(t) {
                return t.length > 1 ? function (e, n, i) {
                    for (var r = t.length; r--;)
                        if (!t[r](e, n, i)) return !1;
                    return !0
                } : t[0]
            }

            function v(t, n, i) {
                for (var r = 0, o = n.length; o > r; r++) e(t, n[r], i);
                return i
            }

            function y(t, e, n, i, r) {
                for (var o, s = [], a = 0, l = t.length, c = null != e; l > a; a++)(o = t[a]) && (n && !n(o, i, r) || (s.push(o), c && e.push(a)));
                return s
            }

            function m(t, e, n, r, o, s) {
                return r && !r[H] && (r = m(r)), o && !o[H] && (o = m(o, s)), i(function (i, s, a, l) {
                    var c, u, h, f = []
                        , p = []
                        , d = s.length
                        , g = i || v(e || "*", a.nodeType ? [a] : a, [])
                        , m = !t || !i && e ? g : y(g, f, t, a, l)
                        , x = n ? o || (i ? t : d || r) ? [] : s : m;
                    if (n && n(m, x, a, l), r)
                        for (c = y(x, p), r(c, [], a, l), u = c.length; u--;)(h = c[u]) && (x[p[u]] = !(m[p[u]] = h));
                    if (i) {
                        if (o || t) {
                            if (o) {
                                for (c = [], u = x.length; u--;)(h = x[u]) && c.push(m[u] = h);
                                o(null, x = [], c, l)
                            }
                            for (u = x.length; u--;)(h = x[u]) && (c = o ? tt(i, h) : f[u]) > -1 && (i[c] = !(s[c] = h))
                        }
                    }
                    else x = y(x === s ? x.splice(d, x.length) : x), o ? o(null, s, x, l) : J.apply(s, x)
                })
            }

            function x(t) {
                for (var e, n, i, r = t.length, o = S.relative[t[0].type], s = o || S.relative[" "], a = o ? 1 : 0, l = d(function (t) {
                        return t === e
                    }, s, !0), c = d(function (t) {
                        return tt(e, t) > -1
                    }, s, !0), u = [function (t, n, i) {
                        var r = !o && (i || n !== M) || ((e = n).nodeType ? l(t, n, i) : c(t, n, i));
                        return e = null, r
                    }]; r > a; a++)
                    if (n = S.relative[t[a].type]) u = [d(g(u), n)];
                    else {
                        if (n = S.filter[t[a].type].apply(null, t[a].matches), n[H]) {
                            for (i = ++a; r > i && !S.relative[t[i].type]; i++);
                            return m(a > 1 && g(u), a > 1 && p(t.slice(0, a - 1).concat({
                                value: " " === t[a - 2].type ? "*" : ""
                            })).replace(at, "$1"), n, i > a && x(t.slice(a, i)), r > i && x(t = t.slice(i)), r > i && p(t))
                        }
                        u.push(n)
                    }
                return g(u)
            }

            function b(t, n) {
                var r = n.length > 0
                    , o = t.length > 0
                    , s = function (i, s, a, l, c) {
                        var u, h, f, p = 0
                            , d = "0"
                            , g = i && []
                            , v = []
                            , m = M
                            , x = i || o && S.find.TAG("*", c)
                            , b = W += null == m ? 1 : Math.random() || .1
                            , w = x.length;
                        for (c && (M = s === _ || s || c); d !== w && null != (u = x[d]); d++) {
                            if (o && u) {
                                for (h = 0, s || u.ownerDocument === _ || (D(u), a = !N); f = t[h++];)
                                    if (f(u, s || _, a)) {
                                        l.push(u);
                                        break
                                    }
                                c && (W = b)
                            }
                            r && ((u = !f && u) && p--, i && g.push(u))
                        }
                        if (p += d, r && d !== p) {
                            for (h = 0; f = n[h++];) f(g, v, s, a);
                            if (i) {
                                if (p > 0)
                                    for (; d--;) g[d] || v[d] || (v[d] = $.call(l));
                                v = y(v)
                            }
                            J.apply(l, v), c && !i && v.length > 0 && p + n.length > 1 && e.uniqueSort(l)
                        }
                        return c && (W = b, M = m), g
                    };
                return r ? i(s) : s
            }
            var w, k, S, T, A, C, P, E, M, L, O, D, _, I, N, F, R, j, z, H = "sizzle" + 1 * new Date
                , B = t.document
                , W = 0
                , X = 0
                , G = n()
                , Y = n()
                , q = n()
                , V = function (t, e) {
                    return t === e && (O = !0), 0
                }
                , U = {}.hasOwnProperty
                , Z = []
                , $ = Z.pop
                , K = Z.push
                , J = Z.push
                , Q = Z.slice
                , tt = function (t, e) {
                    for (var n = 0, i = t.length; i > n; n++)
                        if (t[n] === e) return n;
                    return -1
                }
                , et = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped"
                , nt = "[\\x20\\t\\r\\n\\f]"
                , it = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+"
                , rt = "\\[" + nt + "*(" + it + ")(?:" + nt + "*([*^$|!~]?=)" + nt + "*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + it + "))|)" + nt + "*\\]"
                , ot = ":(" + it + ")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|" + rt + ")*)|.*)\\)|)"
                , st = new RegExp(nt + "+", "g")
                , at = new RegExp("^" + nt + "+|((?:^|[^\\\\])(?:\\\\.)*)" + nt + "+$", "g")
                , lt = new RegExp("^" + nt + "*," + nt + "*")
                , ct = new RegExp("^" + nt + "*([>+~]|" + nt + ")" + nt + "*")
                , ut = new RegExp("=" + nt + "*([^\\]'\"]*?)" + nt + "*\\]", "g")
                , ht = new RegExp(ot)
                , ft = new RegExp("^" + it + "$")
                , pt = {
                    ID: new RegExp("^#(" + it + ")")
                    , CLASS: new RegExp("^\\.(" + it + ")")
                    , TAG: new RegExp("^(" + it + "|[*])")
                    , ATTR: new RegExp("^" + rt)
                    , PSEUDO: new RegExp("^" + ot)
                    , CHILD: new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + nt + "*(even|odd|(([+-]|)(\\d*)n|)" + nt + "*(?:([+-]|)" + nt + "*(\\d+)|))" + nt + "*\\)|)", "i")
                    , bool: new RegExp("^(?:" + et + ")$", "i")
                    , needsContext: new RegExp("^" + nt + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + nt + "*((?:-\\d)?\\d*)" + nt + "*\\)|)(?=[^-]|$)", "i")
                }
                , dt = /^(?:input|select|textarea|button)$/i
                , gt = /^h\d$/i
                , vt = /^[^{]+\{\s*\[native \w/
                , yt = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/
                , mt = /[+~]/
                , xt = new RegExp("\\\\([\\da-f]{1,6}" + nt + "?|(" + nt + ")|.)", "ig")
                , bt = function (t, e, n) {
                    var i = "0x" + e - 65536;
                    return i !== i || n ? e : 0 > i ? String.fromCharCode(i + 65536) : String.fromCharCode(i >> 10 | 55296, 1023 & i | 56320)
                }
                , wt = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\x80-\uFFFF\w-]/g
                , kt = function (t, e) {
                    return e ? "\0" === t ? "�" : t.slice(0, -1) + "\\" + t.charCodeAt(t.length - 1).toString(16) + " " : "\\" + t
                }
                , St = function () {
                    D()
                }
                , Tt = d(function (t) {
                    return t.disabled === !0
                }, {
                    dir: "parentNode"
                    , next: "legend"
                });
            try {
                J.apply(Z = Q.call(B.childNodes), B.childNodes), Z[B.childNodes.length].nodeType
            }
            catch (t) {
                J = {
                    apply: Z.length ? function (t, e) {
                        K.apply(t, Q.call(e))
                    } : function (t, e) {
                        for (var n = t.length, i = 0; t[n++] = e[i++];);
                        t.length = n - 1
                    }
                }
            }
            k = e.support = {}, A = e.isXML = function (t) {
                var e = t && (t.ownerDocument || t).documentElement;
                return !!e && "HTML" !== e.nodeName
            }, D = e.setDocument = function (t) {
                var e, n, i = t ? t.ownerDocument || t : B;
                return i !== _ && 9 === i.nodeType && i.documentElement ? (_ = i, I = _.documentElement, N = !A(_), B !== _ && (n = _.defaultView) && n.top !== n && (n.addEventListener ? n.addEventListener("unload", St, !1) : n.attachEvent && n.attachEvent("onunload", St)), k.attributes = r(function (t) {
                    return t.className = "i", !t.getAttribute("className")
                }), k.getElementsByTagName = r(function (t) {
                    return t.appendChild(_.createComment("")), !t.getElementsByTagName("*").length
                }), k.getElementsByClassName = vt.test(_.getElementsByClassName), k.getById = r(function (t) {
                    return I.appendChild(t).id = H, !_.getElementsByName || !_.getElementsByName(H).length
                }), k.getById ? (S.find.ID = function (t, e) {
                    if ("undefined" != typeof e.getElementById && N) {
                        var n = e.getElementById(t);
                        return n ? [n] : []
                    }
                }, S.filter.ID = function (t) {
                    var e = t.replace(xt, bt);
                    return function (t) {
                        return t.getAttribute("id") === e
                    }
                }) : (delete S.find.ID, S.filter.ID = function (t) {
                    var e = t.replace(xt, bt);
                    return function (t) {
                        var n = "undefined" != typeof t.getAttributeNode && t.getAttributeNode("id");
                        return n && n.value === e
                    }
                }), S.find.TAG = k.getElementsByTagName ? function (t, e) {
                    return "undefined" != typeof e.getElementsByTagName ? e.getElementsByTagName(t) : k.qsa ? e.querySelectorAll(t) : void 0
                } : function (t, e) {
                    var n, i = []
                        , r = 0
                        , o = e.getElementsByTagName(t);
                    if ("*" === t) {
                        for (; n = o[r++];) 1 === n.nodeType && i.push(n);
                        return i
                    }
                    return o
                }, S.find.CLASS = k.getElementsByClassName && function (t, e) {
                    return "undefined" != typeof e.getElementsByClassName && N ? e.getElementsByClassName(t) : void 0
                }, R = [], F = [], (k.qsa = vt.test(_.querySelectorAll)) && (r(function (t) {
                    I.appendChild(t).innerHTML = "<a id='" + H + "'></a><select id='" + H + "-\r\\' msallowcapture=''><option selected=''></option></select>", t.querySelectorAll("[msallowcapture^='']").length && F.push("[*^$]=" + nt + "*(?:''|\"\")"), t.querySelectorAll("[selected]").length || F.push("\\[" + nt + "*(?:value|" + et + ")"), t.querySelectorAll("[id~=" + H + "-]").length || F.push("~="), t.querySelectorAll(":checked").length || F.push(":checked"), t.querySelectorAll("a#" + H + "+*").length || F.push(".#.+[+~]")
                }), r(function (t) {
                    t.innerHTML = "<a href='' disabled='disabled'></a><select disabled='disabled'><option/></select>";
                    var e = _.createElement("input");
                    e.setAttribute("type", "hidden"), t.appendChild(e).setAttribute("name", "D"), t.querySelectorAll("[name=d]").length && F.push("name" + nt + "*[*^$|!~]?="), 2 !== t.querySelectorAll(":enabled").length && F.push(":enabled", ":disabled"), I.appendChild(t).disabled = !0, 2 !== t.querySelectorAll(":disabled").length && F.push(":enabled", ":disabled"), t.querySelectorAll("*,:x"), F.push(",.*:")
                })), (k.matchesSelector = vt.test(j = I.matches || I.webkitMatchesSelector || I.mozMatchesSelector || I.oMatchesSelector || I.msMatchesSelector)) && r(function (t) {
                    k.disconnectedMatch = j.call(t, "*"), j.call(t, "[s!='']:x"), R.push("!=", ot)
                }), F = F.length && new RegExp(F.join("|")), R = R.length && new RegExp(R.join("|")), e = vt.test(I.compareDocumentPosition), z = e || vt.test(I.contains) ? function (t, e) {
                    var n = 9 === t.nodeType ? t.documentElement : t
                        , i = e && e.parentNode;
                    return t === i || !(!i || 1 !== i.nodeType || !(n.contains ? n.contains(i) : t.compareDocumentPosition && 16 & t.compareDocumentPosition(i)))
                } : function (t, e) {
                    if (e)
                        for (; e = e.parentNode;)
                            if (e === t) return !0;
                    return !1
                }, V = e ? function (t, e) {
                    if (t === e) return O = !0, 0;
                    var n = !t.compareDocumentPosition - !e.compareDocumentPosition;
                    return n ? n : (n = (t.ownerDocument || t) === (e.ownerDocument || e) ? t.compareDocumentPosition(e) : 1, 1 & n || !k.sortDetached && e.compareDocumentPosition(t) === n ? t === _ || t.ownerDocument === B && z(B, t) ? -1 : e === _ || e.ownerDocument === B && z(B, e) ? 1 : L ? tt(L, t) - tt(L, e) : 0 : 4 & n ? -1 : 1)
                } : function (t, e) {
                    if (t === e) return O = !0, 0;
                    var n, i = 0
                        , r = t.parentNode
                        , o = e.parentNode
                        , a = [t]
                        , l = [e];
                    if (!r || !o) return t === _ ? -1 : e === _ ? 1 : r ? -1 : o ? 1 : L ? tt(L, t) - tt(L, e) : 0;
                    if (r === o) return s(t, e);
                    for (n = t; n = n.parentNode;) a.unshift(n);
                    for (n = e; n = n.parentNode;) l.unshift(n);
                    for (; a[i] === l[i];) i++;
                    return i ? s(a[i], l[i]) : a[i] === B ? -1 : l[i] === B ? 1 : 0
                }, _) : _
            }, e.matches = function (t, n) {
                return e(t, null, null, n)
            }, e.matchesSelector = function (t, n) {
                if ((t.ownerDocument || t) !== _ && D(t), n = n.replace(ut, "='$1']"), k.matchesSelector && N && !q[n + " "] && (!R || !R.test(n)) && (!F || !F.test(n))) try {
                    var i = j.call(t, n);
                    if (i || k.disconnectedMatch || t.document && 11 !== t.document.nodeType) return i
                }
                catch (t) {}
                return e(n, _, null, [t]).length > 0
            }, e.contains = function (t, e) {
                return (t.ownerDocument || t) !== _ && D(t), z(t, e)
            }, e.attr = function (t, e) {
                (t.ownerDocument || t) !== _ && D(t);
                var n = S.attrHandle[e.toLowerCase()]
                    , i = n && U.call(S.attrHandle, e.toLowerCase()) ? n(t, e, !N) : void 0;
                return void 0 !== i ? i : k.attributes || !N ? t.getAttribute(e) : (i = t.getAttributeNode(e)) && i.specified ? i.value : null
            }, e.escape = function (t) {
                return (t + "").replace(wt, kt)
            }, e.error = function (t) {
                throw new Error("Syntax error, unrecognized expression: " + t)
            }, e.uniqueSort = function (t) {
                var e, n = []
                    , i = 0
                    , r = 0;
                if (O = !k.detectDuplicates, L = !k.sortStable && t.slice(0), t.sort(V), O) {
                    for (; e = t[r++];) e === t[r] && (i = n.push(r));
                    for (; i--;) t.splice(n[i], 1)
                }
                return L = null, t
            }, T = e.getText = function (t) {
                var e, n = ""
                    , i = 0
                    , r = t.nodeType;
                if (r) {
                    if (1 === r || 9 === r || 11 === r) {
                        if ("string" == typeof t.textContent) return t.textContent;
                        for (t = t.firstChild; t; t = t.nextSibling) n += T(t)
                    }
                    else if (3 === r || 4 === r) return t.nodeValue
                }
                else
                    for (; e = t[i++];) n += T(e);
                return n
            }, S = e.selectors = {
                cacheLength: 50
                , createPseudo: i
                , match: pt
                , attrHandle: {}
                , find: {}
                , relative: {
                    ">": {
                        dir: "parentNode"
                        , first: !0
                    }
                    , " ": {
                        dir: "parentNode"
                    }
                    , "+": {
                        dir: "previousSibling"
                        , first: !0
                    }
                    , "~": {
                        dir: "previousSibling"
                    }
                }
                , preFilter: {
                    ATTR: function (t) {
                        return t[1] = t[1].replace(xt, bt), t[3] = (t[3] || t[4] || t[5] || "").replace(xt, bt), "~=" === t[2] && (t[3] = " " + t[3] + " "), t.slice(0, 4)
                    }
                    , CHILD: function (t) {
                        return t[1] = t[1].toLowerCase(), "nth" === t[1].slice(0, 3) ? (t[3] || e.error(t[0]), t[4] = +(t[4] ? t[5] + (t[6] || 1) : 2 * ("even" === t[3] || "odd" === t[3])), t[5] = +(t[7] + t[8] || "odd" === t[3])) : t[3] && e.error(t[0]), t
                    }
                    , PSEUDO: function (t) {
                        var e, n = !t[6] && t[2];
                        return pt.CHILD.test(t[0]) ? null : (t[3] ? t[2] = t[4] || t[5] || "" : n && ht.test(n) && (e = C(n, !0)) && (e = n.indexOf(")", n.length - e) - n.length) && (t[0] = t[0].slice(0, e), t[2] = n.slice(0, e)), t.slice(0, 3))
                    }
                }
                , filter: {
                    TAG: function (t) {
                        var e = t.replace(xt, bt).toLowerCase();
                        return "*" === t ? function () {
                            return !0
                        } : function (t) {
                            return t.nodeName && t.nodeName.toLowerCase() === e
                        }
                    }
                    , CLASS: function (t) {
                        var e = G[t + " "];
                        return e || (e = new RegExp("(^|" + nt + ")" + t + "(" + nt + "|$)")) && G(t, function (t) {
                            return e.test("string" == typeof t.className && t.className || "undefined" != typeof t.getAttribute && t.getAttribute("class") || "")
                        })
                    }
                    , ATTR: function (t, n, i) {
                        return function (r) {
                            var o = e.attr(r, t);
                            return null == o ? "!=" === n : !n || (o += "", "=" === n ? o === i : "!=" === n ? o !== i : "^=" === n ? i && 0 === o.indexOf(i) : "*=" === n ? i && o.indexOf(i) > -1 : "$=" === n ? i && o.slice(-i.length) === i : "~=" === n ? (" " + o.replace(st, " ") + " ").indexOf(i) > -1 : "|=" === n && (o === i || o.slice(0, i.length + 1) === i + "-"))
                        }
                    }
                    , CHILD: function (t, e, n, i, r) {
                        var o = "nth" !== t.slice(0, 3)
                            , s = "last" !== t.slice(-4)
                            , a = "of-type" === e;
                        return 1 === i && 0 === r ? function (t) {
                            return !!t.parentNode
                        } : function (e, n, l) {
                            var c, u, h, f, p, d, g = o !== s ? "nextSibling" : "previousSibling"
                                , v = e.parentNode
                                , y = a && e.nodeName.toLowerCase()
                                , m = !l && !a
                                , x = !1;
                            if (v) {
                                if (o) {
                                    for (; g;) {
                                        for (f = e; f = f[g];)
                                            if (a ? f.nodeName.toLowerCase() === y : 1 === f.nodeType) return !1;
                                        d = g = "only" === t && !d && "nextSibling"
                                    }
                                    return !0
                                }
                                if (d = [s ? v.firstChild : v.lastChild], s && m) {
                                    for (f = v, h = f[H] || (f[H] = {}), u = h[f.uniqueID] || (h[f.uniqueID] = {}), c = u[t] || [], p = c[0] === W && c[1], x = p && c[2], f = p && v.childNodes[p]; f = ++p && f && f[g] || (x = p = 0) || d.pop();)
                                        if (1 === f.nodeType && ++x && f === e) {
                                            u[t] = [W, p, x];
                                            break
                                        }
                                }
                                else if (m && (f = e, h = f[H] || (f[H] = {}), u = h[f.uniqueID] || (h[f.uniqueID] = {}), c = u[t] || [], p = c[0] === W && c[1], x = p), x === !1)
                                    for (;
                                        (f = ++p && f && f[g] || (x = p = 0) || d.pop()) && ((a ? f.nodeName.toLowerCase() !== y : 1 !== f.nodeType) || !++x || (m && (h = f[H] || (f[H] = {}), u = h[f.uniqueID] || (h[f.uniqueID] = {}), u[t] = [W, x]), f !== e)););
                                return x -= r, x === i || x % i === 0 && x / i >= 0
                            }
                        }
                    }
                    , PSEUDO: function (t, n) {
                        var r, o = S.pseudos[t] || S.setFilters[t.toLowerCase()] || e.error("unsupported pseudo: " + t);
                        return o[H] ? o(n) : o.length > 1 ? (r = [t, t, "", n], S.setFilters.hasOwnProperty(t.toLowerCase()) ? i(function (t, e) {
                            for (var i, r = o(t, n), s = r.length; s--;) i = tt(t, r[s]), t[i] = !(e[i] = r[s])
                        }) : function (t) {
                            return o(t, 0, r)
                        }) : o
                    }
                }
                , pseudos: {
                    not: i(function (t) {
                        var e = []
                            , n = []
                            , r = P(t.replace(at, "$1"));
                        return r[H] ? i(function (t, e, n, i) {
                            for (var o, s = r(t, null, i, []), a = t.length; a--;)(o = s[a]) && (t[a] = !(e[a] = o))
                        }) : function (t, i, o) {
                            return e[0] = t, r(e, null, o, n), e[0] = null, !n.pop()
                        }
                    })
                    , has: i(function (t) {
                        return function (n) {
                            return e(t, n).length > 0
                        }
                    })
                    , contains: i(function (t) {
                        return t = t.replace(xt, bt)
                            , function (e) {
                                return (e.textContent || e.innerText || T(e)).indexOf(t) > -1
                            }
                    })
                    , lang: i(function (t) {
                        return ft.test(t || "") || e.error("unsupported lang: " + t), t = t.replace(xt, bt).toLowerCase()
                            , function (e) {
                                var n;
                                do
                                    if (n = N ? e.lang : e.getAttribute("xml:lang") || e.getAttribute("lang")) return n = n.toLowerCase(), n === t || 0 === n.indexOf(t + "-");
                                while ((e = e.parentNode) && 1 === e.nodeType);
                                return !1
                            }
                    })
                    , target: function (e) {
                        var n = t.location && t.location.hash;
                        return n && n.slice(1) === e.id
                    }
                    , root: function (t) {
                        return t === I
                    }
                    , focus: function (t) {
                        return t === _.activeElement && (!_.hasFocus || _.hasFocus()) && !!(t.type || t.href || ~t.tabIndex)
                    }
                    , enabled: c(!1)
                    , disabled: c(!0)
                    , checked: function (t) {
                        var e = t.nodeName.toLowerCase();
                        return "input" === e && !!t.checked || "option" === e && !!t.selected
                    }
                    , selected: function (t) {
                        return t.parentNode && t.parentNode.selectedIndex, t.selected === !0
                    }
                    , empty: function (t) {
                        for (t = t.firstChild; t; t = t.nextSibling)
                            if (t.nodeType < 6) return !1;
                        return !0
                    }
                    , parent: function (t) {
                        return !S.pseudos.empty(t)
                    }
                    , header: function (t) {
                        return gt.test(t.nodeName)
                    }
                    , input: function (t) {
                        return dt.test(t.nodeName)
                    }
                    , button: function (t) {
                        var e = t.nodeName.toLowerCase();
                        return "input" === e && "button" === t.type || "button" === e
                    }
                    , text: function (t) {
                        var e;
                        return "input" === t.nodeName.toLowerCase() && "text" === t.type && (null == (e = t.getAttribute("type")) || "text" === e.toLowerCase())
                    }
                    , first: u(function () {
                        return [0]
                    })
                    , last: u(function (t, e) {
                        return [e - 1]
                    })
                    , eq: u(function (t, e, n) {
                        return [0 > n ? n + e : n]
                    })
                    , even: u(function (t, e) {
                        for (var n = 0; e > n; n += 2) t.push(n);
                        return t
                    })
                    , odd: u(function (t, e) {
                        for (var n = 1; e > n; n += 2) t.push(n);
                        return t
                    })
                    , lt: u(function (t, e, n) {
                        for (var i = 0 > n ? n + e : n; --i >= 0;) t.push(i);
                        return t
                    })
                    , gt: u(function (t, e, n) {
                        for (var i = 0 > n ? n + e : n; ++i < e;) t.push(i);
                        return t
                    })
                }
            }, S.pseudos.nth = S.pseudos.eq;
            for (w in {
                    radio: !0
                    , checkbox: !0
                    , file: !0
                    , password: !0
                    , image: !0
                }) S.pseudos[w] = a(w);
            for (w in {
                    submit: !0
                    , reset: !0
                }) S.pseudos[w] = l(w);
            return f.prototype = S.filters = S.pseudos, S.setFilters = new f, C = e.tokenize = function (t, n) {
                var i, r, o, s, a, l, c, u = Y[t + " "];
                if (u) return n ? 0 : u.slice(0);
                for (a = t, l = [], c = S.preFilter; a;) {
                    i && !(r = lt.exec(a)) || (r && (a = a.slice(r[0].length) || a), l.push(o = [])), i = !1, (r = ct.exec(a)) && (i = r.shift(), o.push({
                        value: i
                        , type: r[0].replace(at, " ")
                    }), a = a.slice(i.length));
                    for (s in S.filter) !(r = pt[s].exec(a)) || c[s] && !(r = c[s](r)) || (i = r.shift(), o.push({
                        value: i
                        , type: s
                        , matches: r
                    }), a = a.slice(i.length));
                    if (!i) break
                }
                return n ? a.length : a ? e.error(t) : Y(t, l).slice(0)
            }, P = e.compile = function (t, e) {
                var n, i = []
                    , r = []
                    , o = q[t + " "];
                if (!o) {
                    for (e || (e = C(t)), n = e.length; n--;) o = x(e[n]), o[H] ? i.push(o) : r.push(o);
                    o = q(t, b(r, i)), o.selector = t
                }
                return o
            }, E = e.select = function (t, e, n, i) {
                var r, o, s, a, l, c = "function" == typeof t && t
                    , u = !i && C(t = c.selector || t);
                if (n = n || [], 1 === u.length) {
                    if (o = u[0] = u[0].slice(0), o.length > 2 && "ID" === (s = o[0]).type && k.getById && 9 === e.nodeType && N && S.relative[o[1].type]) {
                        if (e = (S.find.ID(s.matches[0].replace(xt, bt), e) || [])[0], !e) return n;
                        c && (e = e.parentNode), t = t.slice(o.shift().value.length)
                    }
                    for (r = pt.needsContext.test(t) ? 0 : o.length; r-- && (s = o[r], !S.relative[a = s.type]);)
                        if ((l = S.find[a]) && (i = l(s.matches[0].replace(xt, bt), mt.test(o[0].type) && h(e.parentNode) || e))) {
                            if (o.splice(r, 1), t = i.length && p(o), !t) return J.apply(n, i), n;
                            break
                        }
                }
                return (c || P(t, u))(i, e, !N, n, !e || mt.test(t) && h(e.parentNode) || e), n
            }, k.sortStable = H.split("").sort(V).join("") === H, k.detectDuplicates = !!O, D(), k.sortDetached = r(function (t) {
                return 1 & t.compareDocumentPosition(_.createElement("fieldset"))
            }), r(function (t) {
                return t.innerHTML = "<a href='#'></a>", "#" === t.firstChild.getAttribute("href")
            }) || o("type|href|height|width", function (t, e, n) {
                return n ? void 0 : t.getAttribute(e, "type" === e.toLowerCase() ? 1 : 2)
            }), k.attributes && r(function (t) {
                return t.innerHTML = "<input/>", t.firstChild.setAttribute("value", ""), "" === t.firstChild.getAttribute("value")
            }) || o("value", function (t, e, n) {
                return n || "input" !== t.nodeName.toLowerCase() ? void 0 : t.defaultValue
            }), r(function (t) {
                return null == t.getAttribute("disabled")
            }) || o(et, function (t, e, n) {
                var i;
                return n ? void 0 : t[e] === !0 ? e.toLowerCase() : (i = t.getAttributeNode(e)) && i.specified ? i.value : null
            }), e
        }(t);
        ft.find = yt, ft.expr = yt.selectors, ft.expr[":"] = ft.expr.pseudos, ft.uniqueSort = ft.unique = yt.uniqueSort, ft.text = yt.getText, ft.isXMLDoc = yt.isXML, ft.contains = yt.contains, ft.escapeSelector = yt.escape;
        var mt = function (t, e, n) {
                for (var i = [], r = void 0 !== n;
                    (t = t[e]) && 9 !== t.nodeType;)
                    if (1 === t.nodeType) {
                        if (r && ft(t).is(n)) break;
                        i.push(t)
                    }
                return i
            }
            , xt = function (t, e) {
                for (var n = []; t; t = t.nextSibling) 1 === t.nodeType && t !== e && n.push(t);
                return n
            }
            , bt = ft.expr.match.needsContext
            , wt = /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i
            , kt = /^.[^:#\[\.,]*$/;
        ft.filter = function (t, e, n) {
            var i = e[0];
            return n && (t = ":not(" + t + ")"), 1 === e.length && 1 === i.nodeType ? ft.find.matchesSelector(i, t) ? [i] : [] : ft.find.matches(t, ft.grep(e, function (t) {
                return 1 === t.nodeType
            }))
        }, ft.fn.extend({
            find: function (t) {
                var e, n, i = this.length
                    , r = this;
                if ("string" != typeof t) return this.pushStack(ft(t).filter(function () {
                    for (e = 0; i > e; e++)
                        if (ft.contains(r[e], this)) return !0
                }));
                for (n = this.pushStack([]), e = 0; i > e; e++) ft.find(t, r[e], n);
                return i > 1 ? ft.uniqueSort(n) : n
            }
            , filter: function (t) {
                return this.pushStack(r(this, t || [], !1))
            }
            , not: function (t) {
                return this.pushStack(r(this, t || [], !0))
            }
            , is: function (t) {
                return !!r(this, "string" == typeof t && bt.test(t) ? ft(t) : t || [], !1).length
            }
        });
        var St, Tt = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/
            , At = ft.fn.init = function (t, e, n) {
                var i, r;
                if (!t) return this;
                if (n = n || St, "string" == typeof t) {
                    if (i = "<" === t[0] && ">" === t[t.length - 1] && t.length >= 3 ? [null, t, null] : Tt.exec(t), !i || !i[1] && e) return !e || e.jquery ? (e || n).find(t) : this.constructor(e).find(t);
                    if (i[1]) {
                        if (e = e instanceof ft ? e[0] : e, ft.merge(this, ft.parseHTML(i[1], e && e.nodeType ? e.ownerDocument || e : Q, !0)), wt.test(i[1]) && ft.isPlainObject(e))
                            for (i in e) ft.isFunction(this[i]) ? this[i](e[i]) : this.attr(i, e[i]);
                        return this
                    }
                    return r = Q.getElementById(i[2]), r && (this[0] = r, this.length = 1), this
                }
                return t.nodeType ? (this[0] = t, this.length = 1, this) : ft.isFunction(t) ? void 0 !== n.ready ? n.ready(t) : t(ft) : ft.makeArray(t, this)
            };
        At.prototype = ft.fn, St = ft(Q);
        var Ct = /^(?:parents|prev(?:Until|All))/
            , Pt = {
                children: !0
                , contents: !0
                , next: !0
                , prev: !0
            };
        ft.fn.extend({
            has: function (t) {
                var e = ft(t, this)
                    , n = e.length;
                return this.filter(function () {
                    for (var t = 0; n > t; t++)
                        if (ft.contains(this, e[t])) return !0
                })
            }
            , closest: function (t, e) {
                var n, i = 0
                    , r = this.length
                    , o = []
                    , s = "string" != typeof t && ft(t);
                if (!bt.test(t))
                    for (; r > i; i++)
                        for (n = this[i]; n && n !== e; n = n.parentNode)
                            if (n.nodeType < 11 && (s ? s.index(n) > -1 : 1 === n.nodeType && ft.find.matchesSelector(n, t))) {
                                o.push(n);
                                break
                            }
                return this.pushStack(o.length > 1 ? ft.uniqueSort(o) : o)
            }
            , index: function (t) {
                return t ? "string" == typeof t ? rt.call(ft(t), this[0]) : rt.call(this, t.jquery ? t[0] : t) : this[0] && this[0].parentNode ? this.first().prevAll().length : -1
            }
            , add: function (t, e) {
                return this.pushStack(ft.uniqueSort(ft.merge(this.get(), ft(t, e))))
            }
            , addBack: function (t) {
                return this.add(null == t ? this.prevObject : this.prevObject.filter(t))
            }
        }), ft.each({
            parent: function (t) {
                var e = t.parentNode;
                return e && 11 !== e.nodeType ? e : null
            }
            , parents: function (t) {
                return mt(t, "parentNode")
            }
            , parentsUntil: function (t, e, n) {
                return mt(t, "parentNode", n)
            }
            , next: function (t) {
                return o(t, "nextSibling")
            }
            , prev: function (t) {
                return o(t, "previousSibling")
            }
            , nextAll: function (t) {
                return mt(t, "nextSibling")
            }
            , prevAll: function (t) {
                return mt(t, "previousSibling")
            }
            , nextUntil: function (t, e, n) {
                return mt(t, "nextSibling", n)
            }
            , prevUntil: function (t, e, n) {
                return mt(t, "previousSibling", n)
            }
            , siblings: function (t) {
                return xt((t.parentNode || {}).firstChild, t)
            }
            , children: function (t) {
                return xt(t.firstChild)
            }
            , contents: function (t) {
                return t.contentDocument || ft.merge([], t.childNodes)
            }
        }, function (t, e) {
            ft.fn[t] = function (n, i) {
                var r = ft.map(this, e, n);
                return "Until" !== t.slice(-5) && (i = n), i && "string" == typeof i && (r = ft.filter(i, r)), this.length > 1 && (Pt[t] || ft.uniqueSort(r), Ct.test(t) && r.reverse()), this.pushStack(r)
            }
        });
        var Et = /\S+/g;
        ft.Callbacks = function (t) {
            t = "string" == typeof t ? s(t) : ft.extend({}, t);
            var e, n, i, r, o = []
                , a = []
                , l = -1
                , c = function () {
                    for (r = t.once, i = e = !0; a.length; l = -1)
                        for (n = a.shift(); ++l < o.length;) o[l].apply(n[0], n[1]) === !1 && t.stopOnFalse && (l = o.length, n = !1);
                    t.memory || (n = !1), e = !1, r && (o = n ? [] : "")
                }
                , u = {
                    add: function () {
                        return o && (n && !e && (l = o.length - 1, a.push(n)), function e(n) {
                            ft.each(n, function (n, i) {
                                ft.isFunction(i) ? t.unique && u.has(i) || o.push(i) : i && i.length && "string" !== ft.type(i) && e(i)
                            })
                        }(arguments), n && !e && c()), this
                    }
                    , remove: function () {
                        return ft.each(arguments, function (t, e) {
                            for (var n;
                                (n = ft.inArray(e, o, n)) > -1;) o.splice(n, 1), l >= n && l--
                        }), this
                    }
                    , has: function (t) {
                        return t ? ft.inArray(t, o) > -1 : o.length > 0
                    }
                    , empty: function () {
                        return o && (o = []), this
                    }
                    , disable: function () {
                        return r = a = [], o = n = "", this
                    }
                    , disabled: function () {
                        return !o
                    }
                    , lock: function () {
                        return r = a = [], n || e || (o = n = ""), this
                    }
                    , locked: function () {
                        return !!r
                    }
                    , fireWith: function (t, n) {
                        return r || (n = n || [], n = [t, n.slice ? n.slice() : n], a.push(n), e || c()), this
                    }
                    , fire: function () {
                        return u.fireWith(this, arguments), this
                    }
                    , fired: function () {
                        return !!i
                    }
                };
            return u
        }, ft.extend({
            Deferred: function (e) {
                var n = [["notify", "progress", ft.Callbacks("memory"), ft.Callbacks("memory"), 2], ["resolve", "done", ft.Callbacks("once memory"), ft.Callbacks("once memory"), 0, "resolved"], ["reject", "fail", ft.Callbacks("once memory"), ft.Callbacks("once memory"), 1, "rejected"]]
                    , i = "pending"
                    , r = {
                        state: function () {
                            return i
                        }
                        , always: function () {
                            return o.done(arguments).fail(arguments), this
                        }
                        , catch: function (t) {
                            return r.then(null, t)
                        }
                        , pipe: function () {
                            var t = arguments;
                            return ft.Deferred(function (e) {
                                ft.each(n, function (n, i) {
                                    var r = ft.isFunction(t[i[4]]) && t[i[4]];
                                    o[i[1]](function () {
                                        var t = r && r.apply(this, arguments);
                                        t && ft.isFunction(t.promise) ? t.promise().progress(e.notify).done(e.resolve).fail(e.reject) : e[i[0] + "With"](this, r ? [t] : arguments)
                                    })
                                }), t = null
                            }).promise()
                        }
                        , then: function (e, i, r) {
                            function o(e, n, i, r) {
                                return function () {
                                    var c = this
                                        , u = arguments
                                        , h = function () {
                                            var t, h;
                                            if (!(s > e)) {
                                                if (t = i.apply(c, u), t === n.promise()) throw new TypeError("Thenable self-resolution");
                                                h = t && ("object" == typeof t || "function" == typeof t) && t.then, ft.isFunction(h) ? r ? h.call(t, o(s, n, a, r), o(s, n, l, r)) : (s++, h.call(t, o(s, n, a, r), o(s, n, l, r), o(s, n, a, n.notifyWith))) : (i !== a && (c = void 0, u = [t]), (r || n.resolveWith)(c, u))
                                            }
                                        }
                                        , f = r ? h : function () {
                                            try {
                                                h()
                                            }
                                            catch (t) {
                                                ft.Deferred.exceptionHook && ft.Deferred.exceptionHook(t, f.stackTrace), e + 1 >= s && (i !== l && (c = void 0, u = [t]), n.rejectWith(c, u))
                                            }
                                        };
                                    e ? f() : (ft.Deferred.getStackHook && (f.stackTrace = ft.Deferred.getStackHook()), t.setTimeout(f))
                                }
                            }
                            var s = 0;
                            return ft.Deferred(function (t) {
                                n[0][3].add(o(0, t, ft.isFunction(r) ? r : a, t.notifyWith)), n[1][3].add(o(0, t, ft.isFunction(e) ? e : a)), n[2][3].add(o(0, t, ft.isFunction(i) ? i : l))
                            }).promise()
                        }
                        , promise: function (t) {
                            return null != t ? ft.extend(t, r) : r
                        }
                    }
                    , o = {};
                return ft.each(n, function (t, e) {
                    var s = e[2]
                        , a = e[5];
                    r[e[1]] = s.add, a && s.add(function () {
                        i = a
                    }, n[3 - t][2].disable, n[0][2].lock), s.add(e[3].fire), o[e[0]] = function () {
                        return o[e[0] + "With"](this === o ? void 0 : this, arguments), this
                    }, o[e[0] + "With"] = s.fireWith
                }), r.promise(o), e && e.call(o, o), o
            }
            , when: function (t) {
                var e = arguments.length
                    , n = e
                    , i = Array(n)
                    , r = et.call(arguments)
                    , o = ft.Deferred()
                    , s = function (t) {
                        return function (n) {
                            i[t] = this, r[t] = arguments.length > 1 ? et.call(arguments) : n, --e || o.resolveWith(i, r)
                        }
                    };
                if (1 >= e && (c(t, o.done(s(n)).resolve, o.reject), "pending" === o.state() || ft.isFunction(r[n] && r[n].then))) return o.then();
                for (; n--;) c(r[n], s(n), o.reject);
                return o.promise()
            }
        });
        var Mt = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;
        ft.Deferred.exceptionHook = function (e, n) {
            t.console && t.console.warn && e && Mt.test(e.name) && t.console.warn("jQuery.Deferred exception: " + e.message, e.stack, n)
        };
        var Lt = ft.Deferred();
        ft.fn.ready = function (t) {
            return Lt.then(t), this
        }, ft.extend({
            isReady: !1
            , readyWait: 1
            , holdReady: function (t) {
                t ? ft.readyWait++ : ft.ready(!0)
            }
            , ready: function (t) {
                (t === !0 ? --ft.readyWait : ft.isReady) || (ft.isReady = !0, t !== !0 && --ft.readyWait > 0 || Lt.resolveWith(Q, [ft]))
            }
        }), ft.ready.then = Lt.then, "complete" === Q.readyState || "loading" !== Q.readyState && !Q.documentElement.doScroll ? t.setTimeout(ft.ready) : (Q.addEventListener("DOMContentLoaded", u), t.addEventListener("load", u));
        var Ot = function (t, e, n, i, r, o, s) {
                var a = 0
                    , l = t.length
                    , c = null == n;
                if ("object" === ft.type(n)) {
                    r = !0;
                    for (a in n) Ot(t, e, a, n[a], !0, o, s)
                }
                else if (void 0 !== i && (r = !0, ft.isFunction(i) || (s = !0), c && (s ? (e.call(t, i), e = null) : (c = e, e = function (t, e, n) {
                        return c.call(ft(t), n)
                    })), e))
                    for (; l > a; a++) e(t[a], n, s ? i : i.call(t[a], a, e(t[a], n)));
                return r ? t : c ? e.call(t) : l ? e(t[0], n) : o
            }
            , Dt = function (t) {
                return 1 === t.nodeType || 9 === t.nodeType || !+t.nodeType
            };
        h.uid = 1, h.prototype = {
            cache: function (t) {
                var e = t[this.expando];
                return e || (e = {}, Dt(t) && (t.nodeType ? t[this.expando] = e : Object.defineProperty(t, this.expando, {
                    value: e
                    , configurable: !0
                }))), e
            }
            , set: function (t, e, n) {
                var i, r = this.cache(t);
                if ("string" == typeof e) r[ft.camelCase(e)] = n;
                else
                    for (i in e) r[ft.camelCase(i)] = e[i];
                return r
            }
            , get: function (t, e) {
                return void 0 === e ? this.cache(t) : t[this.expando] && t[this.expando][ft.camelCase(e)]
            }
            , access: function (t, e, n) {
                return void 0 === e || e && "string" == typeof e && void 0 === n ? this.get(t, e) : (this.set(t, e, n), void 0 !== n ? n : e)
            }
            , remove: function (t, e) {
                var n, i = t[this.expando];
                if (void 0 !== i) {
                    if (void 0 !== e) {
                        ft.isArray(e) ? e = e.map(ft.camelCase) : (e = ft.camelCase(e), e = e in i ? [e] : e.match(Et) || []), n = e.length;
                        for (; n--;) delete i[e[n]]
                    }(void 0 === e || ft.isEmptyObject(i)) && (t.nodeType ? t[this.expando] = void 0 : delete t[this.expando])
                }
            }
            , hasData: function (t) {
                var e = t[this.expando];
                return void 0 !== e && !ft.isEmptyObject(e)
            }
        };
        var _t = new h
            , It = new h
            , Nt = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/
            , Ft = /[A-Z]/g;
        ft.extend({
            hasData: function (t) {
                return It.hasData(t) || _t.hasData(t)
            }
            , data: function (t, e, n) {
                return It.access(t, e, n)
            }
            , removeData: function (t, e) {
                It.remove(t, e)
            }
            , _data: function (t, e, n) {
                return _t.access(t, e, n)
            }
            , _removeData: function (t, e) {
                _t.remove(t, e)
            }
        }), ft.fn.extend({
            data: function (t, e) {
                var n, i, r, o = this[0]
                    , s = o && o.attributes;
                if (void 0 === t) {
                    if (this.length && (r = It.get(o), 1 === o.nodeType && !_t.get(o, "hasDataAttrs"))) {
                        for (n = s.length; n--;) s[n] && (i = s[n].name, 0 === i.indexOf("data-") && (i = ft.camelCase(i.slice(5)), f(o, i, r[i])));
                        _t.set(o, "hasDataAttrs", !0)
                    }
                    return r
                }
                return "object" == typeof t ? this.each(function () {
                    It.set(this, t)
                }) : Ot(this, function (e) {
                    var n;
                    if (o && void 0 === e) {
                        if (n = It.get(o, t), void 0 !== n) return n;
                        if (n = f(o, t), void 0 !== n) return n
                    }
                    else this.each(function () {
                        It.set(this, t, e)
                    })
                }, null, e, arguments.length > 1, null, !0)
            }
            , removeData: function (t) {
                return this.each(function () {
                    It.remove(this, t)
                })
            }
        }), ft.extend({
            queue: function (t, e, n) {
                var i;
                return t ? (e = (e || "fx") + "queue", i = _t.get(t, e), n && (!i || ft.isArray(n) ? i = _t.access(t, e, ft.makeArray(n)) : i.push(n)), i || []) : void 0
            }
            , dequeue: function (t, e) {
                e = e || "fx";
                var n = ft.queue(t, e)
                    , i = n.length
                    , r = n.shift()
                    , o = ft._queueHooks(t, e)
                    , s = function () {
                        ft.dequeue(t, e)
                    };
                "inprogress" === r && (r = n.shift(), i--), r && ("fx" === e && n.unshift("inprogress"), delete o.stop, r.call(t, s, o)), !i && o && o.empty.fire()
            }
            , _queueHooks: function (t, e) {
                var n = e + "queueHooks";
                return _t.get(t, n) || _t.access(t, n, {
                    empty: ft.Callbacks("once memory").add(function () {
                        _t.remove(t, [e + "queue", n])
                    })
                })
            }
        }), ft.fn.extend({
            queue: function (t, e) {
                var n = 2;
                return "string" != typeof t && (e = t, t = "fx", n--), arguments.length < n ? ft.queue(this[0], t) : void 0 === e ? this : this.each(function () {
                    var n = ft.queue(this, t, e);
                    ft._queueHooks(this, t), "fx" === t && "inprogress" !== n[0] && ft.dequeue(this, t)
                })
            }
            , dequeue: function (t) {
                return this.each(function () {
                    ft.dequeue(this, t)
                })
            }
            , clearQueue: function (t) {
                return this.queue(t || "fx", [])
            }
            , promise: function (t, e) {
                var n, i = 1
                    , r = ft.Deferred()
                    , o = this
                    , s = this.length
                    , a = function () {
                        --i || r.resolveWith(o, [o])
                    };
                for ("string" != typeof t && (e = t, t = void 0), t = t || "fx"; s--;) n = _t.get(o[s], t + "queueHooks"), n && n.empty && (i++, n.empty.add(a));
                return a(), r.promise(e)
            }
        });
        var Rt = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source
            , jt = new RegExp("^(?:([+-])=|)(" + Rt + ")([a-z%]*)$", "i")
            , zt = ["Top", "Right", "Bottom", "Left"]
            , Ht = function (t, e) {
                return t = e || t, "none" === t.style.display || "" === t.style.display && ft.contains(t.ownerDocument, t) && "none" === ft.css(t, "display")
            }
            , Bt = function (t, e, n, i) {
                var r, o, s = {};
                for (o in e) s[o] = t.style[o], t.style[o] = e[o];
                r = n.apply(t, i || []);
                for (o in e) t.style[o] = s[o];
                return r
            }
            , Wt = {};
        ft.fn.extend({
            show: function () {
                return g(this, !0)
            }
            , hide: function () {
                return g(this)
            }
            , toggle: function (t) {
                return "boolean" == typeof t ? t ? this.show() : this.hide() : this.each(function () {
                    Ht(this) ? ft(this).show() : ft(this).hide()
                })
            }
        });
        var Xt = /^(?:checkbox|radio)$/i
            , Gt = /<([a-z][^\/\0>\x20\t\r\n\f]+)/i
            , Yt = /^$|\/(?:java|ecma)script/i
            , qt = {
                option: [1, "<select multiple='multiple'>", "</select>"]
                , thead: [1, "<table>", "</table>"]
                , col: [2, "<table><colgroup>", "</colgroup></table>"]
                , tr: [2, "<table><tbody>", "</tbody></table>"]
                , td: [3, "<table><tbody><tr>", "</tr></tbody></table>"]
                , _default: [0, "", ""]
            };
        qt.optgroup = qt.option, qt.tbody = qt.tfoot = qt.colgroup = qt.caption = qt.thead, qt.th = qt.td;
        var Vt = /<|&#?\w+;/;
        ! function () {
            var t = Q.createDocumentFragment()
                , e = t.appendChild(Q.createElement("div"))
                , n = Q.createElement("input");
            n.setAttribute("type", "radio"), n.setAttribute("checked", "checked"), n.setAttribute("name", "t"), e.appendChild(n), ut.checkClone = e.cloneNode(!0).cloneNode(!0).lastChild.checked, e.innerHTML = "<textarea>x</textarea>", ut.noCloneChecked = !!e.cloneNode(!0).lastChild.defaultValue
        }();
        var Ut = Q.documentElement
            , Zt = /^key/
            , $t = /^(?:mouse|pointer|contextmenu|drag|drop)|click/
            , Kt = /^([^.]*)(?:\.(.+)|)/;
        ft.event = {
            global: {}
            , add: function (t, e, n, i, r) {
                var o, s, a, l, c, u, h, f, p, d, g, v = _t.get(t);
                if (v)
                    for (n.handler && (o = n, n = o.handler, r = o.selector), r && ft.find.matchesSelector(Ut, r), n.guid || (n.guid = ft.guid++), (l = v.events) || (l = v.events = {}), (s = v.handle) || (s = v.handle = function (e) {
                            return "undefined" != typeof ft && ft.event.triggered !== e.type ? ft.event.dispatch.apply(t, arguments) : void 0
                        }), e = (e || "").match(Et) || [""], c = e.length; c--;) a = Kt.exec(e[c]) || [], p = g = a[1], d = (a[2] || "").split(".").sort(), p && (h = ft.event.special[p] || {}, p = (r ? h.delegateType : h.bindType) || p, h = ft.event.special[p] || {}, u = ft.extend({
                        type: p
                        , origType: g
                        , data: i
                        , handler: n
                        , guid: n.guid
                        , selector: r
                        , needsContext: r && ft.expr.match.needsContext.test(r)
                        , namespace: d.join(".")
                    }, o), (f = l[p]) || (f = l[p] = [], f.delegateCount = 0, h.setup && h.setup.call(t, i, d, s) !== !1 || t.addEventListener && t.addEventListener(p, s)), h.add && (h.add.call(t, u), u.handler.guid || (u.handler.guid = n.guid)), r ? f.splice(f.delegateCount++, 0, u) : f.push(u), ft.event.global[p] = !0)
            }
            , remove: function (t, e, n, i, r) {
                var o, s, a, l, c, u, h, f, p, d, g, v = _t.hasData(t) && _t.get(t);
                if (v && (l = v.events)) {
                    for (e = (e || "").match(Et) || [""], c = e.length; c--;)
                        if (a = Kt.exec(e[c]) || [], p = g = a[1], d = (a[2] || "").split(".").sort(), p) {
                            for (h = ft.event.special[p] || {}, p = (i ? h.delegateType : h.bindType) || p, f = l[p] || [], a = a[2] && new RegExp("(^|\\.)" + d.join("\\.(?:.*\\.|)") + "(\\.|$)"), s = o = f.length; o--;) u = f[o], !r && g !== u.origType || n && n.guid !== u.guid || a && !a.test(u.namespace) || i && i !== u.selector && ("**" !== i || !u.selector) || (f.splice(o, 1), u.selector && f.delegateCount--, h.remove && h.remove.call(t, u));
                            s && !f.length && (h.teardown && h.teardown.call(t, d, v.handle) !== !1 || ft.removeEvent(t, p, v.handle), delete l[p])
                        }
                        else
                            for (p in l) ft.event.remove(t, p + e[c], n, i, !0);
                    ft.isEmptyObject(l) && _t.remove(t, "handle events")
                }
            }
            , dispatch: function (t) {
                var e, n, i, r, o, s, a = ft.event.fix(t)
                    , l = new Array(arguments.length)
                    , c = (_t.get(this, "events") || {})[a.type] || []
                    , u = ft.event.special[a.type] || {};
                for (l[0] = a, e = 1; e < arguments.length; e++) l[e] = arguments[e];
                if (a.delegateTarget = this, !u.preDispatch || u.preDispatch.call(this, a) !== !1) {
                    for (s = ft.event.handlers.call(this, a, c), e = 0;
                        (r = s[e++]) && !a.isPropagationStopped();)
                        for (a.currentTarget = r.elem, n = 0;
                            (o = r.handlers[n++]) && !a.isImmediatePropagationStopped();) a.rnamespace && !a.rnamespace.test(o.namespace) || (a.handleObj = o, a.data = o.data, i = ((ft.event.special[o.origType] || {}).handle || o.handler).apply(r.elem, l), void 0 !== i && (a.result = i) === !1 && (a.preventDefault(), a.stopPropagation()));
                    return u.postDispatch && u.postDispatch.call(this, a), a.result
                }
            }
            , handlers: function (t, e) {
                var n, i, r, o, s = []
                    , a = e.delegateCount
                    , l = t.target;
                if (a && l.nodeType && ("click" !== t.type || isNaN(t.button) || t.button < 1))
                    for (; l !== this; l = l.parentNode || this)
                        if (1 === l.nodeType && (l.disabled !== !0 || "click" !== t.type)) {
                            for (i = [], n = 0; a > n; n++) o = e[n], r = o.selector + " ", void 0 === i[r] && (i[r] = o.needsContext ? ft(r, this).index(l) > -1 : ft.find(r, this, null, [l]).length), i[r] && i.push(o);
                            i.length && s.push({
                                elem: l
                                , handlers: i
                            })
                        }
                return a < e.length && s.push({
                    elem: this
                    , handlers: e.slice(a)
                }), s
            }
            , addProp: function (t, e) {
                Object.defineProperty(ft.Event.prototype, t, {
                    enumerable: !0
                    , configurable: !0
                    , get: ft.isFunction(e) ? function () {
                        return this.originalEvent ? e(this.originalEvent) : void 0
                    } : function () {
                        return this.originalEvent ? this.originalEvent[t] : void 0
                    }
                    , set: function (e) {
                        Object.defineProperty(this, t, {
                            enumerable: !0
                            , configurable: !0
                            , writable: !0
                            , value: e
                        })
                    }
                })
            }
            , fix: function (t) {
                return t[ft.expando] ? t : new ft.Event(t)
            }
            , special: {
                load: {
                    noBubble: !0
                }
                , focus: {
                    trigger: function () {
                        return this !== w() && this.focus ? (this.focus(), !1) : void 0
                    }
                    , delegateType: "focusin"
                }
                , blur: {
                    trigger: function () {
                        return this === w() && this.blur ? (this.blur(), !1) : void 0
                    }
                    , delegateType: "focusout"
                }
                , click: {
                    trigger: function () {
                        return "checkbox" === this.type && this.click && ft.nodeName(this, "input") ? (this.click(), !1) : void 0
                    }
                    , _default: function (t) {
                        return ft.nodeName(t.target, "a")
                    }
                }
                , beforeunload: {
                    postDispatch: function (t) {
                        void 0 !== t.result && t.originalEvent && (t.originalEvent.returnValue = t.result)
                    }
                }
            }
        }, ft.removeEvent = function (t, e, n) {
            t.removeEventListener && t.removeEventListener(e, n)
        }, ft.Event = function (t, e) {
            return this instanceof ft.Event ? (t && t.type ? (this.originalEvent = t, this.type = t.type, this.isDefaultPrevented = t.defaultPrevented || void 0 === t.defaultPrevented && t.returnValue === !1 ? x : b, this.target = t.target && 3 === t.target.nodeType ? t.target.parentNode : t.target, this.currentTarget = t.currentTarget, this.relatedTarget = t.relatedTarget) : this.type = t, e && ft.extend(this, e), this.timeStamp = t && t.timeStamp || ft.now(), void(this[ft.expando] = !0)) : new ft.Event(t, e)
        }, ft.Event.prototype = {
            constructor: ft.Event
            , isDefaultPrevented: b
            , isPropagationStopped: b
            , isImmediatePropagationStopped: b
            , isSimulated: !1
            , preventDefault: function () {
                var t = this.originalEvent;
                this.isDefaultPrevented = x, t && !this.isSimulated && t.preventDefault()
            }
            , stopPropagation: function () {
                var t = this.originalEvent;
                this.isPropagationStopped = x, t && !this.isSimulated && t.stopPropagation()
            }
            , stopImmediatePropagation: function () {
                var t = this.originalEvent;
                this.isImmediatePropagationStopped = x, t && !this.isSimulated && t.stopImmediatePropagation(), this.stopPropagation()
            }
        }, ft.each({
            altKey: !0
            , bubbles: !0
            , cancelable: !0
            , changedTouches: !0
            , ctrlKey: !0
            , detail: !0
            , eventPhase: !0
            , metaKey: !0
            , pageX: !0
            , pageY: !0
            , shiftKey: !0
            , view: !0
            , char: !0
            , charCode: !0
            , key: !0
            , keyCode: !0
            , button: !0
            , buttons: !0
            , clientX: !0
            , clientY: !0
            , offsetX: !0
            , offsetY: !0
            , pointerId: !0
            , pointerType: !0
            , screenX: !0
            , screenY: !0
            , targetTouches: !0
            , toElement: !0
            , touches: !0
            , which: function (t) {
                var e = t.button;
                return null == t.which && Zt.test(t.type) ? null != t.charCode ? t.charCode : t.keyCode : !t.which && void 0 !== e && $t.test(t.type) ? 1 & e ? 1 : 2 & e ? 3 : 4 & e ? 2 : 0 : t.which
            }
        }, ft.event.addProp), ft.each({
            mouseenter: "mouseover"
            , mouseleave: "mouseout"
            , pointerenter: "pointerover"
            , pointerleave: "pointerout"
        }, function (t, e) {
            ft.event.special[t] = {
                delegateType: e
                , bindType: e
                , handle: function (t) {
                    var n, i = this
                        , r = t.relatedTarget
                        , o = t.handleObj;
                    return r && (r === i || ft.contains(i, r)) || (t.type = o.origType, n = o.handler.apply(this, arguments), t.type = e), n
                }
            }
        }), ft.fn.extend({
            on: function (t, e, n, i) {
                return k(this, t, e, n, i)
            }
            , one: function (t, e, n, i) {
                return k(this, t, e, n, i, 1)
            }
            , off: function (t, e, n) {
                var i, r;
                if (t && t.preventDefault && t.handleObj) return i = t.handleObj, ft(t.delegateTarget).off(i.namespace ? i.origType + "." + i.namespace : i.origType, i.selector, i.handler), this;
                if ("object" == typeof t) {
                    for (r in t) this.off(r, e, t[r]);
                    return this
                }
                return e !== !1 && "function" != typeof e || (n = e, e = void 0), n === !1 && (n = b), this.each(function () {
                    ft.event.remove(this, t, n, e)
                })
            }
        });
        var Jt = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi
            , Qt = /<script|<style|<link/i
            , te = /checked\s*(?:[^=]|=\s*.checked.)/i
            , ee = /^true\/(.*)/
            , ne = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;
        ft.extend({
            htmlPrefilter: function (t) {
                return t.replace(Jt, "<$1></$2>")
            }
            , clone: function (t, e, n) {
                var i, r, o, s, a = t.cloneNode(!0)
                    , l = ft.contains(t.ownerDocument, t);
                if (!(ut.noCloneChecked || 1 !== t.nodeType && 11 !== t.nodeType || ft.isXMLDoc(t)))
                    for (s = v(a), o = v(t), i = 0, r = o.length; r > i; i++) P(o[i], s[i]);
                if (e)
                    if (n)
                        for (o = o || v(t), s = s || v(a), i = 0, r = o.length; r > i; i++) C(o[i], s[i]);
                    else C(t, a);
                return s = v(a, "script"), s.length > 0 && y(s, !l && v(t, "script")), a
            }
            , cleanData: function (t) {
                for (var e, n, i, r = ft.event.special, o = 0; void 0 !== (n = t[o]); o++)
                    if (Dt(n)) {
                        if (e = n[_t.expando]) {
                            if (e.events)
                                for (i in e.events) r[i] ? ft.event.remove(n, i) : ft.removeEvent(n, i, e.handle);
                            n[_t.expando] = void 0
                        }
                        n[It.expando] && (n[It.expando] = void 0)
                    }
            }
        }), ft.fn.extend({
            detach: function (t) {
                return M(this, t, !0)
            }
            , remove: function (t) {
                return M(this, t)
            }
            , text: function (t) {
                return Ot(this, function (t) {
                    return void 0 === t ? ft.text(this) : this.empty().each(function () {
                        1 !== this.nodeType && 11 !== this.nodeType && 9 !== this.nodeType || (this.textContent = t)
                    })
                }, null, t, arguments.length)
            }
            , append: function () {
                return E(this, arguments, function (t) {
                    if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) {
                        var e = S(this, t);
                        e.appendChild(t)
                    }
                })
            }
            , prepend: function () {
                return E(this, arguments, function (t) {
                    if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) {
                        var e = S(this, t);
                        e.insertBefore(t, e.firstChild)
                    }
                })
            }
            , before: function () {
                return E(this, arguments, function (t) {
                    this.parentNode && this.parentNode.insertBefore(t, this)
                })
            }
            , after: function () {
                return E(this, arguments, function (t) {
                    this.parentNode && this.parentNode.insertBefore(t, this.nextSibling)
                })
            }
            , empty: function () {
                for (var t, e = 0; null != (t = this[e]); e++) 1 === t.nodeType && (ft.cleanData(v(t, !1)), t.textContent = "");
                return this
            }
            , clone: function (t, e) {
                return t = null != t && t, e = null == e ? t : e, this.map(function () {
                    return ft.clone(this, t, e)
                })
            }
            , html: function (t) {
                return Ot(this, function (t) {
                    var e = this[0] || {}
                        , n = 0
                        , i = this.length;
                    if (void 0 === t && 1 === e.nodeType) return e.innerHTML;
                    if ("string" == typeof t && !Qt.test(t) && !qt[(Gt.exec(t) || ["", ""])[1].toLowerCase()]) {
                        t = ft.htmlPrefilter(t);
                        try {
                            for (; i > n; n++) e = this[n] || {}, 1 === e.nodeType && (ft.cleanData(v(e, !1)), e.innerHTML = t);
                            e = 0
                        }
                        catch (t) {}
                    }
                    e && this.empty().append(t)
                }, null, t, arguments.length)
            }
            , replaceWith: function () {
                var t = [];
                return E(this, arguments, function (e) {
                    var n = this.parentNode;
                    ft.inArray(this, t) < 0 && (ft.cleanData(v(this)), n && n.replaceChild(e, this))
                }, t)
            }
        }), ft.each({
            appendTo: "append"
            , prependTo: "prepend"
            , insertBefore: "before"
            , insertAfter: "after"
            , replaceAll: "replaceWith"
        }, function (t, e) {
            ft.fn[t] = function (t) {
                for (var n, i = [], r = ft(t), o = r.length - 1, s = 0; o >= s; s++) n = s === o ? this : this.clone(!0), ft(r[s])[e](n), it.apply(i, n.get());
                return this.pushStack(i)
            }
        });
        var ie = /^margin/
            , re = new RegExp("^(" + Rt + ")(?!px)[a-z%]+$", "i")
            , oe = function (e) {
                var n = e.ownerDocument.defaultView;
                return n && n.opener || (n = t), n.getComputedStyle(e)
            };
        ! function () {
            function e() {
                if (a) {
                    a.style.cssText = "box-sizing:border-box;position:relative;display:block;margin:auto;border:1px;padding:1px;top:1%;width:50%", a.innerHTML = "", Ut.appendChild(s);
                    var e = t.getComputedStyle(a);
                    n = "1%" !== e.top, o = "2px" === e.marginLeft, i = "4px" === e.width, a.style.marginRight = "50%", r = "4px" === e.marginRight, Ut.removeChild(s), a = null
                }
            }
            var n, i, r, o, s = Q.createElement("div")
                , a = Q.createElement("div");
            a.style && (a.style.backgroundClip = "content-box", a.cloneNode(!0).style.backgroundClip = "", ut.clearCloneStyle = "content-box" === a.style.backgroundClip, s.style.cssText = "border:0;width:8px;height:0;top:0;left:-9999px;padding:0;margin-top:1px;position:absolute", s.appendChild(a), ft.extend(ut, {
                pixelPosition: function () {
                    return e(), n
                }
                , boxSizingReliable: function () {
                    return e(), i
                }
                , pixelMarginRight: function () {
                    return e(), r
                }
                , reliableMarginLeft: function () {
                    return e(), o
                }
            }))
        }();
        var se = /^(none|table(?!-c[ea]).+)/
            , ae = {
                position: "absolute"
                , visibility: "hidden"
                , display: "block"
            }
            , le = {
                letterSpacing: "0"
                , fontWeight: "400"
            }
            , ce = ["Webkit", "Moz", "ms"]
            , ue = Q.createElement("div").style;
        ft.extend({
            cssHooks: {
                opacity: {
                    get: function (t, e) {
                        if (e) {
                            var n = L(t, "opacity");
                            return "" === n ? "1" : n
                        }
                    }
                }
            }
            , cssNumber: {
                animationIterationCount: !0
                , columnCount: !0
                , fillOpacity: !0
                , flexGrow: !0
                , flexShrink: !0
                , fontWeight: !0
                , lineHeight: !0
                , opacity: !0
                , order: !0
                , orphans: !0
                , widows: !0
                , zIndex: !0
                , zoom: !0
            }
            , cssProps: {
                float: "cssFloat"
            }
            , style: function (t, e, n, i) {
                if (t && 3 !== t.nodeType && 8 !== t.nodeType && t.style) {
                    var r, o, s, a = ft.camelCase(e)
                        , l = t.style;
                    return e = ft.cssProps[a] || (ft.cssProps[a] = D(a) || a), s = ft.cssHooks[e] || ft.cssHooks[a], void 0 === n ? s && "get" in s && void 0 !== (r = s.get(t, !1, i)) ? r : l[e] : (o = typeof n, "string" === o && (r = jt.exec(n)) && r[1] && (n = p(t, e, r), o = "number"), void(null != n && n === n && ("number" === o && (n += r && r[3] || (ft.cssNumber[a] ? "" : "px")), ut.clearCloneStyle || "" !== n || 0 !== e.indexOf("background") || (l[e] = "inherit"), s && "set" in s && void 0 === (n = s.set(t, n, i)) || (l[e] = n))))
                }
            }
            , css: function (t, e, n, i) {
                var r, o, s, a = ft.camelCase(e);
                return e = ft.cssProps[a] || (ft.cssProps[a] = D(a) || a), s = ft.cssHooks[e] || ft.cssHooks[a], s && "get" in s && (r = s.get(t, !0, n)), void 0 === r && (r = L(t, e, i)), "normal" === r && e in le && (r = le[e]), "" === n || n ? (o = parseFloat(r), n === !0 || isFinite(o) ? o || 0 : r) : r
            }
        }), ft.each(["height", "width"], function (t, e) {
            ft.cssHooks[e] = {
                get: function (t, n, i) {
                    return n ? !se.test(ft.css(t, "display")) || t.getClientRects().length && t.getBoundingClientRect().width ? N(t, e, i) : Bt(t, ae, function () {
                        return N(t, e, i)
                    }) : void 0
                }
                , set: function (t, n, i) {
                    var r, o = i && oe(t)
                        , s = i && I(t, e, i, "border-box" === ft.css(t, "boxSizing", !1, o), o);
                    return s && (r = jt.exec(n)) && "px" !== (r[3] || "px") && (t.style[e] = n, n = ft.css(t, e)), _(t, n, s)
                }
            }
        }), ft.cssHooks.marginLeft = O(ut.reliableMarginLeft, function (t, e) {
            return e ? (parseFloat(L(t, "marginLeft")) || t.getBoundingClientRect().left - Bt(t, {
                marginLeft: 0
            }, function () {
                return t.getBoundingClientRect().left
            })) + "px" : void 0
        }), ft.each({
            margin: ""
            , padding: ""
            , border: "Width"
        }, function (t, e) {
            ft.cssHooks[t + e] = {
                expand: function (n) {
                    for (var i = 0, r = {}, o = "string" == typeof n ? n.split(" ") : [n]; 4 > i; i++) r[t + zt[i] + e] = o[i] || o[i - 2] || o[0];
                    return r
                }
            }, ie.test(t) || (ft.cssHooks[t + e].set = _)
        }), ft.fn.extend({
            css: function (t, e) {
                return Ot(this, function (t, e, n) {
                    var i, r, o = {}
                        , s = 0;
                    if (ft.isArray(e)) {
                        for (i = oe(t), r = e.length; r > s; s++) o[e[s]] = ft.css(t, e[s], !1, i);
                        return o
                    }
                    return void 0 !== n ? ft.style(t, e, n) : ft.css(t, e)
                }, t, e, arguments.length > 1)
            }
        }), ft.Tween = F, F.prototype = {
            constructor: F
            , init: function (t, e, n, i, r, o) {
                this.elem = t, this.prop = n, this.easing = r || ft.easing._default, this.options = e, this.start = this.now = this.cur(), this.end = i, this.unit = o || (ft.cssNumber[n] ? "" : "px")
            }
            , cur: function () {
                var t = F.propHooks[this.prop];
                return t && t.get ? t.get(this) : F.propHooks._default.get(this)
            }
            , run: function (t) {
                var e, n = F.propHooks[this.prop];
                return this.options.duration ? this.pos = e = ft.easing[this.easing](t, this.options.duration * t, 0, 1, this.options.duration) : this.pos = e = t, this.now = (this.end - this.start) * e + this.start, this.options.step && this.options.step.call(this.elem, this.now, this), n && n.set ? n.set(this) : F.propHooks._default.set(this), this
            }
        }, F.prototype.init.prototype = F.prototype, F.propHooks = {
            _default: {
                get: function (t) {
                    var e;
                    return 1 !== t.elem.nodeType || null != t.elem[t.prop] && null == t.elem.style[t.prop] ? t.elem[t.prop] : (e = ft.css(t.elem, t.prop, ""), e && "auto" !== e ? e : 0)
                }
                , set: function (t) {
                    ft.fx.step[t.prop] ? ft.fx.step[t.prop](t) : 1 !== t.elem.nodeType || null == t.elem.style[ft.cssProps[t.prop]] && !ft.cssHooks[t.prop] ? t.elem[t.prop] = t.now : ft.style(t.elem, t.prop, t.now + t.unit)
                }
            }
        }, F.propHooks.scrollTop = F.propHooks.scrollLeft = {
            set: function (t) {
                t.elem.nodeType && t.elem.parentNode && (t.elem[t.prop] = t.now)
            }
        }, ft.easing = {
            linear: function (t) {
                return t
            }
            , swing: function (t) {
                return .5 - Math.cos(t * Math.PI) / 2
            }
            , _default: "swing"
        }, ft.fx = F.prototype.init, ft.fx.step = {};
        var he, fe, pe = /^(?:toggle|show|hide)$/
            , de = /queueHooks$/;
        ft.Animation = ft.extend(X, {
                tweeners: {
                    "*": [function (t, e) {
                        var n = this.createTween(t, e);
                        return p(n.elem, t, jt.exec(e), n), n
                    }]
                }
                , tweener: function (t, e) {
                    ft.isFunction(t) ? (e = t, t = ["*"]) : t = t.match(Et);
                    for (var n, i = 0, r = t.length; r > i; i++) n = t[i], X.tweeners[n] = X.tweeners[n] || [], X.tweeners[n].unshift(e)
                }
                , prefilters: [B]
                , prefilter: function (t, e) {
                    e ? X.prefilters.unshift(t) : X.prefilters.push(t)
                }
            }), ft.speed = function (t, e, n) {
                var i = t && "object" == typeof t ? ft.extend({}, t) : {
                    complete: n || !n && e || ft.isFunction(t) && t
                    , duration: t
                    , easing: n && e || e && !ft.isFunction(e) && e
                };
                return ft.fx.off || Q.hidden ? i.duration = 0 : i.duration = "number" == typeof i.duration ? i.duration : i.duration in ft.fx.speeds ? ft.fx.speeds[i.duration] : ft.fx.speeds._default, null != i.queue && i.queue !== !0 || (i.queue = "fx"), i.old = i.complete, i.complete = function () {
                    ft.isFunction(i.old) && i.old.call(this), i.queue && ft.dequeue(this, i.queue)
                }, i
            }, ft.fn.extend({
                fadeTo: function (t, e, n, i) {
                    return this.filter(Ht).css("opacity", 0).show().end().animate({
                        opacity: e
                    }, t, n, i)
                }
                , animate: function (t, e, n, i) {
                    var r = ft.isEmptyObject(t)
                        , o = ft.speed(e, n, i)
                        , s = function () {
                            var e = X(this, ft.extend({}, t), o);
                            (r || _t.get(this, "finish")) && e.stop(!0)
                        };
                    return s.finish = s, r || o.queue === !1 ? this.each(s) : this.queue(o.queue, s)
                }
                , stop: function (t, e, n) {
                    var i = function (t) {
                        var e = t.stop;
                        delete t.stop, e(n)
                    };
                    return "string" != typeof t && (n = e, e = t, t = void 0), e && t !== !1 && this.queue(t || "fx", []), this.each(function () {
                        var e = !0
                            , r = null != t && t + "queueHooks"
                            , o = ft.timers
                            , s = _t.get(this);
                        if (r) s[r] && s[r].stop && i(s[r]);
                        else
                            for (r in s) s[r] && s[r].stop && de.test(r) && i(s[r]);
                        for (r = o.length; r--;) o[r].elem !== this || null != t && o[r].queue !== t || (o[r].anim.stop(n), e = !1, o.splice(r, 1));
                        !e && n || ft.dequeue(this, t)
                    })
                }
                , finish: function (t) {
                    return t !== !1 && (t = t || "fx"), this.each(function () {
                        var e, n = _t.get(this)
                            , i = n[t + "queue"]
                            , r = n[t + "queueHooks"]
                            , o = ft.timers
                            , s = i ? i.length : 0;
                        for (n.finish = !0, ft.queue(this, t, []), r && r.stop && r.stop.call(this, !0), e = o.length; e--;) o[e].elem === this && o[e].queue === t && (o[e].anim.stop(!0), o.splice(e, 1));
                        for (e = 0; s > e; e++) i[e] && i[e].finish && i[e].finish.call(this);
                        delete n.finish
                    })
                }
            }), ft.each(["toggle", "show", "hide"], function (t, e) {
                var n = ft.fn[e];
                ft.fn[e] = function (t, i, r) {
                    return null == t || "boolean" == typeof t ? n.apply(this, arguments) : this.animate(z(e, !0), t, i, r)
                }
            }), ft.each({
                slideDown: z("show")
                , slideUp: z("hide")
                , slideToggle: z("toggle")
                , fadeIn: {
                    opacity: "show"
                }
                , fadeOut: {
                    opacity: "hide"
                }
                , fadeToggle: {
                    opacity: "toggle"
                }
            }, function (t, e) {
                ft.fn[t] = function (t, n, i) {
                    return this.animate(e, t, n, i)
                }
            }), ft.timers = [], ft.fx.tick = function () {
                var t, e = 0
                    , n = ft.timers;
                for (he = ft.now(); e < n.length; e++) t = n[e], t() || n[e] !== t || n.splice(e--, 1);
                n.length || ft.fx.stop(), he = void 0
            }, ft.fx.timer = function (t) {
                ft.timers.push(t), t() ? ft.fx.start() : ft.timers.pop()
            }, ft.fx.interval = 13, ft.fx.start = function () {
                fe || (fe = t.requestAnimationFrame ? t.requestAnimationFrame(R) : t.setInterval(ft.fx.tick, ft.fx.interval))
            }, ft.fx.stop = function () {
                t.cancelAnimationFrame ? t.cancelAnimationFrame(fe) : t.clearInterval(fe), fe = null
            }, ft.fx.speeds = {
                slow: 600
                , fast: 200
                , _default: 400
            }, ft.fn.delay = function (e, n) {
                return e = ft.fx ? ft.fx.speeds[e] || e : e, n = n || "fx", this.queue(n, function (n, i) {
                    var r = t.setTimeout(n, e);
                    i.stop = function () {
                        t.clearTimeout(r)
                    }
                })
            }
            , function () {
                var t = Q.createElement("input")
                    , e = Q.createElement("select")
                    , n = e.appendChild(Q.createElement("option"));
                t.type = "checkbox", ut.checkOn = "" !== t.value, ut.optSelected = n.selected, t = Q.createElement("input"), t.value = "t", t.type = "radio", ut.radioValue = "t" === t.value
            }();
        var ge, ve = ft.expr.attrHandle;
        ft.fn.extend({
            attr: function (t, e) {
                return Ot(this, ft.attr, t, e, arguments.length > 1)
            }
            , removeAttr: function (t) {
                return this.each(function () {
                    ft.removeAttr(this, t)
                })
            }
        }), ft.extend({
            attr: function (t, e, n) {
                var i, r, o = t.nodeType;
                if (3 !== o && 8 !== o && 2 !== o) return "undefined" == typeof t.getAttribute ? ft.prop(t, e, n) : (1 === o && ft.isXMLDoc(t) || (r = ft.attrHooks[e.toLowerCase()] || (ft.expr.match.bool.test(e) ? ge : void 0)), void 0 !== n ? null === n ? void ft.removeAttr(t, e) : r && "set" in r && void 0 !== (i = r.set(t, n, e)) ? i : (t.setAttribute(e, n + ""), n) : r && "get" in r && null !== (i = r.get(t, e)) ? i : (i = ft.find.attr(t, e), null == i ? void 0 : i))
            }
            , attrHooks: {
                type: {
                    set: function (t, e) {
                        if (!ut.radioValue && "radio" === e && ft.nodeName(t, "input")) {
                            var n = t.value;
                            return t.setAttribute("type", e), n && (t.value = n), e
                        }
                    }
                }
            }
            , removeAttr: function (t, e) {
                var n, i = 0
                    , r = e && e.match(Et);
                if (r && 1 === t.nodeType)
                    for (; n = r[i++];) t.removeAttribute(n)
            }
        }), ge = {
            set: function (t, e, n) {
                return e === !1 ? ft.removeAttr(t, n) : t.setAttribute(n, n), n
            }
        }, ft.each(ft.expr.match.bool.source.match(/\w+/g), function (t, e) {
            var n = ve[e] || ft.find.attr;
            ve[e] = function (t, e, i) {
                var r, o, s = e.toLowerCase();
                return i || (o = ve[s], ve[s] = r, r = null != n(t, e, i) ? s : null, ve[s] = o), r
            }
        });
        var ye = /^(?:input|select|textarea|button)$/i
            , me = /^(?:a|area)$/i;
        ft.fn.extend({
            prop: function (t, e) {
                return Ot(this, ft.prop, t, e, arguments.length > 1)
            }
            , removeProp: function (t) {
                return this.each(function () {
                    delete this[ft.propFix[t] || t]
                })
            }
        }), ft.extend({
            prop: function (t, e, n) {
                var i, r, o = t.nodeType;
                if (3 !== o && 8 !== o && 2 !== o) return 1 === o && ft.isXMLDoc(t) || (e = ft.propFix[e] || e, r = ft.propHooks[e]), void 0 !== n ? r && "set" in r && void 0 !== (i = r.set(t, n, e)) ? i : t[e] = n : r && "get" in r && null !== (i = r.get(t, e)) ? i : t[e]
            }
            , propHooks: {
                tabIndex: {
                    get: function (t) {
                        var e = ft.find.attr(t, "tabindex");
                        return e ? parseInt(e, 10) : ye.test(t.nodeName) || me.test(t.nodeName) && t.href ? 0 : -1
                    }
                }
            }
            , propFix: {
                for: "htmlFor"
                , class: "className"
            }
        }), ut.optSelected || (ft.propHooks.selected = {
            get: function (t) {
                var e = t.parentNode;
                return e && e.parentNode && e.parentNode.selectedIndex, null
            }
            , set: function (t) {
                var e = t.parentNode;
                e && (e.selectedIndex, e.parentNode && e.parentNode.selectedIndex)
            }
        }), ft.each(["tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable"], function () {
            ft.propFix[this.toLowerCase()] = this
        });
        var xe = /[\t\r\n\f]/g;
        ft.fn.extend({
            addClass: function (t) {
                var e, n, i, r, o, s, a, l = 0;
                if (ft.isFunction(t)) return this.each(function (e) {
                    ft(this).addClass(t.call(this, e, G(this)))
                });
                if ("string" == typeof t && t)
                    for (e = t.match(Et) || []; n = this[l++];)
                        if (r = G(n), i = 1 === n.nodeType && (" " + r + " ").replace(xe, " ")) {
                            for (s = 0; o = e[s++];) i.indexOf(" " + o + " ") < 0 && (i += o + " ");
                            a = ft.trim(i), r !== a && n.setAttribute("class", a)
                        }
                return this
            }
            , removeClass: function (t) {
                var e, n, i, r, o, s, a, l = 0;
                if (ft.isFunction(t)) return this.each(function (e) {
                    ft(this).removeClass(t.call(this, e, G(this)))
                });
                if (!arguments.length) return this.attr("class", "");
                if ("string" == typeof t && t)
                    for (e = t.match(Et) || []; n = this[l++];)
                        if (r = G(n), i = 1 === n.nodeType && (" " + r + " ").replace(xe, " ")) {
                            for (s = 0; o = e[s++];)
                                for (; i.indexOf(" " + o + " ") > -1;) i = i.replace(" " + o + " ", " ");
                            a = ft.trim(i), r !== a && n.setAttribute("class", a)
                        }
                return this
            }
            , toggleClass: function (t, e) {
                var n = typeof t;
                return "boolean" == typeof e && "string" === n ? e ? this.addClass(t) : this.removeClass(t) : ft.isFunction(t) ? this.each(function (n) {
                    ft(this).toggleClass(t.call(this, n, G(this), e), e)
                }) : this.each(function () {
                    var e, i, r, o;
                    if ("string" === n)
                        for (i = 0, r = ft(this), o = t.match(Et) || []; e = o[i++];) r.hasClass(e) ? r.removeClass(e) : r.addClass(e);
                    else void 0 !== t && "boolean" !== n || (e = G(this), e && _t.set(this, "__className__", e), this.setAttribute && this.setAttribute("class", e || t === !1 ? "" : _t.get(this, "__className__") || ""))
                })
            }
            , hasClass: function (t) {
                var e, n, i = 0;
                for (e = " " + t + " "; n = this[i++];)
                    if (1 === n.nodeType && (" " + G(n) + " ").replace(xe, " ").indexOf(e) > -1) return !0;
                return !1
            }
        });
        var be = /\r/g
            , we = /[\x20\t\r\n\f]+/g;
        ft.fn.extend({
            val: function (t) {
                var e, n, i, r = this[0];
                return arguments.length ? (i = ft.isFunction(t), this.each(function (n) {
                    var r;
                    1 === this.nodeType && (r = i ? t.call(this, n, ft(this).val()) : t, null == r ? r = "" : "number" == typeof r ? r += "" : ft.isArray(r) && (r = ft.map(r, function (t) {
                        return null == t ? "" : t + ""
                    })), e = ft.valHooks[this.type] || ft.valHooks[this.nodeName.toLowerCase()], e && "set" in e && void 0 !== e.set(this, r, "value") || (this.value = r))
                })) : r ? (e = ft.valHooks[r.type] || ft.valHooks[r.nodeName.toLowerCase()], e && "get" in e && void 0 !== (n = e.get(r, "value")) ? n : (n = r.value, "string" == typeof n ? n.replace(be, "") : null == n ? "" : n)) : void 0
            }
        }), ft.extend({
            valHooks: {
                option: {
                    get: function (t) {
                        var e = ft.find.attr(t, "value");
                        return null != e ? e : ft.trim(ft.text(t)).replace(we, " ")
                    }
                }
                , select: {
                    get: function (t) {
                        for (var e, n, i = t.options, r = t.selectedIndex, o = "select-one" === t.type, s = o ? null : [], a = o ? r + 1 : i.length, l = 0 > r ? a : o ? r : 0; a > l; l++)
                            if (n = i[l], (n.selected || l === r) && !n.disabled && (!n.parentNode.disabled || !ft.nodeName(n.parentNode, "optgroup"))) {
                                if (e = ft(n).val(), o) return e;
                                s.push(e)
                            }
                        return s
                    }
                    , set: function (t, e) {
                        for (var n, i, r = t.options, o = ft.makeArray(e), s = r.length; s--;) i = r[s], (i.selected = ft.inArray(ft.valHooks.option.get(i), o) > -1) && (n = !0);
                        return n || (t.selectedIndex = -1), o
                    }
                }
            }
        }), ft.each(["radio", "checkbox"], function () {
            ft.valHooks[this] = {
                set: function (t, e) {
                    return ft.isArray(e) ? t.checked = ft.inArray(ft(t).val(), e) > -1 : void 0
                }
            }, ut.checkOn || (ft.valHooks[this].get = function (t) {
                return null === t.getAttribute("value") ? "on" : t.value
            })
        });
        var ke = /^(?:focusinfocus|focusoutblur)$/;
        ft.extend(ft.event, {
            trigger: function (e, n, i, r) {
                var o, s, a, l, c, u, h, f = [i || Q]
                    , p = at.call(e, "type") ? e.type : e
                    , d = at.call(e, "namespace") ? e.namespace.split(".") : [];
                if (s = a = i = i || Q, 3 !== i.nodeType && 8 !== i.nodeType && !ke.test(p + ft.event.triggered) && (p.indexOf(".") > -1 && (d = p.split("."), p = d.shift(), d.sort()), c = p.indexOf(":") < 0 && "on" + p, e = e[ft.expando] ? e : new ft.Event(p, "object" == typeof e && e), e.isTrigger = r ? 2 : 3, e.namespace = d.join("."), e.rnamespace = e.namespace ? new RegExp("(^|\\.)" + d.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, e.result = void 0, e.target || (e.target = i), n = null == n ? [e] : ft.makeArray(n, [e]), h = ft.event.special[p] || {}, r || !h.trigger || h.trigger.apply(i, n) !== !1)) {
                    if (!r && !h.noBubble && !ft.isWindow(i)) {
                        for (l = h.delegateType || p, ke.test(l + p) || (s = s.parentNode); s; s = s.parentNode) f.push(s), a = s;
                        a === (i.ownerDocument || Q) && f.push(a.defaultView || a.parentWindow || t)
                    }
                    for (o = 0;
                        (s = f[o++]) && !e.isPropagationStopped();) e.type = o > 1 ? l : h.bindType || p, u = (_t.get(s, "events") || {})[e.type] && _t.get(s, "handle"), u && u.apply(s, n), u = c && s[c], u && u.apply && Dt(s) && (e.result = u.apply(s, n), e.result === !1 && e.preventDefault());
                    return e.type = p, r || e.isDefaultPrevented() || h._default && h._default.apply(f.pop(), n) !== !1 || !Dt(i) || c && ft.isFunction(i[p]) && !ft.isWindow(i) && (a = i[c], a && (i[c] = null), ft.event.triggered = p, i[p](), ft.event.triggered = void 0, a && (i[c] = a)), e.result
                }
            }
            , simulate: function (t, e, n) {
                var i = ft.extend(new ft.Event, n, {
                    type: t
                    , isSimulated: !0
                });
                ft.event.trigger(i, null, e)
            }
        }), ft.fn.extend({
            trigger: function (t, e) {
                return this.each(function () {
                    ft.event.trigger(t, e, this)
                })
            }
            , triggerHandler: function (t, e) {
                var n = this[0];
                return n ? ft.event.trigger(t, e, n, !0) : void 0
            }
        }), ft.each("blur focus focusin focusout resize scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup contextmenu".split(" "), function (t, e) {
            ft.fn[e] = function (t, n) {
                return arguments.length > 0 ? this.on(e, null, t, n) : this.trigger(e)
            }
        }), ft.fn.extend({
            hover: function (t, e) {
                return this.mouseenter(t).mouseleave(e || t)
            }
        }), ut.focusin = "onfocusin" in t, ut.focusin || ft.each({
            focus: "focusin"
            , blur: "focusout"
        }, function (t, e) {
            var n = function (t) {
                ft.event.simulate(e, t.target, ft.event.fix(t))
            };
            ft.event.special[e] = {
                setup: function () {
                    var i = this.ownerDocument || this
                        , r = _t.access(i, e);
                    r || i.addEventListener(t, n, !0), _t.access(i, e, (r || 0) + 1)
                }
                , teardown: function () {
                    var i = this.ownerDocument || this
                        , r = _t.access(i, e) - 1;
                    r ? _t.access(i, e, r) : (i.removeEventListener(t, n, !0), _t.remove(i, e))
                }
            }
        });
        var Se = t.location
            , Te = ft.now()
            , Ae = /\?/;
        ft.parseXML = function (e) {
            var n;
            if (!e || "string" != typeof e) return null;
            try {
                n = (new t.DOMParser).parseFromString(e, "text/xml")
            }
            catch (t) {
                n = void 0
            }
            return n && !n.getElementsByTagName("parsererror").length || ft.error("Invalid XML: " + e), n
        };
        var Ce = /\[\]$/
            , Pe = /\r?\n/g
            , Ee = /^(?:submit|button|image|reset|file)$/i
            , Me = /^(?:input|select|textarea|keygen)/i;
        ft.param = function (t, e) {
            var n, i = []
                , r = function (t, e) {
                    var n = ft.isFunction(e) ? e() : e;
                    i[i.length] = encodeURIComponent(t) + "=" + encodeURIComponent(null == n ? "" : n)
                };
            if (ft.isArray(t) || t.jquery && !ft.isPlainObject(t)) ft.each(t, function () {
                r(this.name, this.value)
            });
            else
                for (n in t) Y(n, t[n], e, r);
            return i.join("&")
        }, ft.fn.extend({
            serialize: function () {
                return ft.param(this.serializeArray())
            }
            , serializeArray: function () {
                return this.map(function () {
                    var t = ft.prop(this, "elements");
                    return t ? ft.makeArray(t) : this
                }).filter(function () {
                    var t = this.type;
                    return this.name && !ft(this).is(":disabled") && Me.test(this.nodeName) && !Ee.test(t) && (this.checked || !Xt.test(t))
                }).map(function (t, e) {
                    var n = ft(this).val();
                    return null == n ? null : ft.isArray(n) ? ft.map(n, function (t) {
                        return {
                            name: e.name
                            , value: t.replace(Pe, "\r\n")
                        }
                    }) : {
                        name: e.name
                        , value: n.replace(Pe, "\r\n")
                    }
                }).get()
            }
        });
        var Le = /%20/g
            , Oe = /#.*$/
            , De = /([?&])_=[^&]*/
            , _e = /^(.*?):[ \t]*([^\r\n]*)$/gm
            , Ie = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/
            , Ne = /^(?:GET|HEAD)$/
            , Fe = /^\/\//
            , Re = {}
            , je = {}
            , ze = "*/".concat("*")
            , He = Q.createElement("a");
        He.href = Se.href, ft.extend({
            active: 0
            , lastModified: {}
            , etag: {}
            , ajaxSettings: {
                url: Se.href
                , type: "GET"
                , isLocal: Ie.test(Se.protocol)
                , global: !0
                , processData: !0
                , async: !0
                , contentType: "application/x-www-form-urlencoded; charset=UTF-8"
                , accepts: {
                    "*": ze
                    , text: "text/plain"
                    , html: "text/html"
                    , xml: "application/xml, text/xml"
                    , json: "application/json, text/javascript"
                }
                , contents: {
                    xml: /\bxml\b/
                    , html: /\bhtml/
                    , json: /\bjson\b/
                }
                , responseFields: {
                    xml: "responseXML"
                    , text: "responseText"
                    , json: "responseJSON"
                }
                , converters: {
                    "* text": String
                    , "text html": !0
                    , "text json": JSON.parse
                    , "text xml": ft.parseXML
                }
                , flatOptions: {
                    url: !0
                    , context: !0
                }
            }
            , ajaxSetup: function (t, e) {
                return e ? U(U(t, ft.ajaxSettings), e) : U(ft.ajaxSettings, t)
            }
            , ajaxPrefilter: q(Re)
            , ajaxTransport: q(je)
            , ajax: function (e, n) {
                function i(e, n, i, a) {
                    var c, f, p, b, w, k = n;
                    u || (u = !0, l && t.clearTimeout(l), r = void 0, s = a || "", S.readyState = e > 0 ? 4 : 0, c = e >= 200 && 300 > e || 304 === e, i && (b = Z(d, S, i)), b = $(d, b, S, c), c ? (d.ifModified && (w = S.getResponseHeader("Last-Modified"), w && (ft.lastModified[o] = w), w = S.getResponseHeader("etag"), w && (ft.etag[o] = w)), 204 === e || "HEAD" === d.type ? k = "nocontent" : 304 === e ? k = "notmodified" : (k = b.state, f = b.data, p = b.error, c = !p)) : (p = k, !e && k || (k = "error", 0 > e && (e = 0))), S.status = e, S.statusText = (n || k) + "", c ? y.resolveWith(g, [f, k, S]) : y.rejectWith(g, [S, k, p]), S.statusCode(x), x = void 0, h && v.trigger(c ? "ajaxSuccess" : "ajaxError", [S, d, c ? f : p]), m.fireWith(g, [S, k]), h && (v.trigger("ajaxComplete", [S, d]), --ft.active || ft.event.trigger("ajaxStop")))
                }
                "object" == typeof e && (n = e, e = void 0), n = n || {};
                var r, o, s, a, l, c, u, h, f, p, d = ft.ajaxSetup({}, n)
                    , g = d.context || d
                    , v = d.context && (g.nodeType || g.jquery) ? ft(g) : ft.event
                    , y = ft.Deferred()
                    , m = ft.Callbacks("once memory")
                    , x = d.statusCode || {}
                    , b = {}
                    , w = {}
                    , k = "canceled"
                    , S = {
                        readyState: 0
                        , getResponseHeader: function (t) {
                            var e;
                            if (u) {
                                if (!a)
                                    for (a = {}; e = _e.exec(s);) a[e[1].toLowerCase()] = e[2];
                                e = a[t.toLowerCase()]
                            }
                            return null == e ? null : e
                        }
                        , getAllResponseHeaders: function () {
                            return u ? s : null
                        }
                        , setRequestHeader: function (t, e) {
                            return null == u && (t = w[t.toLowerCase()] = w[t.toLowerCase()] || t, b[t] = e), this
                        }
                        , overrideMimeType: function (t) {
                            return null == u && (d.mimeType = t), this
                        }
                        , statusCode: function (t) {
                            var e;
                            if (t)
                                if (u) S.always(t[S.status]);
                                else
                                    for (e in t) x[e] = [x[e], t[e]];
                            return this
                        }
                        , abort: function (t) {
                            var e = t || k;
                            return r && r.abort(e), i(0, e), this
                        }
                    };
                if (y.promise(S), d.url = ((e || d.url || Se.href) + "").replace(Fe, Se.protocol + "//"), d.type = n.method || n.type || d.method || d.type, d.dataTypes = (d.dataType || "*").toLowerCase().match(Et) || [""], null == d.crossDomain) {
                    c = Q.createElement("a");
                    try {
                        c.href = d.url, c.href = c.href, d.crossDomain = He.protocol + "//" + He.host != c.protocol + "//" + c.host
                    }
                    catch (t) {
                        d.crossDomain = !0
                    }
                }
                if (d.data && d.processData && "string" != typeof d.data && (d.data = ft.param(d.data, d.traditional)), V(Re, d, n, S), u) return S;
                h = ft.event && d.global, h && 0 === ft.active++ && ft.event.trigger("ajaxStart"), d.type = d.type.toUpperCase(), d.hasContent = !Ne.test(d.type), o = d.url.replace(Oe, ""), d.hasContent ? d.data && d.processData && 0 === (d.contentType || "").indexOf("application/x-www-form-urlencoded") && (d.data = d.data.replace(Le, "+")) : (p = d.url.slice(o.length), d.data && (o += (Ae.test(o) ? "&" : "?") + d.data, delete d.data), d.cache === !1 && (o = o.replace(De, ""), p = (Ae.test(o) ? "&" : "?") + "_=" + Te++ + p), d.url = o + p), d.ifModified && (ft.lastModified[o] && S.setRequestHeader("If-Modified-Since", ft.lastModified[o]), ft.etag[o] && S.setRequestHeader("If-None-Match", ft.etag[o])), (d.data && d.hasContent && d.contentType !== !1 || n.contentType) && S.setRequestHeader("Content-Type", d.contentType), S.setRequestHeader("Accept", d.dataTypes[0] && d.accepts[d.dataTypes[0]] ? d.accepts[d.dataTypes[0]] + ("*" !== d.dataTypes[0] ? ", " + ze + "; q=0.01" : "") : d.accepts["*"]);
                for (f in d.headers) S.setRequestHeader(f, d.headers[f]);
                if (d.beforeSend && (d.beforeSend.call(g, S, d) === !1 || u)) return S.abort();
                if (k = "abort", m.add(d.complete), S.done(d.success), S.fail(d.error), r = V(je, d, n, S)) {
                    if (S.readyState = 1, h && v.trigger("ajaxSend", [S, d]), u) return S;
                    d.async && d.timeout > 0 && (l = t.setTimeout(function () {
                        S.abort("timeout")
                    }, d.timeout));
                    try {
                        u = !1, r.send(b, i)
                    }
                    catch (t) {
                        if (u) throw t;
                        i(-1, t)
                    }
                }
                else i(-1, "No Transport");
                return S
            }
            , getJSON: function (t, e, n) {
                return ft.get(t, e, n, "json")
            }
            , getScript: function (t, e) {
                return ft.get(t, void 0, e, "script")
            }
        }), ft.each(["get", "post"], function (t, e) {
            ft[e] = function (t, n, i, r) {
                return ft.isFunction(n) && (r = r || i, i = n, n = void 0), ft.ajax(ft.extend({
                    url: t
                    , type: e
                    , dataType: r
                    , data: n
                    , success: i
                }, ft.isPlainObject(t) && t))
            }
        }), ft._evalUrl = function (t) {
            return ft.ajax({
                url: t
                , type: "GET"
                , dataType: "script"
                , cache: !0
                , async: !1
                , global: !1
                , throws: !0
            })
        }, ft.fn.extend({
            wrapAll: function (t) {
                var e;
                return this[0] && (ft.isFunction(t) && (t = t.call(this[0])), e = ft(t, this[0].ownerDocument).eq(0).clone(!0), this[0].parentNode && e.insertBefore(this[0]), e.map(function () {
                    for (var t = this; t.firstElementChild;) t = t.firstElementChild;
                    return t
                }).append(this)), this
            }
            , wrapInner: function (t) {
                return ft.isFunction(t) ? this.each(function (e) {
                    ft(this).wrapInner(t.call(this, e))
                }) : this.each(function () {
                    var e = ft(this)
                        , n = e.contents();
                    n.length ? n.wrapAll(t) : e.append(t)
                })
            }
            , wrap: function (t) {
                var e = ft.isFunction(t);
                return this.each(function (n) {
                    ft(this).wrapAll(e ? t.call(this, n) : t)
                })
            }
            , unwrap: function (t) {
                return this.parent(t).not("body").each(function () {
                    ft(this).replaceWith(this.childNodes)
                }), this
            }
        }), ft.expr.pseudos.hidden = function (t) {
            return !ft.expr.pseudos.visible(t)
        }, ft.expr.pseudos.visible = function (t) {
            return !!(t.offsetWidth || t.offsetHeight || t.getClientRects().length)
        }, ft.ajaxSettings.xhr = function () {
            try {
                return new t.XMLHttpRequest
            }
            catch (t) {}
        };
        var Be = {
                0: 200
                , 1223: 204
            }
            , We = ft.ajaxSettings.xhr();
        ut.cors = !!We && "withCredentials" in We, ut.ajax = We = !!We, ft.ajaxTransport(function (e) {
            var n, i;
            return ut.cors || We && !e.crossDomain ? {
                send: function (r, o) {
                    var s, a = e.xhr();
                    if (a.open(e.type, e.url, e.async, e.username, e.password), e.xhrFields)
                        for (s in e.xhrFields) a[s] = e.xhrFields[s];
                    e.mimeType && a.overrideMimeType && a.overrideMimeType(e.mimeType), e.crossDomain || r["X-Requested-With"] || (r["X-Requested-With"] = "XMLHttpRequest");
                    for (s in r) a.setRequestHeader(s, r[s]);
                    n = function (t) {
                        return function () {
                            n && (n = i = a.onload = a.onerror = a.onabort = a.onreadystatechange = null, "abort" === t ? a.abort() : "error" === t ? "number" != typeof a.status ? o(0, "error") : o(a.status, a.statusText) : o(Be[a.status] || a.status, a.statusText, "text" !== (a.responseType || "text") || "string" != typeof a.responseText ? {
                                binary: a.response
                            } : {
                                text: a.responseText
                            }, a.getAllResponseHeaders()))
                        }
                    }, a.onload = n(), i = a.onerror = n("error"), void 0 !== a.onabort ? a.onabort = i : a.onreadystatechange = function () {
                        4 === a.readyState && t.setTimeout(function () {
                            n && i()
                        })
                    }, n = n("abort");
                    try {
                        a.send(e.hasContent && e.data || null)
                    }
                    catch (t) {
                        if (n) throw t
                    }
                }
                , abort: function () {
                    n && n()
                }
            } : void 0
        }), ft.ajaxPrefilter(function (t) {
            t.crossDomain && (t.contents.script = !1)
        }), ft.ajaxSetup({
            accepts: {
                script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
            }
            , contents: {
                script: /\b(?:java|ecma)script\b/
            }
            , converters: {
                "text script": function (t) {
                    return ft.globalEval(t), t
                }
            }
        }), ft.ajaxPrefilter("script", function (t) {
            void 0 === t.cache && (t.cache = !1), t.crossDomain && (t.type = "GET")
        }), ft.ajaxTransport("script", function (t) {
            if (t.crossDomain) {
                var e, n;
                return {
                    send: function (i, r) {
                        e = ft("<script>").prop({
                            charset: t.scriptCharset
                            , src: t.url
                        }).on("load error", n = function (t) {
                            e.remove(), n = null, t && r("error" === t.type ? 404 : 200, t.type)
                        }), Q.head.appendChild(e[0])
                    }
                    , abort: function () {
                        n && n()
                    }
                }
            }
        });
        var Xe = []
            , Ge = /(=)\?(?=&|$)|\?\?/;
        ft.ajaxSetup({
            jsonp: "callback"
            , jsonpCallback: function () {
                var t = Xe.pop() || ft.expando + "_" + Te++;
                return this[t] = !0, t
            }
        }), ft.ajaxPrefilter("json jsonp", function (e, n, i) {
            var r, o, s, a = e.jsonp !== !1 && (Ge.test(e.url) ? "url" : "string" == typeof e.data && 0 === (e.contentType || "").indexOf("application/x-www-form-urlencoded") && Ge.test(e.data) && "data");
            return a || "jsonp" === e.dataTypes[0] ? (r = e.jsonpCallback = ft.isFunction(e.jsonpCallback) ? e.jsonpCallback() : e.jsonpCallback, a ? e[a] = e[a].replace(Ge, "$1" + r) : e.jsonp !== !1 && (e.url += (Ae.test(e.url) ? "&" : "?") + e.jsonp + "=" + r), e.converters["script json"] = function () {
                return s || ft.error(r + " was not called"), s[0]
            }, e.dataTypes[0] = "json", o = t[r], t[r] = function () {
                s = arguments
            }, i.always(function () {
                void 0 === o ? ft(t).removeProp(r) : t[r] = o, e[r] && (e.jsonpCallback = n.jsonpCallback, Xe.push(r)), s && ft.isFunction(o) && o(s[0]), s = o = void 0
            }), "script") : void 0
        }), ut.createHTMLDocument = function () {
            var t = Q.implementation.createHTMLDocument("").body;
            return t.innerHTML = "<form></form><form></form>", 2 === t.childNodes.length
        }(), ft.parseHTML = function (t, e, n) {
            if ("string" != typeof t) return [];
            "boolean" == typeof e && (n = e, e = !1);
            var i, r, o;
            return e || (ut.createHTMLDocument ? (e = Q.implementation.createHTMLDocument(""), i = e.createElement("base"), i.href = Q.location.href, e.head.appendChild(i)) : e = Q), r = wt.exec(t), o = !n && [], r ? [e.createElement(r[1])] : (r = m([t], e, o), o && o.length && ft(o).remove(), ft.merge([], r.childNodes))
        }, ft.fn.load = function (t, e, n) {
            var i, r, o, s = this
                , a = t.indexOf(" ");
            return a > -1 && (i = ft.trim(t.slice(a)), t = t.slice(0, a)), ft.isFunction(e) ? (n = e, e = void 0) : e && "object" == typeof e && (r = "POST"), s.length > 0 && ft.ajax({
                url: t
                , type: r || "GET"
                , dataType: "html"
                , data: e
            }).done(function (t) {
                o = arguments, s.html(i ? ft("<div>").append(ft.parseHTML(t)).find(i) : t)
            }).always(n && function (t, e) {
                s.each(function () {
                    n.apply(this, o || [t.responseText, e, t])
                })
            }), this
        }, ft.each(["ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend"], function (t, e) {
            ft.fn[e] = function (t) {
                return this.on(e, t)
            }
        }), ft.expr.pseudos.animated = function (t) {
            return ft.grep(ft.timers, function (e) {
                return t === e.elem
            }).length
        }, ft.offset = {
            setOffset: function (t, e, n) {
                var i, r, o, s, a, l, c, u = ft.css(t, "position")
                    , h = ft(t)
                    , f = {};
                "static" === u && (t.style.position = "relative"), a = h.offset(), o = ft.css(t, "top"), l = ft.css(t, "left"), c = ("absolute" === u || "fixed" === u) && (o + l).indexOf("auto") > -1, c ? (i = h.position(), s = i.top, r = i.left) : (s = parseFloat(o) || 0, r = parseFloat(l) || 0), ft.isFunction(e) && (e = e.call(t, n, ft.extend({}, a))), null != e.top && (f.top = e.top - a.top + s), null != e.left && (f.left = e.left - a.left + r), "using" in e ? e.using.call(t, f) : h.css(f)
            }
        }, ft.fn.extend({
            offset: function (t) {
                if (arguments.length) return void 0 === t ? this : this.each(function (e) {
                    ft.offset.setOffset(this, t, e)
                });
                var e, n, i, r, o = this[0];
                return o ? o.getClientRects().length ? (i = o.getBoundingClientRect(), i.width || i.height ? (r = o.ownerDocument, n = K(r), e = r.documentElement, {
                    top: i.top + n.pageYOffset - e.clientTop
                    , left: i.left + n.pageXOffset - e.clientLeft
                }) : i) : {
                    top: 0
                    , left: 0
                } : void 0
            }
            , position: function () {
                if (this[0]) {
                    var t, e, n = this[0]
                        , i = {
                            top: 0
                            , left: 0
                        };
                    return "fixed" === ft.css(n, "position") ? e = n.getBoundingClientRect() : (t = this.offsetParent(), e = this.offset(), ft.nodeName(t[0], "html") || (i = t.offset()), i = {
                        top: i.top + ft.css(t[0], "borderTopWidth", !0)
                        , left: i.left + ft.css(t[0], "borderLeftWidth", !0)
                    }), {
                        top: e.top - i.top - ft.css(n, "marginTop", !0)
                        , left: e.left - i.left - ft.css(n, "marginLeft", !0)
                    }
                }
            }
            , offsetParent: function () {
                return this.map(function () {
                    for (var t = this.offsetParent; t && "static" === ft.css(t, "position");) t = t.offsetParent;
                    return t || Ut
                })
            }
        }), ft.each({
            scrollLeft: "pageXOffset"
            , scrollTop: "pageYOffset"
        }, function (t, e) {
            var n = "pageYOffset" === e;
            ft.fn[t] = function (i) {
                return Ot(this, function (t, i, r) {
                    var o = K(t);
                    return void 0 === r ? o ? o[e] : t[i] : void(o ? o.scrollTo(n ? o.pageXOffset : r, n ? r : o.pageYOffset) : t[i] = r)
                }, t, i, arguments.length)
            }
        }), ft.each(["top", "left"], function (t, e) {
            ft.cssHooks[e] = O(ut.pixelPosition, function (t, n) {
                return n ? (n = L(t, e), re.test(n) ? ft(t).position()[e] + "px" : n) : void 0
            })
        }), ft.each({
            Height: "height"
            , Width: "width"
        }, function (t, e) {
            ft.each({
                padding: "inner" + t
                , content: e
                , "": "outer" + t
            }, function (n, i) {
                ft.fn[i] = function (r, o) {
                    var s = arguments.length && (n || "boolean" != typeof r)
                        , a = n || (r === !0 || o === !0 ? "margin" : "border");
                    return Ot(this, function (e, n, r) {
                        var o;
                        return ft.isWindow(e) ? 0 === i.indexOf("outer") ? e["inner" + t] : e.document.documentElement["client" + t] : 9 === e.nodeType ? (o = e.documentElement, Math.max(e.body["scroll" + t], o["scroll" + t], e.body["offset" + t], o["offset" + t], o["client" + t])) : void 0 === r ? ft.css(e, n, a) : ft.style(e, n, r, a)
                    }, e, s ? r : void 0, s)
                }
            })
        }), ft.fn.extend({
            bind: function (t, e, n) {
                return this.on(t, null, e, n)
            }
            , unbind: function (t, e) {
                return this.off(t, null, e)
            }
            , delegate: function (t, e, n, i) {
                return this.on(e, t, n, i)
            }
            , undelegate: function (t, e, n) {
                return 1 === arguments.length ? this.off(t, "**") : this.off(e, t || "**", n)
            }
        }), ft.parseJSON = JSON.parse, "function" == typeof define && define.amd && define("jquery", [], function () {
            return ft
        });
        var Ye = t.jQuery
            , qe = t.$;
        return ft.noConflict = function (e) {
            return t.$ === ft && (t.$ = qe), e && t.jQuery === ft && (t.jQuery = Ye), ft
        }, e || (t.jQuery = t.$ = ft), ft
    })
    , function (t, e) {
        "object" == typeof module && module.exports ? module.exports = t.document ? e(t) : e : t.Highcharts = e(t)
    }("undefined" != typeof window ? window : this, function (t) {
        function e(e, n) {
            var i = "Highcharts error #" + e + ": www.highcharts.com/errors/" + e;
            if (n) throw Error(i);
            t.console && console.log(i)
        }

        function n(t, e, n) {
            this.options = e, this.elem = t, this.prop = n
        }

        function i() {
            var t, e, n = arguments
                , i = {}
                , r = function (t, e) {
                    var n, i;
                    "object" != typeof t && (t = {});
                    for (i in e) e.hasOwnProperty(i) && (n = e[i], t[i] = n && "object" == typeof n && "[object Array]" !== Object.prototype.toString.call(n) && "renderTo" !== i && "number" != typeof n.nodeType ? r(t[i] || {}, n) : e[i]);
                    return t
                };
            for (n[0] === !0 && (i = n[1], n = Array.prototype.slice.call(n, 2)), e = n.length, t = 0; t < e; t++) i = r(i, n[t]);
            return i
        }

        function r(t, e) {
            return parseInt(t, e || 10)
        }

        function o(t) {
            return "string" == typeof t
        }

        function s(t) {
            return t && "object" == typeof t
        }

        function a(t) {
            return "[object Array]" === Object.prototype.toString.call(t)
        }

        function l(t, e) {
            for (var n = t.length; n--;)
                if (t[n] === e) {
                    t.splice(n, 1);
                    break
                }
        }

        function c(t) {
            return t !== I && null !== t
        }

        function u(t, e, n) {
            var i, r;
            if (o(e)) c(n) ? t.setAttribute(e, n) : t && t.getAttribute && (r = t.getAttribute(e));
            else if (c(e) && s(e))
                for (i in e) t.setAttribute(i, e[i]);
            return r
        }

        function h(t) {
            return a(t) ? t : [t]
        }

        function f(t, e, n) {
            return e ? setTimeout(t, e, n) : void t.call(0, n)
        }

        function p(t, e) {
            xt && !At && e && e.opacity !== I && (e.filter = "alpha(opacity=" + 100 * e.opacity + ")"), Zt(t.style, e)
        }

        function d(t, e, n, i, r) {
            return t = ot.createElement(t), e && Zt(t, e), r && p(t, {
                padding: 0
                , border: "none"
                , margin: 0
            }), n && p(t, n), i && i.appendChild(t), t
        }

        function g(t, e) {
            var n = function () {};
            return n.prototype = new t, Zt(n.prototype, e), n
        }

        function v(t, e, n) {
            return Array((e || 2) + 1 - String(t).length).join(n || 0) + t
        }

        function y(t) {
            return 6e4 * (G && G(t) || X || 0)
        }

        function m(t, e) {
            for (var n, i, r, o, s, a = "{", l = !1, c = [];
                (a = t.indexOf(a)) !== -1;) {
                if (n = t.slice(0, a), l) {
                    for (i = n.split(":"), r = i.shift().split("."), s = r.length, n = e, o = 0; o < s; o++) n = n[r[o]];
                    i.length && (i = i.join(":"), r = /\.([0-9])/, o = j.lang, s = void 0, /f$/.test(i) ? (s = (s = i.match(r)) ? s[1] : -1, null !== n && (n = rt.numberFormat(n, s, o.decimalPoint, i.indexOf(",") > -1 ? o.thousandsSep : ""))) : n = z(i, n))
                }
                c.push(n), t = t.slice(a + 1), a = (l = !l) ? "}" : "{"
            }
            return c.push(t), c.join("")
        }

        function x(t) {
            return st.pow(10, lt(st.log(t) / st.LN10))
        }

        function b(t, e, n, i, r) {
            var o, s = t
                , n = Kt(n, 1);
            for (o = t / n, e || (e = [1, 2, 2.5, 5, 10], i === !1 && (1 === n ? e = [1, 2, 5, 10] : n <= .1 && (e = [1 / n]))), i = 0; i < e.length && (s = e[i], !(r && s * n >= t || !r && o <= (e[i] + (e[i + 1] || e[i])) / 2)); i++);
            return s *= n
        }

        function w(t, e) {
            var n, i, r = t.length;
            for (i = 0; i < r; i++) t[i].safeI = i;
            for (t.sort(function (t, i) {
                    return n = e(t, i), 0 === n ? t.safeI - i.safeI : n
                }), i = 0; i < r; i++) delete t[i].safeI
        }

        function k(t) {
            for (var e = t.length, n = t[0]; e--;) t[e] < n && (n = t[e]);
            return n
        }

        function S(t) {
            for (var e = t.length, n = t[0]; e--;) t[e] > n && (n = t[e]);
            return n
        }

        function T(t, e) {
            for (var n in t) t[n] && t[n] !== e && t[n].destroy && t[n].destroy(), delete t[n]
        }

        function A(t) {
            R || (R = d(_t)), t && R.appendChild(t), R.innerHTML = ""
        }

        function C(t, e) {
            return parseFloat(t.toPrecision(e || 14))
        }

        function P(t, e) {
            e.renderer.globalAnimation = Kt(t, e.animation)
        }

        function E(t) {
            return s(t) ? i(t) : {
                duration: t ? 500 : 0
            }
        }

        function M() {
            var e = j.global
                , n = e.useUTC
                , i = n ? "getUTC" : "get"
                , r = n ? "setUTC" : "set";
            B = e.Date || t.Date, X = n && e.timezoneOffset, G = n && e.getTimezoneOffset, W = function (t, e, i, r, o, s) {
                var a;
                return n ? (a = B.UTC.apply(0, arguments), a += y(a)) : a = new B(t, e, Kt(i, 1), Kt(r, 0), Kt(o, 0), Kt(s, 0)).getTime(), a
            }, Y = i + "Minutes", q = i + "Hours", V = i + "Day", U = i + "Date", Z = i + "Month", $ = i + "FullYear", K = r + "Milliseconds", J = r + "Seconds", Q = r + "Minutes", tt = r + "Hours", et = r + "Date", nt = r + "Month", it = r + "FullYear"
        }

        function L(t) {
            return this instanceof L ? void this.init(t) : new L(t)
        }

        function O() {}

        function D(t, e, n, i) {
            this.axis = t, this.pos = e, this.type = n || "", this.isNew = !0, !n && !i && this.addLabel()
        }

        function _(t, e, n, i, r) {
            var o = t.chart.inverted;
            this.axis = t, this.isNegative = n, this.options = e, this.x = i, this.total = null, this.points = {}, this.stack = r, this.rightCliff = this.leftCliff = 0, this.alignOptions = {
                align: e.align || (o ? n ? "left" : "right" : "center")
                , verticalAlign: e.verticalAlign || (o ? "middle" : n ? "bottom" : "top")
                , y: Kt(e.y, o ? 4 : n ? 14 : -6)
                , x: Kt(e.x, o ? n ? -6 : 6 : 0)
            }, this.textAlign = e.textAlign || (o ? n ? "right" : "left" : "center")
        }
        var I, N, F, R, j, z, H, B, W, X, G, Y, q, V, U, Z, $, K, J, Q, tt, et, nt, it, rt, ot = t.document
            , st = Math
            , at = st.round
            , lt = st.floor
            , ct = st.ceil
            , ut = st.max
            , ht = st.min
            , ft = st.abs
            , pt = st.cos
            , dt = st.sin
            , gt = st.PI
            , vt = 2 * gt / 360
            , yt = t.navigator && t.navigator.userAgent || ""
            , mt = t.opera
            , xt = /(msie|trident|edge)/i.test(yt) && !mt
            , bt = ot && 8 === ot.documentMode
            , wt = !xt && /AppleWebKit/.test(yt)
            , kt = /Firefox/.test(yt)
            , St = /(Mobile|Android|Windows Phone)/.test(yt)
            , Tt = "http://www.w3.org/2000/svg"
            , At = ot && ot.createElementNS && !!ot.createElementNS(Tt, "svg").createSVGRect
            , Ct = kt && parseInt(yt.split("Firefox/")[1], 10) < 4
            , Pt = ot && !At && !xt && !!ot.createElement("canvas").getContext
            , Et = {}
            , Mt = 0
            , Lt = function () {}
            , Ot = []
            , Dt = 0
            , _t = "div"
            , It = /^[0-9]+$/
            , Nt = ["plotTop", "marginRight", "marginBottom", "plotLeft"]
            , Ft = {};
        rt = t.Highcharts ? e(16, !0) : {
            win: t
        }, rt.seriesTypes = Ft;
        var Rt, jt, zt, Ht, Bt, Wt, Xt, Gt, Yt, qt, Vt, Ut = [];
        n.prototype = {
            dSetter: function () {
                var t, e = this.paths[0]
                    , n = this.paths[1]
                    , i = []
                    , r = this.now
                    , o = e.length;
                if (1 === r) i = this.toD;
                else if (o === n.length && r < 1)
                    for (; o--;) t = parseFloat(e[o]), i[o] = isNaN(t) ? e[o] : r * parseFloat(n[o] - t) + t;
                else i = n;
                this.elem.attr("d", i)
            }
            , update: function () {
                var t = this.elem
                    , e = this.prop
                    , n = this.now
                    , i = this.options.step;
                this[e + "Setter"] ? this[e + "Setter"]() : t.attr ? t.element && t.attr(e, n) : t.style[e] = n + this.unit, i && i.call(t, n, this)
            }
            , run: function (t, e, n) {
                var i, r = this
                    , o = function (t) {
                        return !o.stopped && r.step(t)
                    };
                this.startTime = +new B, this.start = t, this.end = e, this.unit = n, this.now = this.start, this.pos = 0, o.elem = this.elem, o() && 1 === Ut.push(o) && (o.timerId = setInterval(function () {
                    for (i = 0; i < Ut.length; i++) Ut[i]() || Ut.splice(i--, 1);
                    Ut.length || clearInterval(o.timerId)
                }, 13))
            }
            , step: function (t) {
                var e, n = +new B
                    , i = this.options;
                e = this.elem;
                var r, o = i.complete
                    , s = i.duration
                    , a = i.curAnim;
                if (e.attr && !e.element) e = !1;
                else if (t || n >= s + this.startTime) {
                    this.now = this.end, this.pos = 1, this.update(), t = a[this.prop] = !0;
                    for (r in a) a[r] !== !0 && (t = !1);
                    t && o && o.call(e), e = !1
                }
                else this.pos = i.easing((n - this.startTime) / s), this.now = this.start + (this.end - this.start) * this.pos, this.update(), e = !0;
                return e
            }
            , initPath: function (t, e, n) {
                var i, e = e || ""
                    , r = t.shift
                    , o = e.indexOf("C") > -1
                    , s = o ? 7 : 3
                    , e = e.split(" ")
                    , n = [].concat(n)
                    , a = t.isArea
                    , l = a ? 2 : 1
                    , c = function (t) {
                        for (i = t.length; i--;)("M" === t[i] || "L" === t[i]) && t.splice(i + 1, 0, t[i + 1], t[i + 2], t[i + 1], t[i + 2])
                    };
                if (o && (c(e), c(n)), r <= n.length / s && e.length === n.length)
                    for (; r--;) n = n.slice(0, s).concat(n), a && (n = n.concat(n.slice(n.length - s)));
                if (t.shift = 0, e.length)
                    for (t = n.length; e.length < t;) r = e.slice().splice(e.length / l - s, s * l), o && (r[s - 6] = r[s - 2], r[s - 5] = r[s - 1]), [].splice.apply(e, [e.length / l, 0].concat(r));
                return [e, n]
            }
        };
        var Zt = rt.extend = function (t, e) {
                var n;
                t || (t = {});
                for (n in e) t[n] = e[n];
                return t
            }
            , $t = rt.isNumber = function (t) {
                return "number" == typeof t && !isNaN(t)
            }
            , Kt = rt.pick = function () {
                var t, e, n = arguments
                    , i = n.length;
                for (t = 0; t < i; t++)
                    if (e = n[t], e !== I && null !== e) return e
            }
            , Jt = rt.wrap = function (t, e, n) {
                var i = t[e];
                t[e] = function () {
                    var t = Array.prototype.slice.call(arguments);
                    return t.unshift(i), n.apply(this, t)
                }
            };
        z = function (t, e, n) {
            if (!$t(e)) return j.lang.invalidDate || "";
            var i, t = Kt(t, "%Y-%m-%d %H:%M:%S")
                , r = new B(e - y(e))
                , o = r[q]()
                , s = r[V]()
                , a = r[U]()
                , l = r[Z]()
                , c = r[$]()
                , u = j.lang
                , h = u.weekdays
                , f = u.shortWeekdays
                , r = Zt({
                    a: f ? f[s] : h[s].substr(0, 3)
                    , A: h[s]
                    , d: v(a)
                    , e: v(a, 2, " ")
                    , w: s
                    , b: u.shortMonths[l]
                    , B: u.months[l]
                    , m: v(l + 1)
                    , y: c.toString().substr(2, 2)
                    , Y: c
                    , H: v(o)
                    , k: o
                    , I: v(o % 12 || 12)
                    , l: o % 12 || 12
                    , M: v(r[Y]())
                    , p: o < 12 ? "AM" : "PM"
                    , P: o < 12 ? "am" : "pm"
                    , S: v(r.getSeconds())
                    , L: v(at(e % 1e3), 3)
                }, rt.dateFormats);
            for (i in r)
                for (; t.indexOf("%" + i) !== -1;) t = t.replace("%" + i, "function" == typeof r[i] ? r[i](e) : r[i]);
            return n ? t.substr(0, 1).toUpperCase() + t.substr(1) : t
        }, H = {
            millisecond: 1
            , second: 1e3
            , minute: 6e4
            , hour: 36e5
            , day: 864e5
            , week: 6048e5
            , month: 24192e5
            , year: 314496e5
        }, rt.numberFormat = function (t, e, n, i) {
            var o, s, t = +t || 0
                , e = +e
                , a = j.lang
                , l = (t.toString().split(".")[1] || "").length
                , c = Math.abs(t);
            return e === -1 ? e = Math.min(l, 20) : $t(e) || (e = 2), o = String(r(c.toFixed(e))), s = o.length > 3 ? o.length % 3 : 0, n = Kt(n, a.decimalPoint), i = Kt(i, a.thousandsSep), t = t < 0 ? "-" : "", t += s ? o.substr(0, s) + i : "", t += o.substr(s).replace(/(\d{3})(?=\d)/g, "$1" + i), e && (i = Math.abs(c - o + Math.pow(10, -Math.max(e, l) - 1)), t += n + i.toFixed(e).slice(2)), t
        }, Math.easeInOutSine = function (t) {
            return -.5 * (Math.cos(Math.PI * t) - 1)
        }, Rt = function (e, n) {
            var i;
            return "width" === n ? Math.min(e.offsetWidth, e.scrollWidth) - Rt(e, "padding-left") - Rt(e, "padding-right") : "height" === n ? Math.min(e.offsetHeight, e.scrollHeight) - Rt(e, "padding-top") - Rt(e, "padding-bottom") : (i = t.getComputedStyle(e, void 0)) && r(i.getPropertyValue(n));
        }, jt = function (t, e) {
            return e.indexOf ? e.indexOf(t) : [].indexOf.call(e, t)
        }, Ht = function (t, e) {
            return [].filter.call(t, e)
        }, Wt = function (t, e) {
            for (var n = [], i = 0, r = t.length; i < r; i++) n[i] = e.call(t[i], t[i], i, t);
            return n
        }, Bt = function (e) {
            var n = ot.documentElement
                , e = e.getBoundingClientRect();
            return {
                top: e.top + (t.pageYOffset || n.scrollTop) - (n.clientTop || 0)
                , left: e.left + (t.pageXOffset || n.scrollLeft) - (n.clientLeft || 0)
            }
        }, Vt = function (t) {
            for (var e = Ut.length; e--;) Ut[e].elem === t && (Ut[e].stopped = !0)
        }, zt = function (t, e) {
            return Array.prototype.forEach.call(t, e)
        }, Xt = function (e, n, i) {
            function r(n) {
                n.target = n.srcElement || t, i.call(e, n)
            }
            var o = e.hcEvents = e.hcEvents || {};
            e.addEventListener ? e.addEventListener(n, i, !1) : e.attachEvent && (e.hcEventsIE || (e.hcEventsIE = {}), e.hcEventsIE[i.toString()] = r, e.attachEvent("on" + n, r)), o[n] || (o[n] = []), o[n].push(i)
        }, Gt = function (t, e, n) {
            function i(e, n) {
                t.removeEventListener ? t.removeEventListener(e, n, !1) : t.attachEvent && (n = t.hcEventsIE[n.toString()], t.detachEvent("on" + e, n))
            }

            function r() {
                var n, r, o;
                if (t.nodeName)
                    for (o in e ? (n = {}, n[e] = !0) : n = a, n)
                        if (a[o])
                            for (r = a[o].length; r--;) i(o, a[o][r])
            }
            var o, s, a = t.hcEvents;
            a && (e ? (o = a[e] || [], n ? (s = jt(n, o), s > -1 && (o.splice(s, 1), a[e] = o), i(e, n)) : (r(), a[e] = [])) : (r(), t.hcEvents = {}))
        }, Yt = function (t, e, n, i) {
            var r;
            r = t.hcEvents;
            var o, s, n = n || {};
            if (ot.createEvent && (t.dispatchEvent || t.fireEvent)) r = ot.createEvent("Events"), r.initEvent(e, !0, !0), r.target = t, Zt(r, n), t.dispatchEvent ? t.dispatchEvent(r) : t.fireEvent(e, r);
            else if (r)
                for (r = r[e] || [], o = r.length, n.preventDefault || (n.preventDefault = function () {
                        n.defaultPrevented = !0
                    }), n.target = t, n.type || (n.type = e), e = 0; e < o; e++) s = r[e], s.call(t, n) === !1 && n.preventDefault();
            i && !n.defaultPrevented && i(n)
        }, qt = function (t, e, r) {
            var o, a, l, c, u = "";
            s(r) || (o = arguments, r = {
                duration: o[2]
                , easing: o[3]
                , complete: o[4]
            }), $t(r.duration) || (r.duration = 400), r.easing = "function" == typeof r.easing ? r.easing : Math[r.easing] || Math.easeInOutSine, r.curAnim = i(e);
            for (c in e) l = new n(t, r, c), a = null, "d" === c ? (l.paths = l.initPath(t, t.d, e.d), l.toD = e.d, o = 0, a = 1) : t.attr ? o = t.attr(c) : (o = parseFloat(Rt(t, c)) || 0, "opacity" !== c && (u = "px")), a || (a = e[c]), a.match && a.match("px") && (a = a.replace(/px/g, "")), l.run(o, a, u)
        }, t.jQuery && (t.jQuery.fn.highcharts = function () {
            var t = [].slice.call(arguments);
            if (this[0]) return t[0] ? (new(rt[o(t[0]) ? t.shift() : "Chart"])(this[0], t[0], t[1]), this) : Ot[u(this[0], "data-highcharts-chart")]
        }), ot && !ot.defaultView && (Rt = function (t, e) {
            var n;
            return n = {
                width: "clientWidth"
                , height: "clientHeight"
            }[e], t.style[e] ? r(t.style[e]) : ("opacity" === e && (e = "filter"), n ? (t.style.zoom = 1, Math.max(t[n] - 2 * Rt(t, "padding"), 0)) : (n = t.currentStyle[e.replace(/\-(\w)/g, function (t, e) {
                return e.toUpperCase()
            })], "filter" === e && (n = n.replace(/alpha\(opacity=([0-9]+)\)/, function (t, e) {
                return e / 100
            })), "" === n ? 1 : r(n)))
        }), Array.prototype.forEach || (zt = function (t, e) {
            for (var n = 0, i = t.length; n < i; n++)
                if (e.call(t[n], t[n], n, t) === !1) return n
        }), Array.prototype.indexOf || (jt = function (t, e) {
            var n, i = 0;
            if (e)
                for (n = e.length; i < n; i++)
                    if (e[i] === t) return i;
            return -1
        }), Array.prototype.filter || (Ht = function (t, e) {
            for (var n = [], i = 0, r = t.length; i < r; i++) e(t[i], i) && n.push(t[i]);
            return n
        }), rt.Fx = n, rt.inArray = jt, rt.each = zt, rt.grep = Ht, rt.offset = Bt, rt.map = Wt, rt.addEvent = Xt, rt.removeEvent = Gt, rt.fireEvent = Yt, rt.animate = qt, rt.animObject = E, rt.stop = Vt, j = {
            colors: "#7cb5ec,#434348,#90ed7d,#f7a35c,#8085e9,#f15c80,#e4d354,#2b908f,#f45b5b,#91e8e1".split(",")
            , symbols: ["circle", "diamond", "square", "triangle", "triangle-down"]
            , lang: {
                loading: "Loading..."
                , months: "January,February,March,April,May,June,July,August,September,October,November,December".split(",")
                , shortMonths: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(",")
                , weekdays: "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday".split(",")
                , decimalPoint: "."
                , numericSymbols: "k,M,G,T,P,E".split(",")
                , resetZoom: "Reset zoom"
                , resetZoomTitle: "Reset zoom level 1:1"
                , thousandsSep: " "
            }
            , global: {
                useUTC: !0
                , canvasToolsURL: "http://code.highcharts.com/modules/canvas-tools.js"
                , VMLRadialGradientURL: "http://code.highcharts.com/4.2.5/gfx/vml-radial-gradient.png"
            }
            , chart: {
                borderColor: "#4572A7"
                , borderRadius: 0
                , defaultSeriesType: "line"
                , ignoreHiddenSeries: !0
                , spacing: [10, 10, 15, 10]
                , backgroundColor: "#FFFFFF"
                , plotBorderColor: "#C0C0C0"
                , resetZoomButton: {
                    theme: {
                        zIndex: 20
                    }
                    , position: {
                        align: "right"
                        , x: -10
                        , y: 10
                    }
                }
            }
            , title: {
                text: "Chart title"
                , align: "center"
                , margin: 15
                , style: {
                    color: "#333333"
                    , fontSize: "18px"
                }
                , widthAdjust: -44
            }
            , subtitle: {
                text: ""
                , align: "center"
                , style: {
                    color: "#555555"
                }
                , widthAdjust: -44
            }
            , plotOptions: {
                line: {
                    allowPointSelect: !1
                    , showCheckbox: !1
                    , animation: {
                        duration: 1e3
                    }
                    , events: {}
                    , lineWidth: 2
                    , marker: {
                        lineWidth: 0
                        , radius: 4
                        , lineColor: "#FFFFFF"
                        , states: {
                            hover: {
                                enabled: !0
                                , lineWidthPlus: 1
                                , radiusPlus: 2
                            }
                            , select: {
                                fillColor: "#FFFFFF"
                                , lineColor: "#000000"
                                , lineWidth: 2
                            }
                        }
                    }
                    , point: {
                        events: {}
                    }
                    , dataLabels: {
                        align: "center"
                        , formatter: function () {
                            return null === this.y ? "" : rt.numberFormat(this.y, -1)
                        }
                        , style: {
                            color: "contrast"
                            , fontSize: "11px"
                            , fontWeight: "bold"
                            , textShadow: "0 0 6px contrast, 0 0 3px contrast"
                        }
                        , verticalAlign: "bottom"
                        , x: 0
                        , y: 0
                        , padding: 5
                    }
                    , cropThreshold: 300
                    , pointRange: 0
                    , softThreshold: !0
                    , states: {
                        hover: {
                            lineWidthPlus: 1
                            , marker: {}
                            , halo: {
                                size: 10
                                , opacity: .25
                            }
                        }
                        , select: {
                            marker: {}
                        }
                    }
                    , stickyTracking: !0
                    , turboThreshold: 1e3
                }
            }
            , labels: {
                style: {
                    position: "absolute"
                    , color: "#3E576F"
                }
            }
            , legend: {
                enabled: !0
                , align: "center"
                , layout: "horizontal"
                , labelFormatter: function () {
                    return this.name
                }
                , borderColor: "#909090"
                , borderRadius: 0
                , navigation: {
                    activeColor: "#274b6d"
                    , inactiveColor: "#CCC"
                }
                , shadow: !1
                , itemStyle: {
                    color: "#333333"
                    , fontSize: "12px"
                    , fontWeight: "bold"
                }
                , itemHoverStyle: {
                    color: "#000"
                }
                , itemHiddenStyle: {
                    color: "#CCC"
                }
                , itemCheckboxStyle: {
                    position: "absolute"
                    , width: "13px"
                    , height: "13px"
                }
                , symbolPadding: 5
                , verticalAlign: "bottom"
                , x: 0
                , y: 0
                , title: {
                    style: {
                        fontWeight: "bold"
                    }
                }
            }
            , loading: {
                labelStyle: {
                    fontWeight: "bold"
                    , position: "relative"
                    , top: "45%"
                }
                , style: {
                    position: "absolute"
                    , backgroundColor: "white"
                    , opacity: .5
                    , textAlign: "center"
                }
            }
            , tooltip: {
                enabled: !0
                , animation: At
                , backgroundColor: "rgba(249, 249, 249, .85)"
                , borderWidth: 1
                , borderRadius: 3
                , dateTimeLabelFormats: {
                    millisecond: "%A, %b %e, %H:%M:%S.%L"
                    , second: "%A, %b %e, %H:%M:%S"
                    , minute: "%A, %b %e, %H:%M"
                    , hour: "%A, %b %e, %H:%M"
                    , day: "%A, %b %e, %Y"
                    , week: "Week from %A, %b %e, %Y"
                    , month: "%B %Y"
                    , year: "%Y"
                }
                , footerFormat: ""
                , headerFormat: '<span style="font-size: 10px">{point.key}</span><br/>'
                , pointFormat: '<span style="color:{point.color}">●</span> {series.name}: <b>{point.y}</b><br/>'
                , shadow: !0
                , snap: St ? 25 : 10
                , style: {
                    color: "#333333"
                    , cursor: "default"
                    , fontSize: "12px"
                    , padding: "8px"
                    , pointerEvents: "none"
                    , whiteSpace: "nowrap"
                }
            }
            , credits: {
                enabled: !0
                , text: "Highcharts.com"
                , href: "http://www.highcharts.com"
                , position: {
                    align: "right"
                    , x: -10
                    , verticalAlign: "bottom"
                    , y: -5
                }
                , style: {
                    cursor: "pointer"
                    , color: "#909090"
                    , fontSize: "9px"
                }
            }
        };
        var Qt = j.plotOptions
            , te = Qt.line;
        M(), L.prototype = {
            parsers: [{
                regex: /rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]?(?:\.[0-9]+)?)\s*\)/
                , parse: function (t) {
                    return [r(t[1]), r(t[2]), r(t[3]), parseFloat(t[4], 10)]
                }
            }, {
                regex: /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/
                , parse: function (t) {
                    return [r(t[1], 16), r(t[2], 16), r(t[3], 16), 1]
                }
            }, {
                regex: /rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/
                , parse: function (t) {
                    return [r(t[1]), r(t[2]), r(t[3]), 1]
                }
            }]
            , init: function (t) {
                var e, n, i, r;
                if ((this.input = t) && t.stops) this.stops = Wt(t.stops, function (t) {
                    return new L(t[1])
                });
                else
                    for (i = this.parsers.length; i-- && !n;) r = this.parsers[i], (e = r.regex.exec(t)) && (n = r.parse(e));
                this.rgba = n || []
            }
            , get: function (t) {
                var e, n = this.input
                    , r = this.rgba;
                return this.stops ? (e = i(n), e.stops = [].concat(e.stops), zt(this.stops, function (n, i) {
                    e.stops[i] = [e.stops[i][0], n.get(t)]
                })) : e = r && $t(r[0]) ? "rgb" === t || !t && 1 === r[3] ? "rgb(" + r[0] + "," + r[1] + "," + r[2] + ")" : "a" === t ? r[3] : "rgba(" + r.join(",") + ")" : n, e
            }
            , brighten: function (t) {
                var e, n = this.rgba;
                if (this.stops) zt(this.stops, function (e) {
                    e.brighten(t)
                });
                else if ($t(t) && 0 !== t)
                    for (e = 0; e < 3; e++) n[e] += r(255 * t), n[e] < 0 && (n[e] = 0), n[e] > 255 && (n[e] = 255);
                return this
            }
            , setOpacity: function (t) {
                return this.rgba[3] = t, this
            }
        }, O.prototype = {
            opacity: 1
            , textProps: "direction,fontSize,fontWeight,fontFamily,fontStyle,color,lineHeight,width,textDecoration,textOverflow,textShadow".split(",")
            , init: function (t, e) {
                this.element = "span" === e ? d(e) : ot.createElementNS(Tt, e), this.renderer = t
            }
            , animate: function (t, e, n) {
                return e = Kt(e, this.renderer.globalAnimation, !0), Vt(this), e ? (n && (e.complete = n), qt(this, t, e)) : this.attr(t, null, n), this
            }
            , colorGradient: function (t, e, n) {
                var r, o, s, l, u, h, f, p, d, g, v, y, m = this.renderer
                    , x = [];
                if (t.linearGradient ? o = "linearGradient" : t.radialGradient && (o = "radialGradient"), o) {
                    s = t[o], u = m.gradients, f = t.stops, g = n.radialReference, a(s) && (t[o] = s = {
                        x1: s[0]
                        , y1: s[1]
                        , x2: s[2]
                        , y2: s[3]
                        , gradientUnits: "userSpaceOnUse"
                    }), "radialGradient" === o && g && !c(s.gradientUnits) && (l = s, s = i(s, m.getRadialAttr(g, l), {
                        gradientUnits: "userSpaceOnUse"
                    }));
                    for (v in s) "id" !== v && x.push(v, s[v]);
                    for (v in f) x.push(f[v]);
                    x = x.join(","), u[x] ? g = u[x].attr("id") : (s.id = g = "highcharts-" + Mt++, u[x] = h = m.createElement(o).attr(s).add(m.defs), h.radAttr = l, h.stops = [], zt(f, function (t) {
                        0 === t[1].indexOf("rgba") ? (r = L(t[1]), p = r.get("rgb"), d = r.get("a")) : (p = t[1], d = 1), t = m.createElement("stop").attr({
                            offset: t[0]
                            , "stop-color": p
                            , "stop-opacity": d
                        }).add(h), h.stops.push(t)
                    })), y = "url(" + m.url + "#" + g + ")", n.setAttribute(e, y), n.gradient = x, t.toString = function () {
                        return y
                    }
                }
            }
            , applyTextShadow: function (t) {
                var e, n = this.element
                    , i = t.indexOf("contrast") !== -1
                    , o = {}
                    , s = this.renderer.forExport
                    , a = s || n.style.textShadow !== I && !xt;
                i && (o.textShadow = t = t.replace(/contrast/g, this.renderer.getContrast(n.style.fill))), (wt || s) && (o.textRendering = "geometricPrecision"), a ? this.css(o) : (this.fakeTS = !0, this.ySetter = this.xSetter, e = [].slice.call(n.getElementsByTagName("tspan")), zt(t.split(/\s?,\s?/g), function (t) {
                    var i, o, s = n.firstChild
                        , t = t.split(" ");
                    i = t[t.length - 1], (o = t[t.length - 2]) && zt(e, function (t, e) {
                        var a;
                        0 === e && (t.setAttribute("x", n.getAttribute("x")), e = n.getAttribute("y"), t.setAttribute("y", e || 0), null === e && n.setAttribute("y", 0)), a = t.cloneNode(1), u(a, {
                            class: "highcharts-text-shadow"
                            , fill: i
                            , stroke: i
                            , "stroke-opacity": 1 / ut(r(o), 3)
                            , "stroke-width": o
                            , "stroke-linejoin": "round"
                        }), n.insertBefore(a, s)
                    })
                }))
            }
            , attr: function (t, e, n) {
                var i, r, o, s = this.element
                    , a = this;
                if ("string" == typeof t && e !== I && (i = t, t = {}, t[i] = e), "string" == typeof t) a = (this[t + "Getter"] || this._defaultGetter).call(this, t, s);
                else {
                    for (i in t) e = t[i], o = !1, this.symbolName && /^(x|y|width|height|r|start|end|innerR|anchorX|anchorY)/.test(i) && (r || (this.symbolAttr(t), r = !0), o = !0), !this.rotation || "x" !== i && "y" !== i || (this.doTransform = !0), o || (o = this[i + "Setter"] || this._defaultSetter, o.call(this, e, i, s), this.shadows && /^(width|height|visibility|x|y|d|transform|cx|cy|r)$/.test(i) && this.updateShadows(i, e, o));
                    this.doTransform && (this.updateTransform(), this.doTransform = !1)
                }
                return n && n(), a
            }
            , updateShadows: function (t, e, n) {
                for (var i = this.shadows, r = i.length; r--;) n.call(i[r], "height" === t ? Math.max(e - (i[r].cutHeight || 0), 0) : "d" === t ? this.d : e, t, i[r])
            }
            , addClass: function (t) {
                var e = this.element
                    , n = u(e, "class") || "";
                return n.indexOf(t) === -1 && u(e, "class", n + " " + t), this
            }
            , symbolAttr: function (t) {
                var e = this;
                zt("x,y,r,start,end,width,height,innerR,anchorX,anchorY".split(","), function (n) {
                    e[n] = Kt(t[n], e[n])
                }), e.attr({
                    d: e.renderer.symbols[e.symbolName](e.x, e.y, e.width, e.height, e)
                })
            }
            , clip: function (t) {
                return this.attr("clip-path", t ? "url(" + this.renderer.url + "#" + t.id + ")" : "none")
            }
            , crisp: function (t) {
                var e, n, i = {}
                    , r = this.strokeWidth || 0;
                n = at(r) % 2 / 2, t.x = lt(t.x || this.x || 0) + n, t.y = lt(t.y || this.y || 0) + n, t.width = lt((t.width || this.width || 0) - 2 * n), t.height = lt((t.height || this.height || 0) - 2 * n), t.strokeWidth = r;
                for (e in t) this[e] !== t[e] && (this[e] = i[e] = t[e]);
                return i
            }
            , css: function (t) {
                var e, n, i = this.styles
                    , o = {}
                    , s = this.element
                    , a = "";
                if (e = !i, t && t.color && (t.fill = t.color), i)
                    for (n in t) t[n] !== i[n] && (o[n] = t[n], e = !0);
                if (e) {
                    if (e = this.textWidth = t && t.width && "text" === s.nodeName.toLowerCase() && r(t.width) || this.textWidth, i && (t = Zt(i, o)), this.styles = t, e && (Pt || !At && this.renderer.forExport) && delete t.width, xt && !At) p(this.element, t);
                    else {
                        i = function (t, e) {
                            return "-" + e.toLowerCase()
                        };
                        for (n in t) a += n.replace(/([A-Z])/g, i) + ":" + t[n] + ";";
                        u(s, "style", a)
                    }
                    e && this.added && this.renderer.buildText(this)
                }
                return this
            }
            , on: function (t, e) {
                var n = this
                    , i = n.element;
                return F && "click" === t ? (i.ontouchstart = function (t) {
                    n.touchEventFired = B.now(), t.preventDefault(), e.call(i, t)
                }, i.onclick = function (t) {
                    (yt.indexOf("Android") === -1 || B.now() - (n.touchEventFired || 0) > 1100) && e.call(i, t)
                }) : i["on" + t] = e, this
            }
            , setRadialReference: function (t) {
                var e = this.renderer.gradients[this.element.gradient];
                return this.element.radialReference = t, e && e.radAttr && e.animate(this.renderer.getRadialAttr(t, e.radAttr)), this
            }
            , translate: function (t, e) {
                return this.attr({
                    translateX: t
                    , translateY: e
                })
            }
            , invert: function () {
                return this.inverted = !0, this.updateTransform(), this
            }
            , updateTransform: function () {
                var t = this.translateX || 0
                    , e = this.translateY || 0
                    , n = this.scaleX
                    , i = this.scaleY
                    , r = this.inverted
                    , o = this.rotation
                    , s = this.element;
                r && (t += this.attr("width"), e += this.attr("height")), t = ["translate(" + t + "," + e + ")"], r ? t.push("rotate(90) scale(-1,1)") : o && t.push("rotate(" + o + " " + (s.getAttribute("x") || 0) + " " + (s.getAttribute("y") || 0) + ")"), (c(n) || c(i)) && t.push("scale(" + Kt(n, 1) + " " + Kt(i, 1) + ")"), t.length && s.setAttribute("transform", t.join(" "))
            }
            , toFront: function () {
                var t = this.element;
                return t.parentNode.appendChild(t), this
            }
            , align: function (t, e, n) {
                var i, r, s, a, c = {};
                return r = this.renderer, s = r.alignedObjects, t ? (this.alignOptions = t, this.alignByTranslate = e, (!n || o(n)) && (this.alignTo = i = n || "renderer", l(s, this), s.push(this), n = null)) : (t = this.alignOptions, e = this.alignByTranslate, i = this.alignTo), n = Kt(n, r[i], r), i = t.align, r = t.verticalAlign, s = (n.x || 0) + (t.x || 0), a = (n.y || 0) + (t.y || 0), "right" !== i && "center" !== i || (s += (n.width - (t.width || 0)) / {
                    right: 1
                    , center: 2
                }[i]), c[e ? "translateX" : "x"] = at(s), "bottom" !== r && "middle" !== r || (a += (n.height - (t.height || 0)) / ({
                    bottom: 1
                    , middle: 2
                }[r] || 1)), c[e ? "translateY" : "y"] = at(a), this[this.placed ? "animate" : "attr"](c), this.placed = !0, this.alignAttr = c, this
            }
            , getBBox: function (t, e) {
                var n, i, r, o, s = this.renderer
                    , a = this.element
                    , l = this.styles;
                i = this.textStr;
                var c, u, h, f = a.style
                    , p = s.cache
                    , d = s.cacheKeys;
                if (r = Kt(e, this.rotation), o = r * vt, i !== I && (h = ["", r || 0, l && l.fontSize, a.style.width].join(","), h = "" === i || It.test(i) ? "num:" + i.toString().length + h : i + h), h && !t && (n = p[h]), !n) {
                    if (a.namespaceURI === Tt || s.forExport) {
                        try {
                            u = this.fakeTS && function (t) {
                                zt(a.querySelectorAll(".highcharts-text-shadow"), function (e) {
                                    e.style.display = t
                                })
                            }, kt && f.textShadow ? (c = f.textShadow, f.textShadow = "") : u && u("none"), n = a.getBBox ? Zt({}, a.getBBox()) : {
                                width: a.offsetWidth
                                , height: a.offsetHeight
                            }, c ? f.textShadow = c : u && u("")
                        }
                        catch (t) {}(!n || n.width < 0) && (n = {
                            width: 0
                            , height: 0
                        })
                    }
                    else n = this.htmlGetBBox();
                    if (s.isSVG && (s = n.width, i = n.height, xt && l && "11px" === l.fontSize && "16.9" === i.toPrecision(3) && (n.height = i = 14), r && (n.width = ft(i * dt(o)) + ft(s * pt(o)), n.height = ft(i * pt(o)) + ft(s * dt(o)))), h) {
                        for (; d.length > 250;) delete p[d.shift()];
                        p[h] || d.push(h), p[h] = n
                    }
                }
                return n
            }
            , show: function (t) {
                return this.attr({
                    visibility: t ? "inherit" : "visible"
                })
            }
            , hide: function () {
                return this.attr({
                    visibility: "hidden"
                })
            }
            , fadeOut: function (t) {
                var e = this;
                e.animate({
                    opacity: 0
                }, {
                    duration: t || 150
                    , complete: function () {
                        e.attr({
                            y: -9999
                        })
                    }
                })
            }
            , add: function (t) {
                var e, n = this.renderer
                    , i = this.element;
                return t && (this.parentGroup = t), this.parentInverted = t && t.inverted, void 0 !== this.textStr && n.buildText(this), this.added = !0, (!t || t.handleZ || this.zIndex) && (e = this.zIndexSetter()), e || (t ? t.element : n.box).appendChild(i), this.onAdd && this.onAdd(), this
            }
            , safeRemoveChild: function (t) {
                var e = t.parentNode;
                e && e.removeChild(t)
            }
            , destroy: function () {
                var t, e, n = this
                    , i = n.element || {}
                    , r = n.shadows
                    , o = n.renderer.isSVG && "SPAN" === i.nodeName && n.parentGroup;
                if (i.onclick = i.onmouseout = i.onmouseover = i.onmousemove = i.point = null, Vt(n), n.clipPath && (n.clipPath = n.clipPath.destroy()), n.stops) {
                    for (e = 0; e < n.stops.length; e++) n.stops[e] = n.stops[e].destroy();
                    n.stops = null
                }
                for (n.safeRemoveChild(i), r && zt(r, function (t) {
                        n.safeRemoveChild(t)
                    }); o && o.div && 0 === o.div.childNodes.length;) i = o.parentGroup, n.safeRemoveChild(o.div), delete o.div, o = i;
                n.alignTo && l(n.renderer.alignedObjects, n);
                for (t in n) delete n[t];
                return null
            }
            , shadow: function (t, e, n) {
                var i, r, o, s, a, l, c = []
                    , h = this.element;
                if (t) {
                    for (s = Kt(t.width, 3), a = (t.opacity || .15) / s, l = this.parentInverted ? "(-1,-1)" : "(" + Kt(t.offsetX, 1) + ", " + Kt(t.offsetY, 1) + ")", i = 1; i <= s; i++) r = h.cloneNode(0), o = 2 * s + 1 - 2 * i, u(r, {
                        isShadow: "true"
                        , stroke: t.color || "black"
                        , "stroke-opacity": a * i
                        , "stroke-width": o
                        , transform: "translate" + l
                        , fill: "none"
                    }), n && (u(r, "height", ut(u(r, "height") - o, 0)), r.cutHeight = o), e ? e.element.appendChild(r) : h.parentNode.insertBefore(r, h), c.push(r);
                    this.shadows = c
                }
                return this
            }
            , xGetter: function (t) {
                return "circle" === this.element.nodeName && (t = {
                    x: "cx"
                    , y: "cy"
                }[t] || t), this._defaultGetter(t)
            }
            , _defaultGetter: function (t) {
                return t = Kt(this[t], this.element ? this.element.getAttribute(t) : null, 0), /^[\-0-9\.]+$/.test(t) && (t = parseFloat(t)), t
            }
            , dSetter: function (t, e, n) {
                t && t.join && (t = t.join(" ")), /(NaN| {2}|^$)/.test(t) && (t = "M 0 0"), n.setAttribute(e, t), this[e] = t
            }
            , dashstyleSetter: function (t) {
                var e, n = this["stroke-width"];
                if ("inherit" === n && (n = 1), t = t && t.toLowerCase()) {
                    for (t = t.replace("shortdashdotdot", "3,1,1,1,1,1,").replace("shortdashdot", "3,1,1,1").replace("shortdot", "1,1,").replace("shortdash", "3,1,").replace("longdash", "8,3,").replace(/dot/g, "1,3,").replace("dash", "4,3,").replace(/,$/, "").split(","), e = t.length; e--;) t[e] = r(t[e]) * n;
                    t = t.join(",").replace(/NaN/g, "none"), this.element.setAttribute("stroke-dasharray", t)
                }
            }
            , alignSetter: function (t) {
                this.element.setAttribute("text-anchor", {
                    left: "start"
                    , center: "middle"
                    , right: "end"
                }[t])
            }
            , opacitySetter: function (t, e, n) {
                this[e] = t, n.setAttribute(e, t)
            }
            , titleSetter: function (t) {
                var e = this.element.getElementsByTagName("title")[0];
                e || (e = ot.createElementNS(Tt, "title"), this.element.appendChild(e)), e.firstChild && e.removeChild(e.firstChild), e.appendChild(ot.createTextNode(String(Kt(t), "").replace(/<[^>]*>/g, "")))
            }
            , textSetter: function (t) {
                t !== this.textStr && (delete this.bBox, this.textStr = t, this.added && this.renderer.buildText(this))
            }
            , fillSetter: function (t, e, n) {
                "string" == typeof t ? n.setAttribute(e, t) : t && this.colorGradient(t, e, n)
            }
            , visibilitySetter: function (t, e, n) {
                "inherit" === t ? n.removeAttribute(e) : n.setAttribute(e, t)
            }
            , zIndexSetter: function (t, e) {
                var n, i, o, s = this.renderer
                    , a = this.parentGroup
                    , s = (a || s).element || s.box
                    , l = this.element;
                n = this.added;
                var u;
                if (c(t) && (l.zIndex = t, t = +t, this[e] === t && (n = !1), this[e] = t), n) {
                    for ((t = this.zIndex) && a && (a.handleZ = !0), a = s.childNodes, u = 0; u < a.length && !o; u++) n = a[u], i = n.zIndex, n !== l && (r(i) > t || !c(t) && c(i)) && (s.insertBefore(l, n), o = !0);
                    o || s.appendChild(l)
                }
                return o
            }
            , _defaultSetter: function (t, e, n) {
                n.setAttribute(e, t)
            }
        }, O.prototype.yGetter = O.prototype.xGetter, O.prototype.translateXSetter = O.prototype.translateYSetter = O.prototype.rotationSetter = O.prototype.verticalAlignSetter = O.prototype.scaleXSetter = O.prototype.scaleYSetter = function (t, e) {
            this[e] = t, this.doTransform = !0
        }, O.prototype["stroke-widthSetter"] = O.prototype.strokeSetter = function (t, e, n) {
            this[e] = t, this.stroke && this["stroke-width"] ? (this.strokeWidth = this["stroke-width"], O.prototype.fillSetter.call(this, this.stroke, "stroke", n), n.setAttribute("stroke-width", this["stroke-width"]), this.hasStroke = !0) : "stroke-width" === e && 0 === t && this.hasStroke && (n.removeAttribute("stroke"), this.hasStroke = !1)
        };
        var ee = function () {
            this.init.apply(this, arguments)
        };
        ee.prototype = {
            Element: O
            , init: function (e, n, i, r, o, s) {
                var a, r = this.createElement("svg").attr({
                    version: "1.1"
                }).css(this.getStyle(r));
                a = r.element, e.appendChild(a), e.innerHTML.indexOf("xmlns") === -1 && u(a, "xmlns", Tt), this.isSVG = !0, this.box = a, this.boxWrapper = r, this.alignedObjects = [], this.url = (kt || wt) && ot.getElementsByTagName("base").length ? t.location.href.replace(/#.*?$/, "").replace(/([\('\)])/g, "\\$1").replace(/ /g, "%20") : "", this.createElement("desc").add().element.appendChild(ot.createTextNode("Created with Highcharts 4.2.5")), this.defs = this.createElement("defs").add(), this.allowHTML = s, this.forExport = o, this.gradients = {}, this.cache = {}, this.cacheKeys = [], this.imgCount = 0, this.setSize(n, i, !1);
                var l;
                kt && e.getBoundingClientRect && (this.subPixelFix = n = function () {
                    p(e, {
                        left: 0
                        , top: 0
                    }), l = e.getBoundingClientRect(), p(e, {
                        left: ct(l.left) - l.left + "px"
                        , top: ct(l.top) - l.top + "px"
                    })
                }, n(), Xt(t, "resize", n))
            }
            , getStyle: function (t) {
                return this.style = Zt({
                    fontFamily: '"Lucida Grande", "Lucida Sans Unicode", Arial, Helvetica, sans-serif'
                    , fontSize: "12px"
                }, t)
            }
            , isHidden: function () {
                return !this.boxWrapper.getBBox().width
            }
            , destroy: function () {
                var e = this.defs;
                return this.box = null, this.boxWrapper = this.boxWrapper.destroy(), T(this.gradients || {}), this.gradients = null, e && (this.defs = e.destroy()), this.subPixelFix && Gt(t, "resize", this.subPixelFix), this.alignedObjects = null
            }
            , createElement: function (t) {
                var e = new this.Element;
                return e.init(this, t), e
            }
            , draw: function () {}
            , getRadialAttr: function (t, e) {
                return {
                    cx: t[0] - t[2] / 2 + e.cx * t[2]
                    , cy: t[1] - t[2] / 2 + e.cy * t[2]
                    , r: e.r * t[2]
                }
            }
            , buildText: function (t) {
                for (var e, n, i, o = t.element, s = this, a = s.forExport, l = Kt(t.textStr, "").toString(), c = l.indexOf("<") !== -1, h = o.childNodes, f = u(o, "x"), d = t.styles, g = t.textWidth, v = d && d.lineHeight, y = d && d.textShadow, m = d && "ellipsis" === d.textOverflow, x = h.length, b = g && !t.added && this.box, w = function (t) {
                        return v ? r(v) : s.fontMetrics(/(px|em)$/.test(t && t.style.fontSize) ? t.style.fontSize : d && d.fontSize || s.style.fontSize || 12, t).h
                    }, k = function (t) {
                        return t.replace(/&lt;/g, "<").replace(/&gt;/g, ">")
                    }; x--;) o.removeChild(h[x]);
                c || y || m || l.indexOf(" ") !== -1 ? (e = /<.*style="([^"]+)".*>/, n = /<.*href="(http[^"]+)".*>/, b && b.appendChild(o), l = c ? l.replace(/<(b|strong)>/g, '<span style="font-weight:bold">').replace(/<(i|em)>/g, '<span style="font-style:italic">').replace(/<a/g, "<span").replace(/<\/(b|strong|i|em|a)>/g, "</span>").split(/<br.*?>/g) : [l], l = Ht(l, function (t) {
                    return "" !== t
                }), zt(l, function (r, l) {
                    var c, h = 0
                        , r = r.replace(/^\s+|\s+$/g, "").replace(/<span/g, "|||<span").replace(/<\/span>/g, "</span>|||");
                    c = r.split("|||"), zt(c, function (r) {
                        if ("" !== r || 1 === c.length) {
                            var v, y = {}
                                , x = ot.createElementNS(Tt, "tspan");
                            if (e.test(r) && (v = r.match(e)[1].replace(/(;| |^)color([ :])/, "$1fill$2"), u(x, "style", v)), n.test(r) && !a && (u(x, "onclick", 'location.href="' + r.match(n)[1] + '"'), p(x, {
                                    cursor: "pointer"
                                })), r = k(r.replace(/<(.|\n)*?>/g, "") || " "), " " !== r) {
                                if (x.appendChild(ot.createTextNode(r)), h ? y.dx = 0 : l && null !== f && (y.x = f), u(x, y), o.appendChild(x), !h && l && (!At && a && p(x, {
                                        display: "block"
                                    }), u(x, "dy", w(x))), g) {
                                    for (var b, S, y = r.replace(/([^\^])-/g, "$1- ").split(" "), T = c.length > 1 || l || y.length > 1 && "nowrap" !== d.whiteSpace, A = [], C = w(x), P = 1, E = t.rotation, M = r, L = M.length;
                                        (T || m) && (y.length || A.length);) t.rotation = 0, b = t.getBBox(!0), S = b.width, !At && s.forExport && (S = s.measureSpanWidth(x.firstChild.data, t.styles)), b = S > g, void 0 === i && (i = b), m && i ? (L /= 2, "" === M || !b && L < .5 ? y = [] : (M = r.substring(0, M.length + (b ? -1 : 1) * ct(L)), y = [M + (g > 3 ? "…" : "")], x.removeChild(x.firstChild))) : b && 1 !== y.length ? (x.removeChild(x.firstChild), A.unshift(y.pop())) : (y = A, A = [], y.length && (P++, x = ot.createElementNS(Tt, "tspan"), u(x, {
                                        dy: C
                                        , x: f
                                    }), v && u(x, "style", v), o.appendChild(x)), S > g && (g = S)), y.length && x.appendChild(ot.createTextNode(y.join(" ").replace(/- /g, "-")));
                                    t.rotation = E
                                }
                                h++
                            }
                        }
                    })
                }), i && t.attr("title", t.textStr), b && b.removeChild(o), y && t.applyTextShadow && t.applyTextShadow(y)) : o.appendChild(ot.createTextNode(k(l)))
            }
            , getContrast: function (t) {
                return t = L(t).rgba, t[0] + t[1] + t[2] > 384 ? "#000000" : "#FFFFFF"
            }
            , button: function (t, e, n, r, o, s, a, l, c) {
                var u, h, f, p, d, g, v = this.label(t, e, n, c, null, null, null, null, "button")
                    , y = 0
                    , t = {
                        x1: 0
                        , y1: 0
                        , x2: 0
                        , y2: 1
                    }
                    , o = i({
                        "stroke-width": 1
                        , stroke: "#CCCCCC"
                        , fill: {
                            linearGradient: t
                            , stops: [[0, "#FEFEFE"], [1, "#F6F6F6"]]
                        }
                        , r: 2
                        , padding: 5
                        , style: {
                            color: "black"
                        }
                    }, o);
                return f = o.style, delete o.style, s = i(o, {
                    stroke: "#68A"
                    , fill: {
                        linearGradient: t
                        , stops: [[0, "#FFF"], [1, "#ACF"]]
                    }
                }, s), p = s.style, delete s.style, a = i(o, {
                    stroke: "#68A"
                    , fill: {
                        linearGradient: t
                        , stops: [[0, "#9BD"], [1, "#CDF"]]
                    }
                }, a), d = a.style, delete a.style, l = i(o, {
                    style: {
                        color: "#CCC"
                    }
                }, l), g = l.style, delete l.style, Xt(v.element, xt ? "mouseover" : "mouseenter", function () {
                    3 !== y && v.attr(s).css(p)
                }), Xt(v.element, xt ? "mouseout" : "mouseleave", function () {
                    3 !== y && (u = [o, s, a][y], h = [f, p, d][y], v.attr(u).css(h))
                }), v.setState = function (t) {
                    (v.state = y = t) ? 2 === t ? v.attr(a).css(d) : 3 === t && v.attr(l).css(g): v.attr(o).css(f)
                }, v.on("click", function (t) {
                    3 !== y && r.call(v, t)
                }).attr(o).css(Zt({
                    cursor: "default"
                }, f))
            }
            , crispLine: function (t, e) {
                return t[1] === t[4] && (t[1] = t[4] = at(t[1]) - e % 2 / 2), t[2] === t[5] && (t[2] = t[5] = at(t[2]) + e % 2 / 2), t
            }
            , path: function (t) {
                var e = {
                    fill: "none"
                };
                return a(t) ? e.d = t : s(t) && Zt(e, t), this.createElement("path").attr(e)
            }
            , circle: function (t, e, n) {
                return t = s(t) ? t : {
                    x: t
                    , y: e
                    , r: n
                }, e = this.createElement("circle"), e.xSetter = e.ySetter = function (t, e, n) {
                    n.setAttribute("c" + e, t)
                }, e.attr(t)
            }
            , arc: function (t, e, n, i, r, o) {
                return s(t) && (e = t.y, n = t.r, i = t.innerR, r = t.start, o = t.end, t = t.x), t = this.symbol("arc", t || 0, e || 0, n || 0, n || 0, {
                    innerR: i || 0
                    , start: r || 0
                    , end: o || 0
                }), t.r = n, t
            }
            , rect: function (t, e, n, i, r, o) {
                var r = s(t) ? t.r : r
                    , a = this.createElement("rect")
                    , t = s(t) ? t : t === I ? {} : {
                        x: t
                        , y: e
                        , width: ut(n, 0)
                        , height: ut(i, 0)
                    };
                return o !== I && (a.strokeWidth = o, t = a.crisp(t)), r && (t.r = r), a.rSetter = function (t, e, n) {
                    u(n, {
                        rx: t
                        , ry: t
                    })
                }, a.attr(t)
            }
            , setSize: function (t, e, n) {
                var i = this.alignedObjects
                    , r = i.length;
                for (this.width = t, this.height = e, this.boxWrapper[Kt(n, !0) ? "animate" : "attr"]({
                        width: t
                        , height: e
                    }); r--;) i[r].align()
            }
            , g: function (t) {
                var e = this.createElement("g");
                return c(t) ? e.attr({
                    class: "highcharts-" + t
                }) : e
            }
            , image: function (t, e, n, i, r) {
                var o = {
                    preserveAspectRatio: "none"
                };
                return arguments.length > 1 && Zt(o, {
                    x: e
                    , y: n
                    , width: i
                    , height: r
                }), o = this.createElement("image").attr(o), o.element.setAttributeNS ? o.element.setAttributeNS("http://www.w3.org/1999/xlink", "href", t) : o.element.setAttribute("hc-svg-href", t), o
            }
            , symbol: function (t, e, n, i, r, o) {
                var s, a, l, c = this
                    , u = this.symbols[t]
                    , u = u && u(at(e), at(n), i, r, o)
                    , h = /^url\((.*?)\)$/;
                return u ? (s = this.path(u), Zt(s, {
                    symbolName: t
                    , x: e
                    , y: n
                    , width: i
                    , height: r
                }), o && Zt(s, o)) : h.test(t) && (l = function (t, e) {
                    t.element && (t.attr({
                        width: e[0]
                        , height: e[1]
                    }), t.alignByTranslate || t.translate(at((i - e[0]) / 2), at((r - e[1]) / 2)))
                }, a = t.match(h)[1], t = Et[a] || o && o.width && o.height && [o.width, o.height], s = this.image(a).attr({
                    x: e
                    , y: n
                }), s.isImg = !0, t ? l(s, t) : (s.attr({
                    width: 0
                    , height: 0
                }), d("img", {
                    onload: function () {
                        0 === this.width && (p(this, {
                            position: "absolute"
                            , top: "-999em"
                        }), ot.body.appendChild(this)), l(s, Et[a] = [this.width, this.height]), this.parentNode && this.parentNode.removeChild(this), c.imgCount--, !c.imgCount && Ot[c.chartIndex].onload && Ot[c.chartIndex].onload()
                    }
                    , src: a
                }), this.imgCount++)), s
            }
            , symbols: {
                circle: function (t, e, n, i) {
                    var r = .166 * n;
                    return ["M", t + n / 2, e, "C", t + n + r, e, t + n + r, e + i, t + n / 2, e + i, "C", t - r, e + i, t - r, e, t + n / 2, e, "Z"]
                }
                , square: function (t, e, n, i) {
                    return ["M", t, e, "L", t + n, e, t + n, e + i, t, e + i, "Z"]
                }
                , triangle: function (t, e, n, i) {
                    return ["M", t + n / 2, e, "L", t + n, e + i, t, e + i, "Z"]
                }
                , "triangle-down": function (t, e, n, i) {
                    return ["M", t, e, "L", t + n, e, t + n / 2, e + i, "Z"]
                }
                , diamond: function (t, e, n, i) {
                    return ["M", t + n / 2, e, "L", t + n, e + i / 2, t + n / 2, e + i, t, e + i / 2, "Z"]
                }
                , arc: function (t, e, n, i, r) {
                    var o = r.start
                        , n = r.r || n || i
                        , s = r.end - .001
                        , i = r.innerR
                        , a = r.open
                        , l = pt(o)
                        , c = dt(o)
                        , u = pt(s)
                        , s = dt(s)
                        , r = r.end - o < gt ? 0 : 1;
                    return ["M", t + n * l, e + n * c, "A", n, n, 0, r, 1, t + n * u, e + n * s, a ? "M" : "L", t + i * u, e + i * s, "A", i, i, 0, r, 0, t + i * l, e + i * c, a ? "" : "Z"]
                }
                , callout: function (t, e, n, i, r) {
                    var o, s = ht(r && r.r || 0, n, i)
                        , a = s + 6
                        , l = r && r.anchorX
                        , r = r && r.anchorY;
                    return o = ["M", t + s, e, "L", t + n - s, e, "C", t + n, e, t + n, e, t + n, e + s, "L", t + n, e + i - s, "C", t + n, e + i, t + n, e + i, t + n - s, e + i, "L", t + s, e + i, "C", t, e + i, t, e + i, t, e + i - s, "L", t, e + s, "C", t, e, t, e, t + s, e], l && l > n && r > e + a && r < e + i - a ? o.splice(13, 3, "L", t + n, r - 6, t + n + 6, r, t + n, r + 6, t + n, e + i - s) : l && l < 0 && r > e + a && r < e + i - a ? o.splice(33, 3, "L", t, r + 6, t - 6, r, t, r - 6, t, e + s) : r && r > i && l > t + a && l < t + n - a ? o.splice(23, 3, "L", l + 6, e + i, l, e + i + 6, l - 6, e + i, t + s, e + i) : r && r < 0 && l > t + a && l < t + n - a && o.splice(3, 3, "L", l - 6, e, l, e - 6, l + 6, e, n - s, e), o
                }
            }
            , clipRect: function (t, e, n, i) {
                var r = "highcharts-" + Mt++
                    , o = this.createElement("clipPath").attr({
                        id: r
                    }).add(this.defs)
                    , t = this.rect(t, e, n, i, 0).add(o);
                return t.id = r, t.clipPath = o, t.count = 0, t
            }
            , text: function (t, e, n, i) {
                var r = Pt || !At && this.forExport
                    , o = {};
                return !i || !this.allowHTML && this.forExport ? (o.x = Math.round(e || 0), n && (o.y = Math.round(n)), (t || 0 === t) && (o.text = t), t = this.createElement("text").attr(o), r && t.css({
                    position: "absolute"
                }), i || (t.xSetter = function (t, e, n) {
                    var i, r, o = n.getElementsByTagName("tspan")
                        , s = n.getAttribute(e);
                    for (r = 0; r < o.length; r++) i = o[r], i.getAttribute(e) === s && i.setAttribute(e, t);
                    n.setAttribute(e, t)
                }), t) : this.html(t, e, n)
            }
            , fontMetrics: function (e, n) {
                var i, o, e = e || this.style.fontSize;
                return !e && n && t.getComputedStyle && (n = n.element || n, e = (i = t.getComputedStyle(n, "")) && i.fontSize), e = /px/.test(e) ? r(e) : /em/.test(e) ? 12 * parseFloat(e) : 12, i = e < 24 ? e + 3 : at(1.2 * e), o = at(.8 * i), {
                    h: i
                    , b: o
                    , f: e
                }
            }
            , rotCorr: function (t, e, n) {
                var i = t;
                return e && n && (i = ut(i * pt(e * vt), 4)), {
                    x: -t / 3 * dt(e * vt)
                    , y: i
                }
            }
            , label: function (t, e, n, r, o, s, a, l, u) {
                var h, f, p, d, g, v, y, m, x, b, w, k = this
                    , S = k.g(u)
                    , T = k.text("", 0, 0, a).attr({
                        zIndex: 1
                    })
                    , A = 0
                    , C = 3
                    , P = 0
                    , E = 0
                    , M = {};
                x = function () {
                    var t, e;
                    t = T.element.style, f = (void 0 === p || void 0 === d || S.styles.textAlign) && c(T.textStr) && T.getBBox(), S.width = (p || f.width || 0) + 2 * C + P, S.height = (d || f.height || 0) + 2 * C, y = C + k.fontMetrics(t && t.fontSize, T).b, m && (h || (t = E, e = (l ? -y : 0) + E, S.box = h = r ? k.symbol(r, t, e, S.width, S.height, M) : k.rect(t, e, S.width, S.height, 0, M["stroke-width"]), h.isImg || h.attr("fill", "none"), h.add(S)), h.isImg || h.attr(Zt({
                        width: at(S.width)
                        , height: at(S.height)
                    }, M)), M = null)
                }, b = function () {
                    var t, e = S.styles
                        , e = e && e.textAlign
                        , n = P + C;
                    t = l ? 0 : y, c(p) && f && ("center" === e || "right" === e) && (n += {
                        center: .5
                        , right: 1
                    }[e] * (p - f.width)), n === T.x && t === T.y || (T.attr("x", n), t !== I && T.attr("y", t)), T.x = n, T.y = t
                }, w = function (t, e) {
                    h ? h.attr(t, e) : M[t] = e
                }, S.onAdd = function () {
                    T.add(S), S.attr({
                        text: t || 0 === t ? t : ""
                        , x: e
                        , y: n
                    }), h && c(o) && S.attr({
                        anchorX: o
                        , anchorY: s
                    })
                }, S.widthSetter = function (t) {
                    p = t
                }, S.heightSetter = function (t) {
                    d = t
                }, S.paddingSetter = function (t) {
                    c(t) && t !== C && (C = S.padding = t, b())
                }, S.paddingLeftSetter = function (t) {
                    c(t) && t !== P && (P = t, b())
                }, S.alignSetter = function (t) {
                    t = {
                        left: 0
                        , center: .5
                        , right: 1
                    }[t], t !== A && (A = t, f && S.attr({
                        x: g
                    }))
                }, S.textSetter = function (t) {
                    t !== I && T.textSetter(t), x(), b()
                }, S["stroke-widthSetter"] = function (t, e) {
                    t && (m = !0), E = t % 2 / 2, w(e, t)
                }, S.strokeSetter = S.fillSetter = S.rSetter = function (t, e) {
                    "fill" === e && t && (m = !0), w(e, t)
                }, S.anchorXSetter = function (t, e) {
                    o = t, w(e, at(t) - E - g)
                }, S.anchorYSetter = function (t, e) {
                    s = t, w(e, t - v)
                }, S.xSetter = function (t) {
                    S.x = t, A && (t -= A * ((p || f.width) + 2 * C)), g = at(t), S.attr("translateX", g)
                }, S.ySetter = function (t) {
                    v = S.y = at(t), S.attr("translateY", v)
                };
                var L = S.css;
                return Zt(S, {
                    css: function (t) {
                        if (t) {
                            var e = {}
                                , t = i(t);
                            zt(S.textProps, function (n) {
                                t[n] !== I && (e[n] = t[n], delete t[n])
                            }), T.css(e)
                        }
                        return L.call(S, t)
                    }
                    , getBBox: function () {
                        return {
                            width: f.width + 2 * C
                            , height: f.height + 2 * C
                            , x: f.x - C
                            , y: f.y - C
                        }
                    }
                    , shadow: function (t) {
                        return h && h.shadow(t), S
                    }
                    , destroy: function () {
                        Gt(S.element, "mouseenter"), Gt(S.element, "mouseleave"), T && (T = T.destroy()), h && (h = h.destroy()), O.prototype.destroy.call(S), S = k = x = b = w = null
                    }
                })
            }
        }, N = ee, Zt(O.prototype, {
            htmlCss: function (t) {
                var e = this.element;
                return (e = t && "SPAN" === e.tagName && t.width) && (delete t.width, this.textWidth = e, this.updateTransform()), t && "ellipsis" === t.textOverflow && (t.whiteSpace = "nowrap", t.overflow = "hidden"), this.styles = Zt(this.styles, t), p(this.element, t), this
            }
            , htmlGetBBox: function () {
                var t = this.element;
                return "text" === t.nodeName && (t.style.position = "absolute"), {
                    x: t.offsetLeft
                    , y: t.offsetTop
                    , width: t.offsetWidth
                    , height: t.offsetHeight
                }
            }
            , htmlUpdateTransform: function () {
                if (this.added) {
                    var t = this.renderer
                        , e = this.element
                        , n = this.translateX || 0
                        , i = this.translateY || 0
                        , o = this.x || 0
                        , s = this.y || 0
                        , a = this.textAlign || "left"
                        , l = {
                            left: 0
                            , center: .5
                            , right: 1
                        }[a]
                        , u = this.shadows
                        , h = this.styles;
                    if (p(e, {
                            marginLeft: n
                            , marginTop: i
                        }), u && zt(u, function (t) {
                            p(t, {
                                marginLeft: n + 1
                                , marginTop: i + 1
                            })
                        }), this.inverted && zt(e.childNodes, function (n) {
                            t.invertChild(n, e)
                        }), "SPAN" === e.tagName) {
                        var u = this.rotation
                            , f = r(this.textWidth)
                            , d = h && h.whiteSpace
                            , g = [u, a, e.innerHTML, this.textWidth, this.textAlign].join(",");
                        g !== this.cTT && (h = t.fontMetrics(e.style.fontSize).b, c(u) && this.setSpanRotation(u, l, h), e.offsetWidth > f && /[ \-]/.test(e.textContent || e.innerText) ? (p(e, {
                            width: f + "px"
                            , display: "block"
                            , whiteSpace: d || "normal"
                        }), this.hasTextWidth = !0) : this.hasTextWidth && (p(e, {
                            width: ""
                            , display: ""
                            , whiteSpace: d || "nowrap"
                        }), this.hasTextWidth = !1), this.getSpanCorrection(this.hasTextWidth ? f : e.offsetWidth, h, l, u, a)), p(e, {
                            left: o + (this.xCorr || 0) + "px"
                            , top: s + (this.yCorr || 0) + "px"
                        }), wt && (h = e.offsetHeight), this.cTT = g
                    }
                }
                else this.alignOnAdd = !0
            }
            , setSpanRotation: function (t, e, n) {
                var i = {}
                    , r = xt ? "-ms-transform" : wt ? "-webkit-transform" : kt ? "MozTransform" : mt ? "-o-transform" : "";
                i[r] = i.transform = "rotate(" + t + "deg)", i[r + (kt ? "Origin" : "-origin")] = i.transformOrigin = 100 * e + "% " + n + "px", p(this.element, i)
            }
            , getSpanCorrection: function (t, e, n) {
                this.xCorr = -t * n, this.yCorr = -e
            }
        }), Zt(ee.prototype, {
            html: function (t, e, n) {
                var i = this.createElement("span")
                    , r = i.element
                    , o = i.renderer
                    , s = o.isSVG
                    , a = function (t, e) {
                        zt(["opacity", "visibility"], function (n) {
                            Jt(t, n + "Setter", function (t, n, i, r) {
                                t.call(this, n, i, r), e[i] = n
                            })
                        })
                    };
                return i.textSetter = function (t) {
                    t !== r.innerHTML && delete this.bBox, r.innerHTML = this.textStr = t, i.htmlUpdateTransform()
                }, s && a(i, i.element.style), i.xSetter = i.ySetter = i.alignSetter = i.rotationSetter = function (t, e) {
                    "align" === e && (e = "textAlign"), i[e] = t, i.htmlUpdateTransform()
                }, i.attr({
                    text: t
                    , x: at(e)
                    , y: at(n)
                }).css({
                    position: "absolute"
                    , fontFamily: this.style.fontFamily
                    , fontSize: this.style.fontSize
                }), r.style.whiteSpace = "nowrap", i.css = i.htmlCss, s && (i.add = function (t) {
                    var e, n = o.box.parentNode
                        , s = [];
                    if (this.parentGroup = t) {
                        if (e = t.div, !e) {
                            for (; t;) s.push(t), t = t.parentGroup;
                            zt(s.reverse(), function (t) {
                                var i, r = u(t.element, "class");
                                r && (r = {
                                    className: r
                                }), e = t.div = t.div || d(_t, r, {
                                    position: "absolute"
                                    , left: (t.translateX || 0) + "px"
                                    , top: (t.translateY || 0) + "px"
                                    , opacity: t.opacity
                                }, e || n), i = e.style, Zt(t, {
                                    translateXSetter: function (e, n) {
                                        i.left = e + "px", t[n] = e, t.doTransform = !0
                                    }
                                    , translateYSetter: function (e, n) {
                                        i.top = e + "px", t[n] = e, t.doTransform = !0
                                    }
                                }), a(t, i)
                            })
                        }
                    }
                    else e = n;
                    return e.appendChild(r), i.added = !0, i.alignOnAdd && i.htmlUpdateTransform(), i
                }), i
            }
        });
        var ne;
        if (!At && !Pt) {
            ne = {
                init: function (t, e) {
                    var n = ["<", e, ' filled="f" stroked="f"']
                        , i = ["position: ", "absolute", ";"]
                        , r = e === _t;
                    ("shape" === e || r) && i.push("left:0;top:0;width:1px;height:1px;"), i.push("visibility: ", r ? "hidden" : "visible"), n.push(' style="', i.join(""), '"/>'), e && (n = r || "span" === e || "img" === e ? n.join("") : t.prepVML(n), this.element = d(n)), this.renderer = t
                }
                , add: function (t) {
                    var e = this.renderer
                        , n = this.element
                        , i = e.box
                        , r = t && t.inverted
                        , i = t ? t.element || t : i;
                    return t && (this.parentGroup = t), r && e.invertChild(n, i), i.appendChild(n), this.added = !0, this.alignOnAdd && !this.deferUpdateTransform && this.updateTransform(), this.onAdd && this.onAdd(), this
                }
                , updateTransform: O.prototype.htmlUpdateTransform
                , setSpanRotation: function () {
                    var t = this.rotation
                        , e = pt(t * vt)
                        , n = dt(t * vt);
                    p(this.element, {
                        filter: t ? ["progid:DXImageTransform.Microsoft.Matrix(M11=", e, ", M12=", -n, ", M21=", n, ", M22=", e, ", sizingMethod='auto expand')"].join("") : "none"
                    })
                }
                , getSpanCorrection: function (t, e, n, i, r) {
                    var o, s = i ? pt(i * vt) : 1
                        , a = i ? dt(i * vt) : 0
                        , l = Kt(this.elemHeight, this.element.offsetHeight);
                    this.xCorr = s < 0 && -t, this.yCorr = a < 0 && -l, o = s * a < 0, this.xCorr += a * e * (o ? 1 - n : n), this.yCorr -= s * e * (i ? o ? n : 1 - n : 1), r && "left" !== r && (this.xCorr -= t * n * (s < 0 ? -1 : 1), i && (this.yCorr -= l * n * (a < 0 ? -1 : 1)), p(this.element, {
                        textAlign: r
                    }))
                }
                , pathToVML: function (t) {
                    for (var e = t.length, n = []; e--;) $t(t[e]) ? n[e] = at(10 * t[e]) - 5 : "Z" === t[e] ? n[e] = "x" : (n[e] = t[e], !t.isArc || "wa" !== t[e] && "at" !== t[e] || (n[e + 5] === n[e + 7] && (n[e + 7] += t[e + 7] > t[e + 5] ? 1 : -1), n[e + 6] === n[e + 8] && (n[e + 8] += t[e + 8] > t[e + 6] ? 1 : -1)));
                    return n.join(" ") || "x"
                }
                , clip: function (t) {
                    var e, n = this;
                    return t ? (e = t.members, l(e, n), e.push(n), n.destroyClip = function () {
                        l(e, n)
                    }, t = t.getCSS(n)) : (n.destroyClip && n.destroyClip(), t = {
                        clip: bt ? "inherit" : "rect(auto)"
                    }), n.css(t)
                }
                , css: O.prototype.htmlCss
                , safeRemoveChild: function (t) {
                    t.parentNode && A(t)
                }
                , destroy: function () {
                    return this.destroyClip && this.destroyClip(), O.prototype.destroy.apply(this)
                }
                , on: function (e, n) {
                    return this.element["on" + e] = function () {
                        var e = t.event;
                        e.target = e.srcElement, n(e)
                    }, this
                }
                , cutOffPath: function (t, e) {
                    var n, t = t.split(/[ ,]/);
                    return n = t.length, 9 !== n && 11 !== n || (t[n - 4] = t[n - 2] = r(t[n - 2]) - 10 * e), t.join(" ")
                }
                , shadow: function (t, e, n) {
                    var i, o, s, a, l, c, u, h = []
                        , f = this.element
                        , p = this.renderer
                        , g = f.style
                        , v = f.path;
                    if (v && "string" != typeof v.value && (v = "x"), l = v, t) {
                        for (c = Kt(t.width, 3), u = (t.opacity || .15) / c, i = 1; i <= 3; i++) a = 2 * c + 1 - 2 * i, n && (l = this.cutOffPath(v.value, a + .5)), s = ['<shape isShadow="true" strokeweight="', a, '" filled="false" path="', l, '" coordsize="10 10" style="', f.style.cssText, '" />'], o = d(p.prepVML(s), null, {
                            left: r(g.left) + Kt(t.offsetX, 1)
                            , top: r(g.top) + Kt(t.offsetY, 1)
                        }), n && (o.cutOff = a + 1), s = ['<stroke color="', t.color || "black", '" opacity="', u * i, '"/>'], d(p.prepVML(s), null, null, o), e ? e.element.appendChild(o) : f.parentNode.insertBefore(o, f), h.push(o);
                        this.shadows = h
                    }
                    return this
                }
                , updateShadows: Lt
                , setAttr: function (t, e) {
                    bt ? this.element[t] = e : this.element.setAttribute(t, e)
                }
                , classSetter: function (t) {
                    this.element.className = t
                }
                , dashstyleSetter: function (t, e, n) {
                    (n.getElementsByTagName("stroke")[0] || d(this.renderer.prepVML(["<stroke/>"]), null, null, n))[e] = t || "solid", this[e] = t
                }
                , dSetter: function (t, e, n) {
                    var i = this.shadows
                        , t = t || [];
                    if (this.d = t.join && t.join(" "), n.path = t = this.pathToVML(t), i)
                        for (n = i.length; n--;) i[n].path = i[n].cutOff ? this.cutOffPath(t, i[n].cutOff) : t;
                    this.setAttr(e, t)
                }
                , fillSetter: function (t, e, n) {
                    var i = n.nodeName;
                    "SPAN" === i ? n.style.color = t : "IMG" !== i && (n.filled = "none" !== t, this.setAttr("fillcolor", this.renderer.color(t, n, e, this)))
                }
                , "fill-opacitySetter": function (t, e, n) {
                    d(this.renderer.prepVML(["<", e.split("-")[0], ' opacity="', t, '"/>']), null, null, n)
                }
                , opacitySetter: Lt
                , rotationSetter: function (t, e, n) {
                    n = n.style, this[e] = n[e] = t, n.left = -at(dt(t * vt) + 1) + "px", n.top = at(pt(t * vt)) + "px"
                }
                , strokeSetter: function (t, e, n) {
                    this.setAttr("strokecolor", this.renderer.color(t, n, e, this))
                }
                , "stroke-widthSetter": function (t, e, n) {
                    n.stroked = !!t, this[e] = t, $t(t) && (t += "px"), this.setAttr("strokeweight", t)
                }
                , titleSetter: function (t, e) {
                    this.setAttr(e, t)
                }
                , visibilitySetter: function (t, e, n) {
                    "inherit" === t && (t = "visible"), this.shadows && zt(this.shadows, function (n) {
                        n.style[e] = t
                    }), "DIV" === n.nodeName && (t = "hidden" === t ? "-999em" : 0, bt || (n.style[e] = t ? "visible" : "hidden"), e = "top"), n.style[e] = t
                }
                , xSetter: function (t, e, n) {
                    this[e] = t, "x" === e ? e = "left" : "y" === e && (e = "top"), this.updateClipping ? (this[e] = t, this.updateClipping()) : n.style[e] = t
                }
                , zIndexSetter: function (t, e, n) {
                    n.style[e] = t
                }
            }, ne["stroke-opacitySetter"] = ne["fill-opacitySetter"], rt.VMLElement = ne = g(O, ne), ne.prototype.ySetter = ne.prototype.widthSetter = ne.prototype.heightSetter = ne.prototype.xSetter;
            var ie = {
                Element: ne
                , isIE8: yt.indexOf("MSIE 8.0") > -1
                , init: function (t, e, n, i) {
                    var r;
                    if (this.alignedObjects = [], i = this.createElement(_t).css(Zt(this.getStyle(i), {
                            position: "relative"
                        })), r = i.element, t.appendChild(i.element), this.isVML = !0, this.box = r, this.boxWrapper = i, this.gradients = {}, this.cache = {}, this.cacheKeys = [], this.imgCount = 0, this.setSize(e, n, !1), !ot.namespaces.hcv) {
                        ot.namespaces.add("hcv", "urn:schemas-microsoft-com:vml");
                        try {
                            ot.createStyleSheet().cssText = "hcv\\:fill, hcv\\:path, hcv\\:shape, hcv\\:stroke{ behavior:url(#default#VML); display: inline-block; } "
                        }
                        catch (t) {
                            ot.styleSheets[0].cssText += "hcv\\:fill, hcv\\:path, hcv\\:shape, hcv\\:stroke{ behavior:url(#default#VML); display: inline-block; } "
                        }
                    }
                }
                , isHidden: function () {
                    return !this.box.offsetWidth
                }
                , clipRect: function (t, e, n, i) {
                    var r = this.createElement()
                        , o = s(t);
                    return Zt(r, {
                        members: []
                        , count: 0
                        , left: (o ? t.x : t) + 1
                        , top: (o ? t.y : e) + 1
                        , width: (o ? t.width : n) - 1
                        , height: (o ? t.height : i) - 1
                        , getCSS: function (t) {
                            var e = t.element
                                , n = e.nodeName
                                , t = t.inverted
                                , i = this.top - ("shape" === n ? e.offsetTop : 0)
                                , r = this.left
                                , e = r + this.width
                                , o = i + this.height
                                , i = {
                                    clip: "rect(" + at(t ? r : i) + "px," + at(t ? o : e) + "px," + at(t ? e : o) + "px," + at(t ? i : r) + "px)"
                                };
                            return !t && bt && "DIV" === n && Zt(i, {
                                width: e + "px"
                                , height: o + "px"
                            }), i
                        }
                        , updateClipping: function () {
                            zt(r.members, function (t) {
                                t.element && t.css(r.getCSS(t))
                            })
                        }
                    })
                }
                , color: function (t, e, n, i) {
                    var r, o, s, a = this
                        , l = /^rgba/
                        , c = "none";
                    if (t && t.linearGradient ? s = "gradient" : t && t.radialGradient && (s = "pattern"), s) {
                        var u, h, f, p, g, v, y, m, x = t.linearGradient || t.radialGradient
                            , b = ""
                            , t = t.stops
                            , w = []
                            , k = function () {
                                o = ['<fill colors="' + w.join(",") + '" opacity="', g, '" o:opacity2="', p, '" type="', s, '" ', b, 'focus="100%" method="any" />'], d(a.prepVML(o), null, null, e)
                            };
                        if (f = t[0], m = t[t.length - 1], f[0] > 0 && t.unshift([0, f[1]]), m[0] < 1 && t.push([1, m[1]]), zt(t, function (t, e) {
                                l.test(t[1]) ? (r = L(t[1]), u = r.get("rgb"), h = r.get("a")) : (u = t[1], h = 1), w.push(100 * t[0] + "% " + u), e ? (g = h, v = u) : (p = h, y = u)
                            }), "fill" === n)
                            if ("gradient" === s) n = x.x1 || x[0] || 0, t = x.y1 || x[1] || 0, f = x.x2 || x[2] || 0, x = x.y2 || x[3] || 0, b = 'angle="' + (90 - 180 * st.atan((x - t) / (f - n)) / gt) + '"', k();
                            else {
                                var S, c = x.r
                                    , T = 2 * c
                                    , A = 2 * c
                                    , C = x.cx
                                    , P = x.cy
                                    , E = e.radialReference
                                    , c = function () {
                                        E && (S = i.getBBox(), C += (E[0] - S.x) / S.width - .5, P += (E[1] - S.y) / S.height - .5, T *= E[2] / S.width, A *= E[2] / S.height), b = 'src="' + j.global.VMLRadialGradientURL + '" size="' + T + "," + A + '" origin="0.5,0.5" position="' + C + "," + P + '" color2="' + y + '" ', k()
                                    };
                                i.added ? c() : i.onAdd = c, c = v
                            }
                        else c = u
                    }
                    else l.test(t) && "IMG" !== e.tagName ? (r = L(t), i[n + "-opacitySetter"](r.get("a"), n, e), c = r.get("rgb")) : (c = e.getElementsByTagName(n), c.length && (c[0].opacity = 1, c[0].type = "solid"), c = t);
                    return c
                }
                , prepVML: function (t) {
                    var e = this.isIE8
                        , t = t.join("");
                    return e ? (t = t.replace("/>", ' xmlns="urn:schemas-microsoft-com:vml" />'), t = t.indexOf('style="') === -1 ? t.replace("/>", ' style="display:inline-block;behavior:url(#default#VML);" />') : t.replace('style="', 'style="display:inline-block;behavior:url(#default#VML);')) : t = t.replace("<", "<hcv:"), t
                }
                , text: ee.prototype.html
                , path: function (t) {
                    var e = {
                        coordsize: "10 10"
                    };
                    return a(t) ? e.d = t : s(t) && Zt(e, t), this.createElement("shape").attr(e)
                }
                , circle: function (t, e, n) {
                    var i = this.symbol("circle");
                    return s(t) && (n = t.r, e = t.y, t = t.x), i.isCircle = !0, i.r = n, i.attr({
                        x: t
                        , y: e
                    })
                }
                , g: function (t) {
                    var e;
                    return t && (e = {
                        className: "highcharts-" + t
                        , class: "highcharts-" + t
                    }), this.createElement(_t).attr(e)
                }
                , image: function (t, e, n, i, r) {
                    var o = this.createElement("img").attr({
                        src: t
                    });
                    return arguments.length > 1 && o.attr({
                        x: e
                        , y: n
                        , width: i
                        , height: r
                    }), o
                }
                , createElement: function (t) {
                    return "rect" === t ? this.symbol(t) : ee.prototype.createElement.call(this, t)
                }
                , invertChild: function (t, e) {
                    var n = this
                        , i = e.style
                        , o = "IMG" === t.tagName && t.style;
                    p(t, {
                        flip: "x"
                        , left: r(i.width) - (o ? r(o.top) : 1)
                        , top: r(i.height) - (o ? r(o.left) : 1)
                        , rotation: -90
                    }), zt(t.childNodes, function (e) {
                        n.invertChild(e, t)
                    })
                }
                , symbols: {
                    arc: function (t, e, n, i, r) {
                        var o = r.start
                            , s = r.end
                            , a = r.r || n || i
                            , n = r.innerR
                            , i = pt(o)
                            , l = dt(o)
                            , c = pt(s)
                            , u = dt(s);
                        return s - o === 0 ? ["x"] : (o = ["wa", t - a, e - a, t + a, e + a, t + a * i, e + a * l, t + a * c, e + a * u], r.open && !n && o.push("e", "M", t, e), o.push("at", t - n, e - n, t + n, e + n, t + n * c, e + n * u, t + n * i, e + n * l, "x", "e"), o.isArc = !0, o)
                    }
                    , circle: function (t, e, n, i, r) {
                        return r && (n = i = 2 * r.r), r && r.isCircle && (t -= n / 2, e -= i / 2), ["wa", t, e, t + n, e + i, t + n, e + i / 2, t + n, e + i / 2, "e"]
                    }
                    , rect: function (t, e, n, i, r) {
                        return ee.prototype.symbols[c(r) && r.r ? "callout" : "square"].call(0, t, e, n, i, r)
                    }
                }
            };
            rt.VMLRenderer = ne = function () {
                this.init.apply(this, arguments)
            }, ne.prototype = i(ee.prototype, ie), N = ne
        }
        ee.prototype.measureSpanWidth = function (t, e) {
            var n, i = ot.createElement("span");
            return n = ot.createTextNode(t), i.appendChild(n), p(i, e), this.box.appendChild(i), n = i.offsetWidth, A(i), n
        };
        var re;
        Pt && (rt.CanVGRenderer = ne = function () {
            Tt = "http://www.w3.org/1999/xhtml"
        }, ne.prototype.symbols = {}, re = function () {
            function t() {
                var t, n = e.length;
                for (t = 0; t < n; t++) e[t]();
                e = []
            }
            var e = [];
            return {
                push: function (n, i) {
                    if (0 === e.length) {
                        var r = ot.getElementsByTagName("head")[0]
                            , o = ot.createElement("script");
                        o.type = "text/javascript", o.src = i, o.onload = t, r.appendChild(o)
                    }
                    e.push(n)
                }
            }
        }(), N = ne), D.prototype = {
            addLabel: function () {
                var t, e = this.axis
                    , n = e.options
                    , r = e.chart
                    , o = e.categories
                    , s = e.names
                    , a = this.pos
                    , l = n.labels
                    , u = e.tickPositions
                    , h = a === u[0]
                    , f = a === u[u.length - 1]
                    , s = o ? Kt(o[a], s[a], a) : a
                    , o = this.label
                    , u = u.info;
                e.isDatetimeAxis && u && (t = n.dateTimeLabelFormats[u.higherRanks[a] || u.unitName]), this.isFirst = h, this.isLast = f, n = e.labelFormatter.call({
                    axis: e
                    , chart: r
                    , isFirst: h
                    , isLast: f
                    , dateTimeLabelFormat: t
                    , value: e.isLog ? C(e.lin2log(s)) : s
                }), c(o) ? o && o.attr({
                    text: n
                }) : (this.labelLength = (this.label = o = c(n) && l.enabled ? r.renderer.text(n, 0, 0, l.useHTML).css(i(l.style)).add(e.labelGroup) : null) && o.getBBox().width, this.rotation = 0)
            }
            , getLabelSize: function () {
                return this.label ? this.label.getBBox()[this.axis.horiz ? "height" : "width"] : 0
            }
            , handleOverflow: function (t) {
                var e, n = this.axis
                    , i = t.x
                    , r = n.chart.chartWidth
                    , o = n.chart.spacing
                    , s = Kt(n.labelLeft, ht(n.pos, o[3]))
                    , o = Kt(n.labelRight, ut(n.pos + n.len, r - o[1]))
                    , a = this.label
                    , l = this.rotation
                    , c = {
                        left: 0
                        , center: .5
                        , right: 1
                    }[n.labelAlign]
                    , u = a.getBBox().width
                    , h = n.getSlotWidth()
                    , f = h
                    , p = 1
                    , d = {};
                l ? l < 0 && i - c * u < s ? e = at(i / pt(l * vt) - s) : l > 0 && i + c * u > o && (e = at((r - i) / pt(l * vt))) : (r = i + (1 - c) * u, i - c * u < s ? f = t.x + f * (1 - c) - s : r > o && (f = o - t.x + f * c, p = -1), f = ht(h, f), f < h && "center" === n.labelAlign && (t.x += p * (h - f - c * (h - ht(u, f)))), (u > f || n.autoRotation && a.styles.width) && (e = f)), e && (d.width = e, n.options.labels.style.textOverflow || (d.textOverflow = "ellipsis"), a.css(d))
            }
            , getPosition: function (t, e, n, i) {
                var r = this.axis
                    , o = r.chart
                    , s = i && o.oldChartHeight || o.chartHeight;
                return {
                    x: t ? r.translate(e + n, null, null, i) + r.transB : r.left + r.offset + (r.opposite ? (i && o.oldChartWidth || o.chartWidth) - r.right - r.left : 0)
                    , y: t ? s - r.bottom + r.offset - (r.opposite ? r.height : 0) : s - r.translate(e + n, null, null, i) - r.transB
                }
            }
            , getLabelPosition: function (t, e, n, i, r, o, s, a) {
                var l = this.axis
                    , u = l.transA
                    , h = l.reversed
                    , f = l.staggerLines
                    , p = l.tickRotCorr || {
                        x: 0
                        , y: 0
                    }
                    , d = r.y;
                return c(d) || (d = 0 === l.side ? n.rotation ? -8 : -n.getBBox().height : 2 === l.side ? p.y + 8 : pt(n.rotation * vt) * (p.y - n.getBBox(!1, 0).height / 2)), t = t + r.x + p.x - (o && i ? o * u * (h ? -1 : 1) : 0), e = e + d - (o && !i ? o * u * (h ? 1 : -1) : 0), f && (n = s / (a || 1) % f, l.opposite && (n = f - n - 1), e += n * (l.labelOffset / f)), {
                    x: t
                    , y: at(e)
                }
            }
            , getMarkPath: function (t, e, n, i, r, o) {
                return o.crispLine(["M", t, e, "L", t + (r ? 0 : -n), e + (r ? n : 0)], i)
            }
            , render: function (t, e, n) {
                var i = this.axis
                    , r = i.options
                    , o = i.chart.renderer
                    , s = i.horiz
                    , a = this.type
                    , l = this.label
                    , c = this.pos
                    , u = r.labels
                    , h = this.gridLine
                    , f = a ? a + "Grid" : "grid"
                    , p = a ? a + "Tick" : "tick"
                    , d = r[f + "LineWidth"]
                    , g = r[f + "LineColor"]
                    , v = r[f + "LineDashStyle"]
                    , f = i.tickSize(p)
                    , p = r[p + "Color"]
                    , y = this.mark
                    , m = u.step
                    , x = !0
                    , b = i.tickmarkOffset
                    , w = this.getPosition(s, c, b, e)
                    , k = w.x
                    , w = w.y
                    , S = s && k === i.pos + i.len || !s && w === i.pos ? -1 : 1
                    , n = Kt(n, 1);
                this.isActive = !0, d && (c = i.getPlotLinePath(c + b, d * S, e, !0), h === I && (h = {
                    stroke: g
                    , "stroke-width": d
                }, v && (h.dashstyle = v), a || (h.zIndex = 1), e && (h.opacity = 0), this.gridLine = h = d ? o.path(c).attr(h).add(i.gridGroup) : null), !e && h && c && h[this.isNew ? "attr" : "animate"]({
                    d: c
                    , opacity: n
                })), f && (i.opposite && (f[0] = -f[0]), a = this.getMarkPath(k, w, f[0], f[1] * S, s, o), y ? y.animate({
                    d: a
                    , opacity: n
                }) : this.mark = o.path(a).attr({
                    stroke: p
                    , "stroke-width": f[1]
                    , opacity: n
                }).add(i.axisGroup)), l && $t(k) && (l.xy = w = this.getLabelPosition(k, w, l, s, u, b, t, m), this.isFirst && !this.isLast && !Kt(r.showFirstLabel, 1) || this.isLast && !this.isFirst && !Kt(r.showLastLabel, 1) ? x = !1 : s && !i.isRadial && !u.step && !u.rotation && !e && 0 !== n && this.handleOverflow(w), m && t % m && (x = !1), x && $t(w.y) ? (w.opacity = n, l[this.isNew ? "attr" : "animate"](w), this.isNew = !1) : l.attr("y", -9999))
            }
            , destroy: function () {
                T(this, this.axis)
            }
        }, rt.PlotLineOrBand = function (t, e) {
            this.axis = t, e && (this.options = e, this.id = e.id)
        }, rt.PlotLineOrBand.prototype = {
            render: function () {
                var t, e = this
                    , n = e.axis
                    , r = n.horiz
                    , o = e.options
                    , s = o.label
                    , a = e.label
                    , l = o.width
                    , u = o.to
                    , h = o.from
                    , f = c(h) && c(u)
                    , p = o.value
                    , d = o.dashStyle
                    , g = e.svgElem
                    , v = []
                    , y = o.color
                    , m = Kt(o.zIndex, 0)
                    , x = o.events
                    , b = {}
                    , w = n.chart.renderer
                    , v = n.log2lin;
                if (n.isLog && (h = v(h), u = v(u), p = v(p)), l) v = n.getPlotLinePath(p, l), b = {
                    stroke: y
                    , "stroke-width": l
                }, d && (b.dashstyle = d);
                else {
                    if (!f) return;
                    v = n.getPlotBandPath(h, u, o), y && (b.fill = y), o.borderWidth && (b.stroke = o.borderColor, b["stroke-width"] = o.borderWidth)
                }
                if (b.zIndex = m, g) v ? (g.show(), g.animate({
                    d: v
                })) : (g.hide(), a && (e.label = a = a.destroy()));
                else if (v && v.length && (e.svgElem = g = w.path(v).attr(b).add(), x))
                    for (t in o = function (t) {
                            g.on(t, function (n) {
                                x[t].apply(e, [n])
                            })
                        }, x) o(t);
                return s && c(s.text) && v && v.length && n.width > 0 && n.height > 0 && !v.flat ? (s = i({
                    align: r && f && "center"
                    , x: r ? !f && 4 : 10
                    , verticalAlign: !r && f && "middle"
                    , y: r ? f ? 16 : 10 : f ? 6 : -4
                    , rotation: r && !f && 90
                }, s), this.renderLabel(s, v, f, m)) : a && a.hide(), e
            }
            , renderLabel: function (t, e, n, i) {
                var r = this.label
                    , o = this.axis.chart.renderer;
                r || (r = {
                    align: t.textAlign || t.align
                    , rotation: t.rotation
                }, r.zIndex = i, this.label = r = o.text(t.text, 0, 0, t.useHTML).attr(r).css(t.style).add()), i = [e[1], e[4], n ? e[6] : e[1]], e = [e[2], e[5], n ? e[7] : e[2]], n = k(i), o = k(e), r.align(t, !1, {
                    x: n
                    , y: o
                    , width: S(i) - n
                    , height: S(e) - o
                }), r.show()
            }
            , destroy: function () {
                l(this.axis.plotLinesAndBands, this), delete this.axis, T(this)
            }
        };
        var oe = rt.Axis = function () {
            this.init.apply(this, arguments)
        };
        oe.prototype = {
            defaultOptions: {
                dateTimeLabelFormats: {
                    millisecond: "%H:%M:%S.%L"
                    , second: "%H:%M:%S"
                    , minute: "%H:%M"
                    , hour: "%H:%M"
                    , day: "%e. %b"
                    , week: "%e. %b"
                    , month: "%b '%y"
                    , year: "%Y"
                }
                , endOnTick: !1
                , gridLineColor: "#D8D8D8"
                , labels: {
                    enabled: !0
                    , style: {
                        color: "#606060"
                        , cursor: "default"
                        , fontSize: "11px"
                    }
                    , x: 0
                }
                , lineColor: "#C0D0E0"
                , lineWidth: 1
                , minPadding: .01
                , maxPadding: .01
                , minorGridLineColor: "#E0E0E0"
                , minorGridLineWidth: 1
                , minorTickColor: "#A0A0A0"
                , minorTickLength: 2
                , minorTickPosition: "outside"
                , startOfWeek: 1
                , startOnTick: !1
                , tickColor: "#C0D0E0"
                , tickLength: 10
                , tickmarkPlacement: "between"
                , tickPixelInterval: 100
                , tickPosition: "outside"
                , title: {
                    align: "middle"
                    , style: {
                        color: "#707070"
                    }
                }
                , type: "linear"
            }
            , defaultYAxisOptions: {
                endOnTick: !0
                , gridLineWidth: 1
                , tickPixelInterval: 72
                , showLastLabel: !0
                , labels: {
                    x: -8
                }
                , lineWidth: 0
                , maxPadding: .05
                , minPadding: .05
                , startOnTick: !0
                , title: {
                    rotation: 270
                    , text: "Values"
                }
                , stackLabels: {
                    enabled: !1
                    , formatter: function () {
                        return rt.numberFormat(this.total, -1)
                    }
                    , style: i(Qt.line.dataLabels.style, {
                        color: "#000000"
                    })
                }
            }
            , defaultLeftAxisOptions: {
                labels: {
                    x: -15
                }
                , title: {
                    rotation: 270
                }
            }
            , defaultRightAxisOptions: {
                labels: {
                    x: 15
                }
                , title: {
                    rotation: 90
                }
            }
            , defaultBottomAxisOptions: {
                labels: {
                    autoRotation: [-45]
                    , x: 0
                }
                , title: {
                    rotation: 0
                }
            }
            , defaultTopAxisOptions: {
                labels: {
                    autoRotation: [-45]
                    , x: 0
                }
                , title: {
                    rotation: 0
                }
            }
            , init: function (t, e) {
                var n = e.isX;
                this.chart = t, this.horiz = t.inverted ? !n : n, this.coll = (this.isXAxis = n) ? "xAxis" : "yAxis", this.opposite = e.opposite, this.side = e.side || (this.horiz ? this.opposite ? 0 : 2 : this.opposite ? 1 : 3), this.setOptions(e);
                var i = this.options
                    , r = i.type;
                this.labelFormatter = i.labels.formatter || this.defaultLabelFormatter, this.userOptions = e, this.minPixelPadding = 0, this.reversed = i.reversed, this.visible = i.visible !== !1, this.zoomEnabled = i.zoomEnabled !== !1, this.categories = i.categories || "category" === r, this.names = this.names || [], this.isLog = "logarithmic" === r, this.isDatetimeAxis = "datetime" === r, this.isLinked = c(i.linkedTo), this.ticks = {}, this.labelEdge = [], this.minorTicks = {}, this.plotLinesAndBands = [], this.alternateBands = {}, this.len = 0, this.minRange = this.userMinRange = i.minRange || i.maxZoom, this.range = i.range, this.offset = i.offset || 0, this.stacks = {}, this.oldStacks = {}, this.stacksTouched = 0, this.min = this.max = null, this.crosshair = Kt(i.crosshair, h(t.options.tooltip.crosshairs)[n ? 0 : 1], !1);
                var o, i = this.options.events;
                jt(this, t.axes) === -1 && (n && !this.isColorAxis ? t.axes.splice(t.xAxis.length, 0, this) : t.axes.push(this), t[this.coll].push(this)), this.series = this.series || [], t.inverted && n && this.reversed === I && (this.reversed = !0), this.removePlotLine = this.removePlotBand = this.removePlotBandOrLine;
                for (o in i) Xt(this, o, i[o]);
                this.isLog && (this.val2lin = this.log2lin, this.lin2val = this.lin2log)
            }
            , setOptions: function (t) {
                this.options = i(this.defaultOptions, this.isXAxis ? {} : this.defaultYAxisOptions, [this.defaultTopAxisOptions, this.defaultRightAxisOptions, this.defaultBottomAxisOptions, this.defaultLeftAxisOptions][this.side], i(j[this.coll], t))
            }
            , defaultLabelFormatter: function () {
                var t, e = this.axis
                    , n = this.value
                    , i = e.categories
                    , r = this.dateTimeLabelFormat
                    , o = j.lang.numericSymbols
                    , s = o && o.length
                    , a = e.options.labels.format
                    , e = e.isLog ? n : e.tickInterval;
                if (a) t = m(a, this);
                else if (i) t = n;
                else if (r) t = z(r, n);
                else if (s && e >= 1e3)
                    for (; s-- && t === I;) i = Math.pow(1e3, s + 1), e >= i && 10 * n % i === 0 && null !== o[s] && (t = rt.numberFormat(n / i, -1) + o[s]);
                return t === I && (t = ft(n) >= 1e4 ? rt.numberFormat(n, -1) : rt.numberFormat(n, -1, I, "")), t
            }
            , getSeriesExtremes: function () {
                var t = this
                    , e = t.chart;
                t.hasVisibleSeries = !1, t.dataMin = t.dataMax = t.threshold = null, t.softThreshold = !t.isXAxis, t.buildStacks && t.buildStacks(), zt(t.series, function (n) {
                    if (n.visible || !e.options.chart.ignoreHiddenSeries) {
                        var i, r = n.options
                            , o = r.threshold;
                        t.hasVisibleSeries = !0, t.isLog && o <= 0 && (o = null), t.isXAxis ? (r = n.xData, r.length && (n = k(r), !$t(n) && !(n instanceof B) && (r = Ht(r, function (t) {
                            return $t(t)
                        }), n = k(r)), t.dataMin = ht(Kt(t.dataMin, r[0]), n), t.dataMax = ut(Kt(t.dataMax, r[0]), S(r)))) : (n.getExtremes(), i = n.dataMax, n = n.dataMin, c(n) && c(i) && (t.dataMin = ht(Kt(t.dataMin, n), n), t.dataMax = ut(Kt(t.dataMax, i), i)), c(o) && (t.threshold = o), r.softThreshold && !t.isLog || (t.softThreshold = !1))
                    }
                })
            }
            , translate: function (t, e, n, i, r, o) {
                var s = this.linkedParent || this
                    , a = 1
                    , l = 0
                    , c = i ? s.oldTransA : s.transA
                    , i = i ? s.oldMin : s.min
                    , u = s.minPixelPadding
                    , r = (s.isOrdinal || s.isBroken || s.isLog && r) && s.lin2val;
                return c || (c = s.transA), n && (a *= -1, l = s.len), s.reversed && (a *= -1, l -= a * (s.sector || s.len)), e ? (t = t * a + l, t -= u, t = t / c + i, r && (t = s.lin2val(t))) : (r && (t = s.val2lin(t)), "between" === o && (o = .5), t = a * (t - i) * c + l + a * u + ($t(o) ? c * o * s.pointRange : 0)), t
            }
            , toPixels: function (t, e) {
                return this.translate(t, !1, !this.horiz, null, !0) + (e ? 0 : this.pos)
            }
            , toValue: function (t, e) {
                return this.translate(t - (e ? 0 : this.pos), !0, !this.horiz, null, !0)
            }
            , getPlotLinePath: function (t, e, n, i, r) {
                var o, s, a, l = this.chart
                    , c = this.left
                    , u = this.top
                    , h = n && l.oldChartHeight || l.chartHeight
                    , f = n && l.oldChartWidth || l.chartWidth;
                o = this.transB;
                var p = function (t, e, n) {
                        return (t < e || t > n) && (i ? t = ht(ut(e, t), n) : a = !0), t
                    }
                    , r = Kt(r, this.translate(t, null, null, n))
                    , t = n = at(r + o);
                return o = s = at(h - r - o), $t(r) ? this.horiz ? (o = u, s = h - this.bottom, t = n = p(t, c, c + this.width)) : (t = c, n = f - this.right, o = s = p(o, u, u + this.height)) : a = !0, a && !i ? null : l.renderer.crispLine(["M", t, o, "L", n, s], e || 1)
            }
            , getLinearTickPositions: function (t, e, n) {
                var i, r = C(lt(e / t) * t)
                    , o = C(ct(n / t) * t)
                    , s = [];
                if (e === n && $t(e)) return [e];
                for (e = r; e <= o && (s.push(e), e = C(e + t), e !== i);) i = e;
                return s
            }
            , getMinorTickPositions: function () {
                var t, e = this.options
                    , n = this.tickPositions
                    , i = this.minorTickInterval
                    , r = []
                    , o = this.pointRangePadding || 0;
                t = this.min - o;
                var o = this.max + o
                    , s = o - t;
                if (s && s / i < this.len / 3)
                    if (this.isLog)
                        for (o = n.length, t = 1; t < o; t++) r = r.concat(this.getLogTickPositions(i, n[t - 1], n[t], !0));
                    else if (this.isDatetimeAxis && "auto" === e.minorTickInterval) r = r.concat(this.getTimeTicks(this.normalizeTimeTickInterval(i), t, o, e.startOfWeek));
                else
                    for (n = t + (n[0] - t) % i; n <= o; n += i) r.push(n);
                return 0 !== r.length && this.trimTicks(r, e.startOnTick, e.endOnTick), r
            }
            , adjustForMinRange: function () {
                var t, e, n, i, r, o, s, a = this.options
                    , l = this.min
                    , u = this.max
                    , h = this.dataMax - this.dataMin >= this.minRange;
                this.isXAxis && this.minRange === I && !this.isLog && (c(a.min) || c(a.max) ? this.minRange = null : (zt(this.series, function (t) {
                    for (r = t.xData, n = o = t.xIncrement ? 1 : r.length - 1; n > 0; n--) i = r[n] - r[n - 1], (e === I || i < e) && (e = i)
                }), this.minRange = ht(5 * e, this.dataMax - this.dataMin))), u - l < this.minRange && (s = this.minRange, t = (s - u + l) / 2, t = [l - t, Kt(a.min, l - t)], h && (t[2] = this.dataMin), l = S(t), u = [l + s, Kt(a.max, l + s)], h && (u[2] = this.dataMax), u = k(u), u - l < s && (t[0] = u - s, t[1] = Kt(a.min, u - s), l = S(t))), this.min = l, this.max = u
            }
            , getClosest: function () {
                var t;
                return zt(this.series, function (e) {
                    var n = e.closestPointRange;
                    !e.noSharedTooltip && c(n) && (t = c(t) ? ht(t, n) : n)
                }), t
            }
            , setAxisTranslation: function (t) {
                var e, n = this
                    , i = n.max - n.min
                    , r = n.axisPointRange || 0
                    , s = 0
                    , a = 0
                    , l = n.linkedParent
                    , c = !!n.categories
                    , u = n.transA
                    , h = n.isXAxis;
                (h || c || r) && (l ? (s = l.minPointOffset, a = l.pointRangePadding) : (e = n.getClosest(), zt(n.series, function (t) {
                    var i = c ? 1 : h ? Kt(t.options.pointRange, e, 0) : n.axisPointRange || 0
                        , t = t.options.pointPlacement;
                    r = ut(r, i), n.single || (s = ut(s, o(t) ? 0 : i / 2), a = ut(a, "on" === t ? 0 : i))
                })), l = n.ordinalSlope && e ? n.ordinalSlope / e : 1, n.minPointOffset = s *= l, n.pointRangePadding = a *= l, n.pointRange = ht(r, i), h && (n.closestPointRange = e)), t && (n.oldTransA = u), n.translationSlope = n.transA = u = n.len / (i + a || 1), n.transB = n.horiz ? n.left : n.bottom, n.minPixelPadding = u * s
            }
            , minFromRange: function () {
                return this.max - this.range
            }
            , setTickInterval: function (t) {
                var n, i, r, o, s = this
                    , a = s.chart
                    , l = s.options
                    , u = s.isLog
                    , h = s.log2lin
                    , f = s.isDatetimeAxis
                    , p = s.isXAxis
                    , d = s.isLinked
                    , g = l.maxPadding
                    , v = l.minPadding
                    , y = l.tickInterval
                    , m = l.tickPixelInterval
                    , w = s.categories
                    , k = s.threshold
                    , S = s.softThreshold;
                !f && !w && !d && this.getTickAmount(), r = Kt(s.userMin, l.min), o = Kt(s.userMax, l.max), d ? (s.linkedParent = a[s.coll][l.linkedTo], a = s.linkedParent.getExtremes(), s.min = Kt(a.min, a.dataMin), s.max = Kt(a.max, a.dataMax), l.type !== s.linkedParent.options.type && e(11, 1)) : (!S && c(k) && (s.dataMin >= k ? (n = k, v = 0) : s.dataMax <= k && (i = k, g = 0)), s.min = Kt(r, n, s.dataMin), s.max = Kt(o, i, s.dataMax)), u && (!t && ht(s.min, Kt(s.dataMin, s.min)) <= 0 && e(10, 1), s.min = C(h(s.min), 15), s.max = C(h(s.max), 15)), s.range && c(s.max) && (s.userMin = s.min = r = ut(s.min, s.minFromRange()), s.userMax = o = s.max, s.range = null), Yt(s, "foundExtremes"), s.beforePadding && s.beforePadding(), s.adjustForMinRange(), w || s.axisPointRange || s.usePercentage || d || !c(s.min) || !c(s.max) || !(h = s.max - s.min) || (!c(r) && v && (s.min -= h * v), !c(o) && g && (s.max += h * g)), $t(l.floor) && (s.min = ut(s.min, l.floor)), $t(l.ceiling) && (s.max = ht(s.max, l.ceiling)), S && c(s.dataMin) && (k = k || 0, !c(r) && s.min < k && s.dataMin >= k ? s.min = k : !c(o) && s.max > k && s.dataMax <= k && (s.max = k)), s.tickInterval = s.min === s.max || void 0 === s.min || void 0 === s.max ? 1 : d && !y && m === s.linkedParent.options.tickPixelInterval ? y = s.linkedParent.tickInterval : Kt(y, this.tickAmount ? (s.max - s.min) / ut(this.tickAmount - 1, 1) : void 0, w ? 1 : (s.max - s.min) * m / ut(s.len, m)), p && !t && zt(s.series, function (t) {
                    t.processData(s.min !== s.oldMin || s.max !== s.oldMax)
                }), s.setAxisTranslation(!0), s.beforeSetTickPositions && s.beforeSetTickPositions(), s.postProcessTickInterval && (s.tickInterval = s.postProcessTickInterval(s.tickInterval)), s.pointRange && !y && (s.tickInterval = ut(s.pointRange, s.tickInterval)), t = Kt(l.minTickInterval, s.isDatetimeAxis && s.closestPointRange), !y && s.tickInterval < t && (s.tickInterval = t), f || u || y || (s.tickInterval = b(s.tickInterval, null, x(s.tickInterval), Kt(l.allowDecimals, !(s.tickInterval > .5 && s.tickInterval < 5 && s.max > 1e3 && s.max < 9999)), !!this.tickAmount)), !this.tickAmount && this.len && (s.tickInterval = s.unsquish()), this.setTickPositions()
            }
            , setTickPositions: function () {
                var t, e, n = this.options
                    , i = n.tickPositions
                    , r = n.tickPositioner
                    , o = n.startOnTick
                    , s = n.endOnTick;
                this.tickmarkOffset = this.categories && "between" === n.tickmarkPlacement && 1 === this.tickInterval ? .5 : 0, this.minorTickInterval = "auto" === n.minorTickInterval && this.tickInterval ? this.tickInterval / 5 : n.minorTickInterval, this.tickPositions = t = i && i.slice(), !t && (t = this.isDatetimeAxis ? this.getTimeTicks(this.normalizeTimeTickInterval(this.tickInterval, n.units), this.min, this.max, n.startOfWeek, this.ordinalPositions, this.closestPointRange, !0) : this.isLog ? this.getLogTickPositions(this.tickInterval, this.min, this.max) : this.getLinearTickPositions(this.tickInterval, this.min, this.max), t.length > this.len && (t = [t[0], t.pop()]), this.tickPositions = t, r && (r = r.apply(this, [this.min, this.max]))) && (this.tickPositions = t = r), this.isLinked || (this.trimTicks(t, o, s), this.min === this.max && c(this.min) && !this.tickAmount && (e = !0, this.min -= .5, this.max += .5), this.single = e, !i && !r && this.adjustTickAmount())
            }
            , trimTicks: function (t, e, n) {
                var i = t[0]
                    , r = t[t.length - 1]
                    , o = this.minPointOffset || 0;
                if (e) this.min = i;
                else
                    for (; this.min - o > t[0];) t.shift();
                if (n) this.max = r;
                else
                    for (; this.max + o < t[t.length - 1];) t.pop();
                0 === t.length && c(i) && t.push((r + i) / 2)
            }
            , alignToOthers: function () {
                var t, e = {}
                    , n = this.options;
                return this.chart.options.chart.alignTicks !== !1 && n.alignTicks !== !1 && zt(this.chart[this.coll], function (n) {
                    var i = n.options
                        , i = [n.horiz ? i.left : i.top, i.width, i.height, i.pane].join(",");
                    n.series.length && (e[i] ? t = !0 : e[i] = 1)
                }), t
            }
            , getTickAmount: function () {
                var t = this.options
                    , e = t.tickAmount
                    , n = t.tickPixelInterval;
                !c(t.tickInterval) && this.len < n && !this.isRadial && !this.isLog && t.startOnTick && t.endOnTick && (e = 2), !e && this.alignToOthers() && (e = ct(this.len / n) + 1), e < 4 && (this.finalTickAmt = e, e = 5), this.tickAmount = e
            }
            , adjustTickAmount: function () {
                var t = this.tickInterval
                    , e = this.tickPositions
                    , n = this.tickAmount
                    , i = this.finalTickAmt
                    , r = e && e.length;
                if (r < n) {
                    for (; e.length < n;) e.push(C(e[e.length - 1] + t));
                    this.transA *= (r - 1) / (n - 1), this.max = e[e.length - 1]
                }
                else r > n && (this.tickInterval *= 2, this.setTickPositions());
                if (c(i)) {
                    for (t = n = e.length; t--;)(3 === i && t % 2 === 1 || i <= 2 && t > 0 && t < n - 1) && e.splice(t, 1);
                    this.finalTickAmt = I
                }
            }
            , setScale: function () {
                var t, e;
                this.oldMin = this.min, this.oldMax = this.max, this.oldAxisLength = this.len, this.setAxisSize(), e = this.len !== this.oldAxisLength, zt(this.series, function (e) {
                    (e.isDirtyData || e.isDirty || e.xAxis.isDirty) && (t = !0)
                }), e || t || this.isLinked || this.forceRedraw || this.userMin !== this.oldUserMin || this.userMax !== this.oldUserMax || this.alignToOthers() ? (this.resetStacks && this.resetStacks(), this.forceRedraw = !1, this.getSeriesExtremes(), this.setTickInterval(), this.oldUserMin = this.userMin, this.oldUserMax = this.userMax, this.isDirty || (this.isDirty = e || this.min !== this.oldMin || this.max !== this.oldMax)) : this.cleanStacks && this.cleanStacks()
            }
            , setExtremes: function (t, e, n, i, r) {
                var o = this
                    , s = o.chart
                    , n = Kt(n, !0);
                zt(o.series, function (t) {
                    delete t.kdTree
                }), r = Zt(r, {
                    min: t
                    , max: e
                }), Yt(o, "setExtremes", r, function () {
                    o.userMin = t, o.userMax = e, o.eventArgs = r, n && s.redraw(i)
                })
            }
            , zoom: function (t, e) {
                var n = this.dataMin
                    , i = this.dataMax
                    , r = this.options
                    , o = ht(n, Kt(r.min, n))
                    , r = ut(i, Kt(r.max, i));
                return this.allowZoomOutside || (c(n) && t <= o && (t = o), c(i) && e >= r && (e = r)), this.displayBtn = t !== I || e !== I, this.setExtremes(t, e, !1, I, {
                    trigger: "zoom"
                }), !0
            }
            , setAxisSize: function () {
                var t = this.chart
                    , e = this.options
                    , n = e.offsetLeft || 0
                    , i = this.horiz
                    , r = Kt(e.width, t.plotWidth - n + (e.offsetRight || 0))
                    , o = Kt(e.height, t.plotHeight)
                    , s = Kt(e.top, t.plotTop)
                    , e = Kt(e.left, t.plotLeft + n)
                    , n = /%$/;
                n.test(o) && (o = Math.round(parseFloat(o) / 100 * t.plotHeight)), n.test(s) && (s = Math.round(parseFloat(s) / 100 * t.plotHeight + t.plotTop)), this.left = e, this.top = s, this.width = r, this.height = o, this.bottom = t.chartHeight - o - s, this.right = t.chartWidth - r - e, this.len = ut(i ? r : o, 0), this.pos = i ? e : s
            }
            , getExtremes: function () {
                var t = this.isLog
                    , e = this.lin2log;
                return {
                    min: t ? C(e(this.min)) : this.min
                    , max: t ? C(e(this.max)) : this.max
                    , dataMin: this.dataMin
                    , dataMax: this.dataMax
                    , userMin: this.userMin
                    , userMax: this.userMax
                }
            }
            , getThreshold: function (t) {
                var e = this.isLog
                    , n = this.lin2log
                    , i = e ? n(this.min) : this.min
                    , e = e ? n(this.max) : this.max;
                return null === t ? t = e < 0 ? e : i : i > t ? t = i : e < t && (t = e), this.translate(t, 0, 1, 0, 1)
            }
            , autoLabelAlign: function (t) {
                return t = (Kt(t, 0) - 90 * this.side + 720) % 360, t > 15 && t < 165 ? "right" : t > 195 && t < 345 ? "left" : "center"
            }
            , tickSize: function (t) {
                var e = this.options
                    , n = e[t + "Length"]
                    , i = Kt(e[t + "Width"], "tick" === t && this.isXAxis ? 1 : 0);
                if (i && n) return "inside" === e[t + "Position"] && (n = -n), [n, i]
            }
            , labelMetrics: function () {
                return this.chart.renderer.fontMetrics(this.options.labels.style.fontSize, this.ticks[0] && this.ticks[0].label)
            }
            , unsquish: function () {
                var t, e, n, i = this.options.labels
                    , r = this.horiz
                    , o = this.tickInterval
                    , s = o
                    , a = this.len / (((this.categories ? 1 : 0) + this.max - this.min) / o)
                    , l = i.rotation
                    , u = this.labelMetrics()
                    , h = Number.MAX_VALUE
                    , f = function (t) {
                        return t /= a || 1, t = t > 1 ? ct(t) : 1, t * o
                    };
                return r ? (n = !i.staggerLines && !i.step && (c(l) ? [l] : a < Kt(i.autoRotationLimit, 80) && i.autoRotation)) && zt(n, function (n) {
                    var i;
                    (n === l || n && n >= -90 && n <= 90) && (e = f(ft(u.h / dt(vt * n))), i = e + ft(n / 360), i < h && (h = i, t = n, s = e))
                }) : i.step || (s = f(u.h)), this.autoRotation = n, this.labelRotation = Kt(t, l), s
            }
            , getSlotWidth: function () {
                var t = this.chart
                    , e = this.horiz
                    , n = this.options.labels
                    , i = Math.max(this.tickPositions.length - (this.categories ? 0 : 1), 1)
                    , r = t.margin[3];
                return e && (n.step || 0) < 2 && !n.rotation && (this.staggerLines || 1) * t.plotWidth / i || !e && (r && r - t.spacing[3] || .33 * t.chartWidth)
            }
            , renderUnsquish: function () {
                var t, e, n, r = this.chart
                    , s = r.renderer
                    , a = this.tickPositions
                    , l = this.ticks
                    , c = this.options.labels
                    , u = this.horiz
                    , h = this.getSlotWidth()
                    , f = ut(1, at(h - 2 * (c.padding || 5)))
                    , p = {}
                    , d = this.labelMetrics()
                    , g = c.style.textOverflow
                    , v = 0;
                if (o(c.rotation) || (p.rotation = c.rotation || 0), this.autoRotation) zt(a, function (t) {
                    (t = l[t]) && t.labelLength > v && (v = t.labelLength)
                }), v > f && v > d.h ? p.rotation = this.labelRotation : this.labelRotation = 0;
                else if (h && (t = {
                        width: f + "px"
                    }, !g))
                    for (t.textOverflow = "clip", e = a.length; !u && e--;) n = a[e], (f = l[n].label) && ("ellipsis" === f.styles.textOverflow ? f.css({
                        textOverflow: "clip"
                    }) : l[n].labelLength > h && f.css({
                        width: h + "px"
                    }), f.getBBox().height > this.len / a.length - (d.h - d.f) && (f.specCss = {
                        textOverflow: "ellipsis"
                    }));
                p.rotation && (t = {
                    width: (v > .5 * r.chartHeight ? .33 * r.chartHeight : r.chartHeight) + "px"
                }, !g) && (t.textOverflow = "ellipsis"), (this.labelAlign = c.align || this.autoLabelAlign(this.labelRotation)) && (p.align = this.labelAlign), zt(a, function (e) {
                    var n = (e = l[e]) && e.label;
                    n && (n.attr(p), t && n.css(i(t, n.specCss)), delete n.specCss, e.rotation = p.rotation)
                }), this.tickRotCorr = s.rotCorr(d.b, this.labelRotation || 0, 0 !== this.side)
            }
            , hasData: function () {
                return this.hasVisibleSeries || c(this.min) && c(this.max) && !!this.tickPositions
            }
            , getOffset: function () {
                var t, e, n, i, r = this
                    , o = r.chart
                    , s = o.renderer
                    , a = r.options
                    , l = r.tickPositions
                    , u = r.ticks
                    , h = r.horiz
                    , f = r.side
                    , p = o.inverted ? [1, 0, 3, 2][f] : f
                    , d = 0
                    , g = 0
                    , v = a.title
                    , y = a.labels
                    , m = 0
                    , x = r.opposite
                    , b = o.axisOffset
                    , o = o.clipOffset
                    , w = [-1, 1, 1, -1][f]
                    , k = r.axisParent
                    , S = this.tickSize("tick");
                if (t = r.hasData(), r.showAxis = e = t || Kt(a.showEmpty, !0), r.staggerLines = r.horiz && y.staggerLines, r.axisGroup || (r.gridGroup = s.g("grid").attr({
                        zIndex: a.gridZIndex || 1
                    }).add(k), r.axisGroup = s.g("axis").attr({
                        zIndex: a.zIndex || 2
                    }).add(k), r.labelGroup = s.g("axis-labels").attr({
                        zIndex: y.zIndex || 7
                    }).addClass("highcharts-" + r.coll.toLowerCase() + "-labels").add(k)), t || r.isLinked) zt(l, function (t) {
                    u[t] ? u[t].addLabel() : u[t] = new D(r, t)
                }), r.renderUnsquish(), y.reserveSpace !== !1 && (0 === f || 2 === f || {
                    1: "left"
                    , 3: "right"
                }[f] === r.labelAlign || "center" === r.labelAlign) && zt(l, function (t) {
                    m = ut(u[t].getLabelSize(), m)
                }), r.staggerLines && (m *= r.staggerLines, r.labelOffset = m * (r.opposite ? -1 : 1));
                else
                    for (i in u) u[i].destroy(), delete u[i];
                v && v.text && v.enabled !== !1 && (r.axisTitle || ((i = v.textAlign) || (i = (h ? {
                    low: "left"
                    , middle: "center"
                    , high: "right"
                } : {
                    low: x ? "right" : "left"
                    , middle: "center"
                    , high: x ? "left" : "right"
                })[v.align]), r.axisTitle = s.text(v.text, 0, 0, v.useHTML).attr({
                    zIndex: 7
                    , rotation: v.rotation || 0
                    , align: i
                }).addClass("highcharts-" + this.coll.toLowerCase() + "-title").css(v.style).add(r.axisGroup), r.axisTitle.isNew = !0), e && (d = r.axisTitle.getBBox()[h ? "height" : "width"], n = v.offset, g = c(n) ? 0 : Kt(v.margin, h ? 5 : 10)), r.axisTitle[e ? "show" : "hide"](!0)), r.offset = w * Kt(a.offset, b[f]), r.tickRotCorr = r.tickRotCorr || {
                    x: 0
                    , y: 0
                }, s = 0 === f ? -r.labelMetrics().h : 2 === f ? r.tickRotCorr.y : 0, g = Math.abs(m) + g, m && (g -= s, g += w * (h ? Kt(y.y, r.tickRotCorr.y + 8 * w) : y.x)), r.axisTitleMargin = Kt(n, g), b[f] = ut(b[f], r.axisTitleMargin + d + w * r.offset, g, t && l.length && S ? S[0] : 0), a = a.offset ? 0 : 2 * lt(a.lineWidth / 2), o[p] = ut(o[p], a)
            }
            , getLinePath: function (t) {
                var e = this.chart
                    , n = this.opposite
                    , i = this.offset
                    , r = this.horiz
                    , o = this.left + (n ? this.width : 0) + i
                    , i = e.chartHeight - this.bottom - (n ? this.height : 0) + i;
                return n && (t *= -1), e.renderer.crispLine(["M", r ? this.left : o, r ? i : this.top, "L", r ? e.chartWidth - this.right : o, r ? i : e.chartHeight - this.bottom], t)
            }
            , getTitlePosition: function () {
                var t = this.horiz
                    , e = this.left
                    , n = this.top
                    , i = this.len
                    , o = this.options.title
                    , s = t ? e : n
                    , a = this.opposite
                    , l = this.offset
                    , c = o.x || 0
                    , u = o.y || 0
                    , h = r(o.style.fontSize || 12)
                    , i = {
                        low: s + (t ? 0 : i)
                        , middle: s + i / 2
                        , high: s + (t ? i : 0)
                    }[o.align]
                    , e = (t ? n + this.height : e) + (t ? 1 : -1) * (a ? -1 : 1) * this.axisTitleMargin + (2 === this.side ? h : 0);
                return {
                    x: t ? i + c : e + (a ? this.width : 0) + l + c
                    , y: t ? e + u - (a ? this.height : 0) + l : i + u
                }
            }
            , render: function () {
                var t, e, n, i = this
                    , r = i.chart
                    , o = r.renderer
                    , s = i.options
                    , a = i.isLog
                    , l = i.lin2log
                    , c = i.isLinked
                    , u = i.tickPositions
                    , h = i.axisTitle
                    , p = i.ticks
                    , d = i.minorTicks
                    , g = i.alternateBands
                    , v = s.stackLabels
                    , y = s.alternateGridColor
                    , m = i.tickmarkOffset
                    , x = s.lineWidth
                    , b = r.hasRendered && $t(i.oldMin)
                    , w = i.showAxis
                    , k = E(o.globalAnimation);
                i.labelEdge.length = 0, i.overlap = !1, zt([p, d, g], function (t) {
                    for (var e in t) t[e].isActive = !1
                }), (i.hasData() || c) && (i.minorTickInterval && !i.categories && zt(i.getMinorTickPositions(), function (t) {
                    d[t] || (d[t] = new D(i, t, "minor")), b && d[t].isNew && d[t].render(null, !0), d[t].render(null, !1, 1)
                }), u.length && (zt(u, function (t, e) {
                    (!c || t >= i.min && t <= i.max) && (p[t] || (p[t] = new D(i, t)), b && p[t].isNew && p[t].render(e, !0, .1), p[t].render(e))
                }), m && (0 === i.min || i.single)) && (p[-1] || (p[-1] = new D(i, (-1), null, (!0))), p[-1].render(-1)), y && zt(u, function (t, o) {
                    n = u[o + 1] !== I ? u[o + 1] + m : i.max - m, o % 2 === 0 && t < i.max && n <= i.max + (r.polar ? -m : m) && (g[t] || (g[t] = new rt.PlotLineOrBand(i)), e = t + m, g[t].options = {
                        from: a ? l(e) : e
                        , to: a ? l(n) : n
                        , color: y
                    }, g[t].render(), g[t].isActive = !0)
                }), i._addedPlotLB || (zt((s.plotLines || []).concat(s.plotBands || []), function (t) {
                    i.addPlotBandOrLine(t)
                }), i._addedPlotLB = !0)), zt([p, d, g], function (t) {
                    var e, n, i = []
                        , o = k.duration;
                    for (e in t) t[e].isActive || (t[e].render(e, !1, 0), t[e].isActive = !1, i.push(e));
                    f(function () {
                        for (n = i.length; n--;) t[i[n]] && !t[i[n]].isActive && (t[i[n]].destroy(), delete t[i[n]])
                    }, t !== g && r.hasRendered && o ? o : 0)
                }), x && (t = i.getLinePath(x), i.axisLine ? i.axisLine.animate({
                    d: t
                }) : i.axisLine = o.path(t).attr({
                    stroke: s.lineColor
                    , "stroke-width": x
                    , zIndex: 7
                }).add(i.axisGroup), i.axisLine[w ? "show" : "hide"](!0)), h && w && (h[h.isNew ? "attr" : "animate"](i.getTitlePosition()), h.isNew = !1), v && v.enabled && i.renderStackTotals(), i.isDirty = !1
            }
            , redraw: function () {
                this.visible && (this.render(), zt(this.plotLinesAndBands, function (t) {
                    t.render()
                })), zt(this.series, function (t) {
                    t.isDirty = !0
                })
            }
            , destroy: function (t) {
                var e, n = this
                    , i = n.stacks
                    , r = n.plotLinesAndBands;
                t || Gt(n);
                for (e in i) T(i[e]), i[e] = null;
                for (zt([n.ticks, n.minorTicks, n.alternateBands], function (t) {
                        T(t)
                    }), t = r.length; t--;) r[t].destroy();
                zt("stackTotalGroup,axisLine,axisTitle,axisGroup,cross,gridGroup,labelGroup".split(","), function (t) {
                    n[t] && (n[t] = n[t].destroy())
                }), this.cross && this.cross.destroy()
            }
            , drawCrosshair: function (t, e) {
                var n, i, r, o = this.crosshair;
                this.crosshair && (c(e) || !Kt(o.snap, !0)) !== !1 ? (Kt(o.snap, !0) ? c(e) && (n = this.isXAxis ? e.plotX : this.len - e.plotY) : n = this.horiz ? t.chartX - this.pos : this.len - t.chartY + this.pos, n = this.isRadial ? this.getPlotLinePath(this.isXAxis ? e.x : Kt(e.stackY, e.y)) || null : this.getPlotLinePath(null, null, null, null, n) || null, null === n ? this.hideCrosshair() : (i = this.categories && !this.isRadial, r = Kt(o.width, i ? this.transA : 1), this.cross ? this.cross.attr({
                    d: n
                    , visibility: "visible"
                    , "stroke-width": r
                }) : (i = {
                    "pointer-events": "none"
                    , "stroke-width": r
                    , stroke: o.color || (i ? "rgba(155,200,255,0.2)" : "#C0C0C0")
                    , zIndex: Kt(o.zIndex, 2)
                }, o.dashStyle && (i.dashstyle = o.dashStyle), this.cross = this.chart.renderer.path(n).attr(i).add()))) : this.hideCrosshair()
            }
            , hideCrosshair: function () {
                this.cross && this.cross.hide()
            }
        }, Zt(oe.prototype, {
            getPlotBandPath: function (t, e) {
                var n = this.getPlotLinePath(e, null, null, !0)
                    , i = this.getPlotLinePath(t, null, null, !0);
                return i && n ? (i.flat = i.toString() === n.toString(), i.push(n[4], n[5], n[1], n[2])) : i = null, i
            }
            , addPlotBand: function (t) {
                return this.addPlotBandOrLine(t, "plotBands")
            }
            , addPlotLine: function (t) {
                return this.addPlotBandOrLine(t, "plotLines")
            }
            , addPlotBandOrLine: function (t, e) {
                var n = new rt.PlotLineOrBand(this, t).render()
                    , i = this.userOptions;
                return n && (e && (i[e] = i[e] || [], i[e].push(t)), this.plotLinesAndBands.push(n)), n
            }
            , removePlotBandOrLine: function (t) {
                for (var e = this.plotLinesAndBands, n = this.options, i = this.userOptions, r = e.length; r--;) e[r].id === t && e[r].destroy();
                zt([n.plotLines || [], i.plotLines || [], n.plotBands || [], i.plotBands || []], function (e) {
                    for (r = e.length; r--;) e[r].id === t && l(e, e[r])
                })
            }
        }), oe.prototype.getTimeTicks = function (t, e, n, i) {
            var r, o = []
                , s = {}
                , a = j.global.useUTC
                , l = new B(e - y(e))
                , u = t.unitRange
                , h = t.count;
            if (c(e)) {
                l[K](u >= H.second ? 0 : h * lt(l.getMilliseconds() / h)), u >= H.second && l[J](u >= H.minute ? 0 : h * lt(l.getSeconds() / h)), u >= H.minute && l[Q](u >= H.hour ? 0 : h * lt(l[Y]() / h)), u >= H.hour && l[tt](u >= H.day ? 0 : h * lt(l[q]() / h)), u >= H.day && l[et](u >= H.month ? 1 : h * lt(l[U]() / h)), u >= H.month && (l[nt](u >= H.year ? 0 : h * lt(l[Z]() / h)), r = l[$]()), u >= H.year && (r -= r % h, l[it](r)), u === H.week && l[et](l[U]() - l[V]() + Kt(i, 1)), e = 1, (X || G) && (l = l.getTime(), l = new B(l + y(l))), r = l[$]();
                for (var i = l.getTime(), f = l[Z](), p = l[U](), d = !a || !!G, g = (H.day + (a ? y(l) : 6e4 * l.getTimezoneOffset())) % H.day; i < n;) o.push(i), u === H.year ? i = W(r + e * h, 0) : u === H.month ? i = W(r, f + e * h) : !d || u !== H.day && u !== H.week ? i += u * h : i = W(r, f, p + e * h * (u === H.day ? 1 : 7)), e++;
                o.push(i), zt(Ht(o, function (t) {
                    return u <= H.hour && t % H.day === g
                }), function (t) {
                    s[t] = "day"
                })
            }
            return o.info = Zt(t, {
                higherRanks: s
                , totalRange: u * h
            }), o
        }, oe.prototype.normalizeTimeTickInterval = function (t, e) {
            var n, i = e || [["millisecond", [1, 2, 5, 10, 20, 25, 50, 100, 200, 500]], ["second", [1, 2, 5, 10, 15, 30]], ["minute", [1, 2, 5, 10, 15, 30]], ["hour", [1, 2, 3, 4, 6, 8, 12]], ["day", [1, 2]], ["week", [1, 2]], ["month", [1, 2, 3, 4, 6]], ["year", null]]
                , r = i[i.length - 1]
                , o = H[r[0]]
                , s = r[1];
            for (n = 0; n < i.length && (r = i[n], o = H[r[0]], s = r[1], !(i[n + 1] && t <= (o * s[s.length - 1] + H[i[n + 1][0]]) / 2)); n++);
            return o === H.year && t < 5 * o && (s = [1, 2, 5]), i = b(t / o, s, "year" === r[0] ? ut(x(t / o), 1) : 1), {
                unitRange: o
                , count: i
                , unitName: r[0]
            }
        }, oe.prototype.getLogTickPositions = function (t, e, n, i) {
            var r = this.options
                , o = this.len
                , s = this.lin2log
                , a = this.log2lin
                , l = [];
            if (i || (this._minorAutoInterval = null), t >= .5) t = at(t), l = this.getLinearTickPositions(t, e, n);
            else if (t >= .08)
                for (var c, u, h, f, p, o = lt(e), r = t > .3 ? [1, 2, 4] : t > .15 ? [1, 2, 4, 6, 8] : [1, 2, 3, 4, 5, 6, 7, 8, 9]; o < n + 1 && !p; o++)
                    for (u = r.length, c = 0; c < u && !p; c++) h = a(s(o) * r[c]), h > e && (!i || f <= n) && f !== I && l.push(f), f > n && (p = !0), f = h;
            else e = s(e), n = s(n), t = r[i ? "minorTickInterval" : "tickInterval"], t = Kt("auto" === t ? null : t, this._minorAutoInterval, (n - e) * (r.tickPixelInterval / (i ? 5 : 1)) / ((i ? o / this.tickPositions.length : o) || 1)), t = b(t, null, x(t)), l = Wt(this.getLinearTickPositions(t, e, n), a), i || (this._minorAutoInterval = t / 5);
            return i || (this.tickInterval = t), l
        }, oe.prototype.log2lin = function (t) {
            return st.log(t) / st.LN10
        }, oe.prototype.lin2log = function (t) {
            return st.pow(10, t)
        };
        var se = rt.Tooltip = function () {
            this.init.apply(this, arguments)
        };
        se.prototype = {
            init: function (t, e) {
                var n = e.borderWidth
                    , i = e.style
                    , o = r(i.padding);
                this.chart = t, this.options = e, this.crosshairs = [], this.now = {
                    x: 0
                    , y: 0
                }, this.isHidden = !0, this.label = t.renderer.label("", 0, 0, e.shape || "callout", null, null, e.useHTML, null, "tooltip").attr({
                    padding: o
                    , fill: e.backgroundColor
                    , "stroke-width": n
                    , r: e.borderRadius
                    , zIndex: 8
                }).css(i).css({
                    padding: 0
                }).add().attr({
                    y: -9999
                }), Pt || this.label.shadow(e.shadow), this.shared = e.shared
            }
            , destroy: function () {
                this.label && (this.label = this.label.destroy()), clearTimeout(this.hideTimer), clearTimeout(this.tooltipTimeout)
            }
            , move: function (t, e, n, i) {
                var r = this
                    , o = r.now
                    , s = r.options.animation !== !1 && !r.isHidden && (ft(t - o.x) > 1 || ft(e - o.y) > 1)
                    , a = r.followPointer || r.len > 1;
                Zt(o, {
                    x: s ? (2 * o.x + t) / 3 : t
                    , y: s ? (o.y + e) / 2 : e
                    , anchorX: a ? I : s ? (2 * o.anchorX + n) / 3 : n
                    , anchorY: a ? I : s ? (o.anchorY + i) / 2 : i
                }), r.label.attr(o), s && (clearTimeout(this.tooltipTimeout), this.tooltipTimeout = setTimeout(function () {
                    r && r.move(t, e, n, i)
                }, 32))
            }
            , hide: function (t) {
                var e = this;
                clearTimeout(this.hideTimer), t = Kt(t, this.options.hideDelay, 500), this.isHidden || (this.hideTimer = f(function () {
                    e.label[t ? "fadeOut" : "hide"](), e.isHidden = !0
                }, t))
            }
            , getAnchor: function (t, e) {
                var n, i, r, o = this.chart
                    , s = o.inverted
                    , a = o.plotTop
                    , l = o.plotLeft
                    , c = 0
                    , u = 0
                    , t = h(t);
                return n = t[0].tooltipPos, this.followPointer && e && (e.chartX === I && (e = o.pointer.normalize(e)), n = [e.chartX - o.plotLeft, e.chartY - a]), n || (zt(t, function (t) {
                    i = t.series.yAxis, r = t.series.xAxis, c += t.plotX + (!s && r ? r.left - l : 0), u += (t.plotLow ? (t.plotLow + t.plotHigh) / 2 : t.plotY) + (!s && i ? i.top - a : 0)
                }), c /= t.length, u /= t.length, n = [s ? o.plotWidth - u : c, this.shared && !s && t.length > 1 && e ? e.chartY - a : s ? o.plotHeight - c : u]), Wt(n, at)
            }
            , getPosition: function (t, e, n) {
                var i, r = this.chart
                    , o = this.distance
                    , s = {}
                    , a = n.h || 0
                    , l = ["y", r.chartHeight, e, n.plotY + r.plotTop, r.plotTop, r.plotTop + r.plotHeight]
                    , c = ["x", r.chartWidth, t, n.plotX + r.plotLeft, r.plotLeft, r.plotLeft + r.plotWidth]
                    , u = !this.followPointer && Kt(n.ttBelow, !r.inverted == !!n.negative)
                    , h = function (t, e, n, i, r, l) {
                        var c = n < i - o
                            , h = i + o + n < e
                            , f = i - o - n;
                        if (i += o, u && h) s[t] = i;
                        else if (!u && c) s[t] = f;
                        else if (c) s[t] = ht(l - n, f - a < 0 ? f : f - a);
                        else {
                            if (!h) return !1;
                            s[t] = ut(r, i + a + n > e ? i : i + a)
                        }
                    }
                    , f = function (t, e, n, i) {
                        var r;
                        return i < o || i > e - o ? r = !1 : s[t] = i < n / 2 ? 1 : i > e - n / 2 ? e - n - 2 : i - n / 2, r
                    }
                    , p = function (t) {
                        var e = l;
                        l = c, c = e, i = t
                    }
                    , d = function () {
                        h.apply(0, l) !== !1 ? f.apply(0, c) === !1 && !i && (p(!0), d()) : i ? s.x = s.y = 0 : (p(!0), d())
                    };
                return (r.inverted || this.len > 1) && p(), d(), s
            }
            , defaultFormatter: function (t) {
                var e, n = this.points || h(this);
                return e = [t.tooltipFooterHeaderFormatter(n[0])], e = e.concat(t.bodyFormatter(n)), e.push(t.tooltipFooterHeaderFormatter(n[0], !0)), e.join("")
            }
            , refresh: function (t, e) {
                var n, i, r, o, s = this.chart
                    , a = this.label
                    , l = this.options
                    , c = {}
                    , u = [];
                o = l.formatter || this.defaultFormatter;
                var f, c = s.hoverPoints
                    , p = this.shared;
                clearTimeout(this.hideTimer), this.followPointer = h(t)[0].series.tooltipOptions.followPointer, r = this.getAnchor(t, e), n = r[0], i = r[1], !p || t.series && t.series.noSharedTooltip ? c = t.getLabelConfig() : (s.hoverPoints = t, c && zt(c, function (t) {
                    t.setState()
                }), zt(t, function (t) {
                    t.setState("hover"), u.push(t.getLabelConfig())
                }), c = {
                    x: t[0].category
                    , y: t[0].y
                }, c.points = u, this.len = u.length, t = t[0]), o = o.call(c, this), c = t.series, this.distance = Kt(c.tooltipOptions.distance, 16), o === !1 ? this.hide() : (this.isHidden && (Vt(a), a.attr("opacity", 1).show()), a.attr({
                    text: o
                }), f = l.borderColor || t.color || c.color || "#606060", a.attr({
                    stroke: f
                }), this.updatePosition({
                    plotX: n
                    , plotY: i
                    , negative: t.negative
                    , ttBelow: t.ttBelow
                    , h: r[2] || 0
                }), this.isHidden = !1), Yt(s, "tooltipRefresh", {
                    text: o
                    , x: n + s.plotLeft
                    , y: i + s.plotTop
                    , borderColor: f
                })
            }
            , updatePosition: function (t) {
                var e = this.chart
                    , n = this.label
                    , n = (this.options.positioner || this.getPosition).call(this, n.width, n.height, t);
                this.move(at(n.x), at(n.y || 0), t.plotX + e.plotLeft, t.plotY + e.plotTop)
            }
            , getXDateFormat: function (t, e, n) {
                var i, r, o, e = e.dateTimeLabelFormats
                    , s = n && n.closestPointRange
                    , a = {
                        millisecond: 15
                        , second: 12
                        , minute: 9
                        , hour: 6
                        , day: 3
                    }
                    , l = "millisecond";
                if (s) {
                    o = z("%m-%d %H:%M:%S.%L", t.x);
                    for (r in H) {
                        if (s === H.week && +z("%w", t.x) === n.options.startOfWeek && "00:00:00.000" === o.substr(6)) {
                            r = "week";
                            break
                        }
                        if (H[r] > s) {
                            r = l;
                            break
                        }
                        if (a[r] && o.substr(a[r]) !== "01-01 00:00:00.000".substr(a[r])) break;
                        "week" !== r && (l = r)
                    }
                    r && (i = e[r])
                }
                else i = e.day;
                return i || e.year
            }
            , tooltipFooterHeaderFormatter: function (t, e) {
                var n = e ? "footer" : "header"
                    , i = t.series
                    , r = i.tooltipOptions
                    , o = r.xDateFormat
                    , s = i.xAxis
                    , a = s && "datetime" === s.options.type && $t(t.key)
                    , n = r[n + "Format"];
                return a && !o && (o = this.getXDateFormat(t, r, s)), a && o && (n = n.replace("{point.key}", "{point.key:" + o + "}")), m(n, {
                    point: t
                    , series: i
                })
            }
            , bodyFormatter: function (t) {
                return Wt(t, function (t) {
                    var e = t.series.tooltipOptions;
                    return (e.pointFormatter || t.point.tooltipFormatter).call(t.point, e.pointFormat)
                })
            }
        };
        var ae;
        F = ot && ot.documentElement.ontouchstart !== I;
        var le = rt.Pointer = function (t, e) {
            this.init(t, e)
        };
        if (le.prototype = {
                init: function (t, e) {
                    var n, i = e.chart
                        , r = i.events
                        , o = Pt ? "" : i.zoomType
                        , i = t.inverted;
                    this.options = e, this.chart = t, this.zoomX = n = /x/.test(o), this.zoomY = o = /y/.test(o), this.zoomHor = n && !i || o && i, this.zoomVert = o && !i || n && i, this.hasZoom = n || o, this.runChartClick = r && !!r.click, this.pinchDown = [], this.lastValidTouch = {}, rt.Tooltip && e.tooltip.enabled && (t.tooltip = new se(t, e.tooltip), this.followTouchMove = Kt(e.tooltip.followTouchMove, !0)), this.setDOMEvents()
                }
                , normalize: function (e, n) {
                    var i, r, e = e || t.event;
                    return e.target || (e.target = e.srcElement), r = e.touches ? e.touches.length ? e.touches.item(0) : e.changedTouches[0] : e, n || (this.chartPosition = n = Bt(this.chart.container)), r.pageX === I ? (i = ut(e.x, e.clientX - n.left), r = e.y) : (i = r.pageX - n.left, r = r.pageY - n.top), Zt(e, {
                        chartX: at(i)
                        , chartY: at(r)
                    })
                }
                , getCoordinates: function (t) {
                    var e = {
                        xAxis: []
                        , yAxis: []
                    };
                    return zt(this.chart.axes, function (n) {
                        e[n.isXAxis ? "xAxis" : "yAxis"].push({
                            axis: n
                            , value: n.toValue(t[n.horiz ? "chartX" : "chartY"])
                        })
                    }), e
                }
                , runPointActions: function (t) {
                    var e, n, i, r, o = this.chart
                        , s = o.series
                        , a = o.tooltip
                        , l = !!a && a.shared
                        , c = o.hoverPoint
                        , u = o.hoverSeries
                        , h = [Number.MAX_VALUE, Number.MAX_VALUE]
                        , f = []
                        , p = [];
                    if (!l && !u)
                        for (e = 0; e < s.length; e++) !s[e].directTouch && s[e].options.stickyTracking || (s = []);
                    if (u && (l ? u.noSharedTooltip : u.directTouch) && c ? p = [c] : (zt(s, function (e) {
                            n = e.noSharedTooltip && l, i = !l && e.directTouch, e.visible && !n && !i && Kt(e.options.enableMouseTracking, !0) && (r = e.searchPoint(t, !n && 1 === e.kdDimensions)) && f.push(r)
                        }), zt(f, function (t) {
                            t && zt(["dist", "distX"], function (e, n) {
                                if ($t(t[e])) {
                                    var i = t[e] === h[n] && t.series.group.zIndex >= p[n].series.group.zIndex;
                                    (t[e] < h[n] || i) && (h[n] = t[e], p[n] = t)
                                }
                            })
                        })), l)
                        for (e = f.length; e--;)(f[e].clientX !== p[1].clientX || f[e].series.noSharedTooltip) && f.splice(e, 1);
                    p[0] && (p[0] !== this.prevKDPoint || a && a.isHidden) ? l && !p[0].series.noSharedTooltip ? (f.length && a && a.refresh(f, t), zt(f, function (e) {
                        e.onMouseOver(t, e !== (u && u.directTouch && c || p[0]))
                    }), this.prevKDPoint = p[1]) : (a && a.refresh(p[0], t), u && u.directTouch || p[0].onMouseOver(t), this.prevKDPoint = p[0]) : (s = u && u.tooltipOptions.followPointer, a && s && !a.isHidden && (s = a.getAnchor([{}], t), a.updatePosition({
                        plotX: s[0]
                        , plotY: s[1]
                    }))), this._onDocumentMouseMove || (this._onDocumentMouseMove = function (t) {
                        Ot[ae] && Ot[ae].pointer.onDocumentMouseMove(t)
                    }, Xt(ot, "mousemove", this._onDocumentMouseMove)), zt(l ? f : [Kt(c, p[1])], function (e) {
                        zt(o.axes, function (n) {
                            (!e || e.series[n.coll] === n) && n.drawCrosshair(t, e)
                        })
                    })
                }
                , reset: function (t, e) {
                    var n = this.chart
                        , i = n.hoverSeries
                        , r = n.hoverPoint
                        , o = n.hoverPoints
                        , s = n.tooltip
                        , a = s && s.shared ? o : r;
                    t && a && zt(h(a), function (e) {
                        e.series.isCartesian && void 0 === e.plotX && (t = !1)
                    }), t ? s && a && (s.refresh(a), r && (r.setState(r.state, !0), zt(n.axes, function (t) {
                        Kt(t.crosshair && t.crosshair.snap, !0) ? t.drawCrosshair(null, r) : t.hideCrosshair()
                    }))) : (r && r.onMouseOut(), o && zt(o, function (t) {
                        t.setState()
                    }), i && i.onMouseOut(), s && s.hide(e), this._onDocumentMouseMove && (Gt(ot, "mousemove", this._onDocumentMouseMove), this._onDocumentMouseMove = null), zt(n.axes, function (t) {
                        t.hideCrosshair()
                    }), this.hoverX = n.hoverPoints = n.hoverPoint = null)
                }
                , scaleGroups: function (t, e) {
                    var n, i = this.chart;
                    zt(i.series, function (r) {
                        n = t || r.getPlotBox(), r.xAxis && r.xAxis.zoomEnabled && (r.group.attr(n), r.markerGroup && (r.markerGroup.attr(n), r.markerGroup.clip(e ? i.clipRect : null)), r.dataLabelsGroup && r.dataLabelsGroup.attr(n))
                    }), i.clipRect.attr(e || i.clipBox)
                }
                , dragStart: function (t) {
                    var e = this.chart;
                    e.mouseIsDown = t.type, e.cancelClick = !1, e.mouseDownX = this.mouseDownX = t.chartX, e.mouseDownY = this.mouseDownY = t.chartY
                }
                , drag: function (t) {
                    var e, n = this.chart
                        , i = n.options.chart
                        , r = t.chartX
                        , o = t.chartY
                        , s = this.zoomHor
                        , a = this.zoomVert
                        , l = n.plotLeft
                        , c = n.plotTop
                        , u = n.plotWidth
                        , h = n.plotHeight
                        , f = this.selectionMarker
                        , p = this.mouseDownX
                        , d = this.mouseDownY
                        , g = i.panKey && t[i.panKey + "Key"];
                    f && f.touch || (r < l ? r = l : r > l + u && (r = l + u), o < c ? o = c : o > c + h && (o = c + h), this.hasDragged = Math.sqrt(Math.pow(p - r, 2) + Math.pow(d - o, 2)), this.hasDragged > 10 && (e = n.isInsidePlot(p - l, d - c), n.hasCartesianSeries && (this.zoomX || this.zoomY) && e && !g && !f && (this.selectionMarker = f = n.renderer.rect(l, c, s ? 1 : u, a ? 1 : h, 0).attr({
                        fill: i.selectionMarkerFill || "rgba(69,114,167,0.25)"
                        , zIndex: 7
                    }).add()), f && s && (r -= p, f.attr({
                        width: ft(r)
                        , x: (r > 0 ? 0 : r) + p
                    })), f && a && (r = o - d, f.attr({
                        height: ft(r)
                        , y: (r > 0 ? 0 : r) + d
                    })), e && !f && i.panning && n.pan(t, i.panning)))
                }
                , drop: function (t) {
                    var e = this
                        , n = this.chart
                        , i = this.hasPinched;
                    if (this.selectionMarker) {
                        var r, o = {
                                originalEvent: t
                                , xAxis: []
                                , yAxis: []
                            }
                            , s = this.selectionMarker
                            , a = s.attr ? s.attr("x") : s.x
                            , l = s.attr ? s.attr("y") : s.y
                            , u = s.attr ? s.attr("width") : s.width
                            , h = s.attr ? s.attr("height") : s.height;
                        (this.hasDragged || i) && (zt(n.axes, function (n) {
                            if (n.zoomEnabled && c(n.min) && (i || e[{
                                    xAxis: "zoomX"
                                    , yAxis: "zoomY"
                                }[n.coll]])) {
                                var s = n.horiz
                                    , f = "touchend" === t.type ? n.minPixelPadding : 0
                                    , p = n.toValue((s ? a : l) + f)
                                    , s = n.toValue((s ? a + u : l + h) - f);
                                o[n.coll].push({
                                    axis: n
                                    , min: ht(p, s)
                                    , max: ut(p, s)
                                }), r = !0
                            }
                        }), r && Yt(n, "selection", o, function (t) {
                            n.zoom(Zt(t, i ? {
                                animation: !1
                            } : null))
                        })), this.selectionMarker = this.selectionMarker.destroy(), i && this.scaleGroups()
                    }
                    n && (p(n.container, {
                        cursor: n._cursor
                    }), n.cancelClick = this.hasDragged > 10, n.mouseIsDown = this.hasDragged = this.hasPinched = !1, this.pinchDown = [])
                }
                , onContainerMouseDown: function (t) {
                    t = this.normalize(t), t.preventDefault && t.preventDefault(), this.dragStart(t)
                }
                , onDocumentMouseUp: function (t) {
                    Ot[ae] && Ot[ae].pointer.drop(t)
                }
                , onDocumentMouseMove: function (t) {
                    var e = this.chart
                        , n = this.chartPosition
                        , t = this.normalize(t, n);
                    n && !this.inClass(t.target, "highcharts-tracker") && !e.isInsidePlot(t.chartX - e.plotLeft, t.chartY - e.plotTop) && this.reset()
                }
                , onContainerMouseLeave: function (t) {
                    var e = Ot[ae];
                    e && (t.relatedTarget || t.toElement) && (e.pointer.reset(), e.pointer.chartPosition = null)
                }
                , onContainerMouseMove: function (t) {
                    var e = this.chart;
                    c(ae) && Ot[ae] && Ot[ae].mouseIsDown || (ae = e.index), t = this.normalize(t), t.returnValue = !1, "mousedown" === e.mouseIsDown && this.drag(t), (this.inClass(t.target, "highcharts-tracker") || e.isInsidePlot(t.chartX - e.plotLeft, t.chartY - e.plotTop)) && !e.openMenu && this.runPointActions(t)
                }
                , inClass: function (t, e) {
                    for (var n; t;) {
                        if (n = u(t, "class")) {
                            if (n.indexOf(e) !== -1) return !0;
                            if (n.indexOf("highcharts-container") !== -1) return !1
                        }
                        t = t.parentNode
                    }
                }
                , onTrackerMouseOut: function (t) {
                    var e = this.chart.hoverSeries
                        , t = t.relatedTarget || t.toElement;
                    !e || !t || e.options.stickyTracking || this.inClass(t, "highcharts-tooltip") || this.inClass(t, "highcharts-series-" + e.index) || e.onMouseOut()
                }
                , onContainerClick: function (t) {
                    var e = this.chart
                        , n = e.hoverPoint
                        , i = e.plotLeft
                        , r = e.plotTop
                        , t = this.normalize(t);
                    e.cancelClick || (n && this.inClass(t.target, "highcharts-tracker") ? (Yt(n.series, "click", Zt(t, {
                        point: n
                    })), e.hoverPoint && n.firePointEvent("click", t)) : (Zt(t, this.getCoordinates(t)), e.isInsidePlot(t.chartX - i, t.chartY - r) && Yt(e, "click", t)))
                }
                , setDOMEvents: function () {
                    var t = this
                        , e = t.chart.container;
                    e.onmousedown = function (e) {
                        t.onContainerMouseDown(e)
                    }, e.onmousemove = function (e) {
                        t.onContainerMouseMove(e)
                    }, e.onclick = function (e) {
                        t.onContainerClick(e)
                    }, Xt(e, "mouseleave", t.onContainerMouseLeave), 1 === Dt && Xt(ot, "mouseup", t.onDocumentMouseUp), F && (e.ontouchstart = function (e) {
                        t.onContainerTouchStart(e)
                    }, e.ontouchmove = function (e) {
                        t.onContainerTouchMove(e)
                    }, 1 === Dt && Xt(ot, "touchend", t.onDocumentTouchEnd))
                }
                , destroy: function () {
                    var t;
                    Gt(this.chart.container, "mouseleave", this.onContainerMouseLeave), Dt || (Gt(ot, "mouseup", this.onDocumentMouseUp), Gt(ot, "touchend", this.onDocumentTouchEnd)), clearInterval(this.tooltipTimeout);
                    for (t in this) this[t] = null
                }
            }, Zt(rt.Pointer.prototype, {
                pinchTranslate: function (t, e, n, i, r, o) {
                    (this.zoomHor || this.pinchHor) && this.pinchTranslateDirection(!0, t, e, n, i, r, o), (this.zoomVert || this.pinchVert) && this.pinchTranslateDirection(!1, t, e, n, i, r, o)
                }
                , pinchTranslateDirection: function (t, e, n, i, r, o, s, a) {
                    var l, c, u, h = this.chart
                        , f = t ? "x" : "y"
                        , p = t ? "X" : "Y"
                        , d = "chart" + p
                        , g = t ? "width" : "height"
                        , v = h["plot" + (t ? "Left" : "Top")]
                        , y = a || 1
                        , m = h.inverted
                        , x = h.bounds[t ? "h" : "v"]
                        , b = 1 === e.length
                        , w = e[0][d]
                        , k = n[0][d]
                        , S = !b && e[1][d]
                        , T = !b && n[1][d]
                        , n = function () {
                            !b && ft(w - S) > 20 && (y = a || ft(k - T) / ft(w - S)), c = (v - k) / y + w, l = h["plot" + (t ? "Width" : "Height")] / y
                        };
                    n(), e = c, e < x.min ? (e = x.min, u = !0) : e + l > x.max && (e = x.max - l, u = !0), u ? (k -= .8 * (k - s[f][0]), b || (T -= .8 * (T - s[f][1])), n()) : s[f] = [k, T], m || (o[f] = c - v, o[g] = l), o = m ? 1 / y : y, r[g] = l, r[f] = e, i[m ? t ? "scaleY" : "scaleX" : "scale" + p] = y, i["translate" + p] = o * v + (k - o * w)
                }
                , pinch: function (t) {
                    var e = this
                        , n = e.chart
                        , i = e.pinchDown
                        , r = t.touches
                        , o = r.length
                        , s = e.lastValidTouch
                        , a = e.hasZoom
                        , l = e.selectionMarker
                        , c = {}
                        , u = 1 === o && (e.inClass(t.target, "highcharts-tracker") && n.runTrackerClick || e.runChartClick)
                        , h = {};
                    o > 1 && (e.initiated = !0), a && e.initiated && !u && t.preventDefault(), Wt(r, function (t) {
                        return e.normalize(t)
                    }), "touchstart" === t.type ? (zt(r, function (t, e) {
                        i[e] = {
                            chartX: t.chartX
                            , chartY: t.chartY
                        }
                    }), s.x = [i[0].chartX, i[1] && i[1].chartX], s.y = [i[0].chartY, i[1] && i[1].chartY], zt(n.axes, function (t) {
                        if (t.zoomEnabled) {
                            var e = n.bounds[t.horiz ? "h" : "v"]
                                , i = t.minPixelPadding
                                , r = t.toPixels(Kt(t.options.min, t.dataMin))
                                , o = t.toPixels(Kt(t.options.max, t.dataMax))
                                , s = ht(r, o)
                                , r = ut(r, o);
                            e.min = ht(t.pos, s - i), e.max = ut(t.pos + t.len, r + i)
                        }
                    }), e.res = !0) : i.length && (l || (e.selectionMarker = l = Zt({
                        destroy: Lt
                        , touch: !0
                    }, n.plotBox)), e.pinchTranslate(i, r, c, l, h, s), e.hasPinched = a, e.scaleGroups(c, h), !a && e.followTouchMove && 1 === o ? this.runPointActions(e.normalize(t)) : e.res && (e.res = !1, this.reset(!1, 0)))
                }
                , touch: function (t, e) {
                    var n, i = this.chart;
                    ae = i.index, 1 === t.touches.length ? (t = this.normalize(t), i.isInsidePlot(t.chartX - i.plotLeft, t.chartY - i.plotTop) && !i.openMenu ? (e && this.runPointActions(t), "touchmove" === t.type && (i = this.pinchDown, n = !!i[0] && Math.sqrt(Math.pow(i[0].chartX - t.chartX, 2) + Math.pow(i[0].chartY - t.chartY, 2)) >= 4), Kt(n, !0) && this.pinch(t)) : e && this.reset()) : 2 === t.touches.length && this.pinch(t)
                }
                , onContainerTouchStart: function (t) {
                    this.touch(t, !0)
                }
                , onContainerTouchMove: function (t) {
                    this.touch(t)
                }
                , onDocumentTouchEnd: function (t) {
                    Ot[ae] && Ot[ae].pointer.drop(t)
                }
            }), t.PointerEvent || t.MSPointerEvent) {
            var ce = {}
                , ue = !!t.PointerEvent
                , he = function () {
                    var t, e = [];
                    e.item = function (t) {
                        return this[t]
                    };
                    for (t in ce) ce.hasOwnProperty(t) && e.push({
                        pageX: ce[t].pageX
                        , pageY: ce[t].pageY
                        , target: ce[t].target
                    });
                    return e
                }
                , fe = function (t, e, n, i) {
                    "touch" !== t.pointerType && t.pointerType !== t.MSPOINTER_TYPE_TOUCH || !Ot[ae] || (i(t), i = Ot[ae].pointer, i[e]({
                        type: n
                        , target: t.currentTarget
                        , preventDefault: Lt
                        , touches: he()
                    }))
                };
            Zt(le.prototype, {
                onContainerPointerDown: function (t) {
                    fe(t, "onContainerTouchStart", "touchstart", function (t) {
                        ce[t.pointerId] = {
                            pageX: t.pageX
                            , pageY: t.pageY
                            , target: t.currentTarget
                        }
                    })
                }
                , onContainerPointerMove: function (t) {
                    fe(t, "onContainerTouchMove", "touchmove", function (t) {
                        ce[t.pointerId] = {
                            pageX: t.pageX
                            , pageY: t.pageY
                        }, ce[t.pointerId].target || (ce[t.pointerId].target = t.currentTarget)
                    })
                }
                , onDocumentPointerUp: function (t) {
                    fe(t, "onDocumentTouchEnd", "touchend", function (t) {
                        delete ce[t.pointerId]
                    })
                }
                , batchMSEvents: function (t) {
                    t(this.chart.container, ue ? "pointerdown" : "MSPointerDown", this.onContainerPointerDown), t(this.chart.container, ue ? "pointermove" : "MSPointerMove", this.onContainerPointerMove), t(ot, ue ? "pointerup" : "MSPointerUp", this.onDocumentPointerUp)
                }
            }), Jt(le.prototype, "init", function (t, e, n) {
                t.call(this, e, n), this.hasZoom && p(e.container, {
                    "-ms-touch-action": "none"
                    , "touch-action": "none"
                })
            }), Jt(le.prototype, "setDOMEvents", function (t) {
                t.apply(this), (this.hasZoom || this.followTouchMove) && this.batchMSEvents(Xt)
            }), Jt(le.prototype, "destroy", function (t) {
                this.batchMSEvents(Gt), t.call(this)
            })
        }
        var pe = rt.Legend = function (t, e) {
            this.init(t, e)
        };
        pe.prototype = {
            init: function (t, e) {
                var n = this
                    , r = e.itemStyle
                    , o = e.itemMarginTop || 0;
                this.options = e, e.enabled && (n.itemStyle = r, n.itemHiddenStyle = i(r, e.itemHiddenStyle), n.itemMarginTop = o, n.padding = r = Kt(e.padding, 8), n.initialItemX = r, n.initialItemY = r - 5, n.maxItemWidth = 0, n.chart = t, n.itemHeight = 0, n.symbolWidth = Kt(e.symbolWidth, 16), n.pages = [], n.render(), Xt(n.chart, "endResize", function () {
                    n.positionCheckboxes()
                }))
            }
            , colorizeItem: function (t, e) {
                var n, i = this.options
                    , r = t.legendItem
                    , o = t.legendLine
                    , s = t.legendSymbol
                    , a = this.itemHiddenStyle.color
                    , i = e ? i.itemStyle.color : a
                    , l = e ? t.legendColor || t.color || "#CCC" : a
                    , a = t.options && t.options.marker
                    , c = {
                        fill: l
                    };
                if (r && r.css({
                        fill: i
                        , color: i
                    }), o && o.attr({
                        stroke: l
                    }), s) {
                    if (a && s.isMarker)
                        for (n in c.stroke = l, a = t.convertAttribs(a)) r = a[n], r !== I && (c[n] = r);
                    s.attr(c)
                }
            }
            , positionItem: function (t) {
                var e = this.options
                    , n = e.symbolPadding
                    , e = !e.rtl
                    , i = t._legendItemPos
                    , r = i[0]
                    , i = i[1]
                    , o = t.checkbox;
                (t = t.legendGroup) && t.element && t.translate(e ? r : this.legendWidth - r - 2 * n - 4, i), o && (o.x = r, o.y = i)
            }
            , destroyItem: function (t) {
                var e = t.checkbox;
                zt(["legendItem", "legendLine", "legendSymbol", "legendGroup"], function (e) {
                    t[e] && (t[e] = t[e].destroy())
                }), e && A(t.checkbox)
            }
            , destroy: function () {
                var t = this.group
                    , e = this.box;
                e && (this.box = e.destroy()), t && (this.group = t.destroy())
            }
            , positionCheckboxes: function (t) {
                var e, n = this.group.alignAttr
                    , i = this.clipHeight || this.legendHeight
                    , r = this.titleHeight;
                n && (e = n.translateY, zt(this.allItems, function (o) {
                    var s, a = o.checkbox;
                    a && (s = e + r + a.y + (t || 0) + 3, p(a, {
                        left: n.translateX + o.checkboxOffset + a.x - 20 + "px"
                        , top: s + "px"
                        , display: s > e - 6 && s < e + i - 6 ? "" : "none"
                    }))
                }))
            }
            , renderTitle: function () {
                var t = this.padding
                    , e = this.options.title
                    , n = 0;
                e.text && (this.title || (this.title = this.chart.renderer.label(e.text, t - 3, t - 4, null, null, null, null, null, "legend-title").attr({
                    zIndex: 1
                }).css(e.style).add(this.group)), t = this.title.getBBox(), n = t.height, this.offsetWidth = t.width, this.contentGroup.attr({
                    translateY: n
                })), this.titleHeight = n
            }
            , setText: function (t) {
                var e = this.options;
                t.legendItem.attr({
                    text: e.labelFormat ? m(e.labelFormat, t) : e.labelFormatter.call(t)
                })
            }
            , renderItem: function (t) {
                var e = this.chart
                    , n = e.renderer
                    , r = this.options
                    , o = "horizontal" === r.layout
                    , s = this.symbolWidth
                    , a = r.symbolPadding
                    , l = this.itemStyle
                    , c = this.itemHiddenStyle
                    , u = this.padding
                    , h = o ? Kt(r.itemDistance, 20) : 0
                    , f = !r.rtl
                    , p = r.width
                    , d = r.itemMarginBottom || 0
                    , g = this.itemMarginTop
                    , v = this.initialItemX
                    , y = t.legendItem
                    , m = t.series && t.series.drawLegendSymbol ? t.series : t
                    , x = m.options
                    , x = this.createCheckboxForItem && x && x.showCheckbox
                    , b = r.useHTML;
                y || (t.legendGroup = n.g("legend-item").attr({
                    zIndex: 1
                }).add(this.scrollGroup), t.legendItem = y = n.text("", f ? s + a : -a, this.baseline || 0, b).css(i(t.visible ? l : c)).attr({
                    align: f ? "left" : "right"
                    , zIndex: 2
                }).add(t.legendGroup), this.baseline || (this.fontMetrics = n.fontMetrics(l.fontSize, y), this.baseline = this.fontMetrics.f + 3 + g, y.attr("y", this.baseline)), m.drawLegendSymbol(this, t), this.setItemEvents && this.setItemEvents(t, y, b, l, c), x && this.createCheckboxForItem(t)), this.colorizeItem(t, t.visible), this.setText(t), n = y.getBBox(), s = t.checkboxOffset = r.itemWidth || t.legendItemWidth || s + a + n.width + h + (x ? 20 : 0), this.itemHeight = a = at(t.legendItemHeight || n.height), o && this.itemX - v + s > (p || e.chartWidth - 2 * u - v - r.x) && (this.itemX = v, this.itemY += g + this.lastLineHeight + d, this.lastLineHeight = 0), this.maxItemWidth = ut(this.maxItemWidth, s), this.lastItemY = g + this.itemY + d, this.lastLineHeight = ut(a, this.lastLineHeight), t._legendItemPos = [this.itemX, this.itemY], o ? this.itemX += s : (this.itemY += g + a + d, this.lastLineHeight = a), this.offsetWidth = p || ut((o ? this.itemX - v - h : s) + u, this.offsetWidth)
            }
            , getAllItems: function () {
                var t = [];
                return zt(this.chart.series, function (e) {
                    var n = e.options;
                    Kt(n.showInLegend, !c(n.linkedTo) && I, !0) && (t = t.concat(e.legendItems || ("point" === n.legendType ? e.data : e)))
                }), t
            }
            , adjustMargins: function (t, e) {
                var n = this.chart
                    , i = this.options
                    , r = i.align.charAt(0) + i.verticalAlign.charAt(0) + i.layout.charAt(0);
                this.display && !i.floating && zt([/(lth|ct|rth)/, /(rtv|rm|rbv)/, /(rbh|cb|lbh)/, /(lbv|lm|ltv)/], function (o, s) {
                    o.test(r) && !c(t[s]) && (n[Nt[s]] = ut(n[Nt[s]], n.legend[(s + 1) % 2 ? "legendHeight" : "legendWidth"] + [1, -1, -1, 1][s] * i[s % 2 ? "x" : "y"] + Kt(i.margin, 12) + e[s]))
                })
            }
            , render: function () {
                var t, e, n, i, r = this
                    , o = r.chart
                    , s = o.renderer
                    , a = r.group
                    , l = r.box
                    , c = r.options
                    , u = r.padding
                    , h = c.borderWidth
                    , f = c.backgroundColor;
                r.itemX = r.initialItemX, r.itemY = r.initialItemY, r.offsetWidth = 0, r.lastItemY = 0, a || (r.group = a = s.g("legend").attr({
                    zIndex: 7
                }).add(), r.contentGroup = s.g().attr({
                    zIndex: 1
                }).add(a), r.scrollGroup = s.g().add(r.contentGroup)), r.renderTitle(), t = r.getAllItems(), w(t, function (t, e) {
                    return (t.options && t.options.legendIndex || 0) - (e.options && e.options.legendIndex || 0)
                }), c.reversed && t.reverse(), r.allItems = t, r.display = e = !!t.length, r.lastLineHeight = 0, zt(t, function (t) {
                    r.renderItem(t)
                }), n = (c.width || r.offsetWidth) + u, i = r.lastItemY + r.lastLineHeight + r.titleHeight, i = r.handleOverflow(i), i += u, (h || f) && (l ? n > 0 && i > 0 && (l[l.isNew ? "attr" : "animate"](l.crisp({
                    width: n
                    , height: i
                })), l.isNew = !1) : (r.box = l = s.rect(0, 0, n, i, c.borderRadius, h || 0).attr({
                    stroke: c.borderColor
                    , "stroke-width": h || 0
                    , fill: f || "none"
                }).add(a).shadow(c.shadow), l.isNew = !0), l[e ? "show" : "hide"]()), r.legendWidth = n, r.legendHeight = i, zt(t, function (t) {
                    r.positionItem(t)
                }), e && a.align(Zt({
                    width: n
                    , height: i
                }, c), !0, "spacingBox"), o.isResizing || this.positionCheckboxes()
            }
            , handleOverflow: function (t) {
                var e, n, i = this
                    , r = this.chart
                    , o = r.renderer
                    , s = this.options
                    , a = s.y
                    , a = r.spacingBox.height + ("top" === s.verticalAlign ? -a : a) - this.padding
                    , l = s.maxHeight
                    , c = this.clipRect
                    , u = s.navigation
                    , h = Kt(u.animation, !0)
                    , f = u.arrowSize || 12
                    , p = this.nav
                    , d = this.pages
                    , g = this.padding
                    , v = this.allItems
                    , y = function (t) {
                        c.attr({
                            height: t
                        }), i.contentGroup.div && (i.contentGroup.div.style.clip = "rect(" + g + "px,9999px," + (g + t) + "px,0)")
                    };
                return "horizontal" === s.layout && (a /= 2), l && (a = ht(a, l)), d.length = 0, t > a && u.enabled !== !1 ? (this.clipHeight = e = ut(a - 20 - this.titleHeight - g, 0), this.currentPage = Kt(this.currentPage, 1), this.fullHeight = t, zt(v, function (t, i) {
                    var r = t._legendItemPos[1]
                        , o = at(t.legendItem.getBBox().height)
                        , s = d.length;
                    (!s || r - d[s - 1] > e && (n || r) !== d[s - 1]) && (d.push(n || r), s++), i === v.length - 1 && r + o - d[s - 1] > e && d.push(r), r !== n && (n = r)
                }), c || (c = i.clipRect = o.clipRect(0, g, 9999, 0), i.contentGroup.clip(c)), y(e), p || (this.nav = p = o.g().attr({
                    zIndex: 1
                }).add(this.group), this.up = o.symbol("triangle", 0, 0, f, f).on("click", function () {
                    i.scroll(-1, h)
                }).add(p), this.pager = o.text("", 15, 10).css(u.style).add(p), this.down = o.symbol("triangle-down", 0, 0, f, f).on("click", function () {
                    i.scroll(1, h)
                }).add(p)), i.scroll(0), t = a) : p && (y(r.chartHeight), p.hide(), this.scrollGroup.attr({
                    translateY: 1
                }), this.clipHeight = 0), t
            }
            , scroll: function (t, e) {
                var n = this.pages
                    , i = n.length
                    , r = this.currentPage + t
                    , o = this.clipHeight
                    , s = this.options.navigation
                    , a = s.activeColor
                    , s = s.inactiveColor
                    , l = this.pager
                    , c = this.padding;
                r > i && (r = i), r > 0 && (e !== I && P(e, this.chart), this.nav.attr({
                    translateX: c
                    , translateY: o + this.padding + 7 + this.titleHeight
                    , visibility: "visible"
                }), this.up.attr({
                    fill: 1 === r ? s : a
                }).css({
                    cursor: 1 === r ? "default" : "pointer"
                }), l.attr({
                    text: r + "/" + i
                }), this.down.attr({
                    x: 18 + this.pager.getBBox().width
                    , fill: r === i ? s : a
                }).css({
                    cursor: r === i ? "default" : "pointer"
                }), n = -n[r - 1] + this.initialItemY, this.scrollGroup.animate({
                    translateY: n
                }), this.currentPage = r, this.positionCheckboxes(n))
            }
        }, ne = rt.LegendSymbolMixin = {
            drawRectangle: function (t, e) {
                var n = t.options.symbolHeight || t.fontMetrics.f;
                e.legendSymbol = this.chart.renderer.rect(0, t.baseline - n + 1, t.symbolWidth, n, t.options.symbolRadius || 0).attr({
                    zIndex: 3
                }).add(e.legendGroup)
            }
            , drawLineMarker: function (t) {
                var e, n = this.options
                    , i = n.marker
                    , r = t.symbolWidth
                    , o = this.chart.renderer
                    , s = this.legendGroup
                    , t = t.baseline - at(.3 * t.fontMetrics.b);
                n.lineWidth && (e = {
                    "stroke-width": n.lineWidth
                }, n.dashStyle && (e.dashstyle = n.dashStyle), this.legendLine = o.path(["M", 0, t, "L", r, t]).attr(e).add(s)), i && i.enabled !== !1 && (n = i.radius, this.legendSymbol = i = o.symbol(this.symbol, r / 2 - n, t - n, 2 * n, 2 * n, i).add(s), i.isMarker = !0)
            }
        }, (/Trident\/7\.0/.test(yt) || kt) && Jt(pe.prototype, "positionItem", function (t, e) {
            var n = this
                , i = function () {
                    e._legendItemPos && t.call(n, e)
                };
            i(), setTimeout(i)
        });
        var de = rt.Chart = function () {
            this.getArgs.apply(this, arguments)
        };
        rt.chart = function (t, e, n) {
            return new de(t, e, n)
        }, de.prototype = {
            callbacks: []
            , getArgs: function () {
                var t = [].slice.call(arguments);
                (o(t[0]) || t[0].nodeName) && (this.renderTo = t.shift())
                , this.init(t[0], t[1])
            }
            , init: function (t, e) {
                var n, r = t.series;
                t.series = null, n = i(j, t), n.series = t.series = r, this.userOptions = t, r = n.chart, this.margin = this.splashArray("margin", r), this.spacing = this.splashArray("spacing", r);
                var o = r.events;
                this.bounds = {
                    h: {}
                    , v: {}
                }, this.callback = e, this.isResizing = 0, this.options = n, this.axes = [], this.series = [], this.hasCartesianSeries = r.showAxes;
                var s, a = this;
                if (a.index = Ot.length, Ot.push(a), Dt++, r.reflow !== !1 && Xt(a, "load", function () {
                        a.initReflow()
                    }), o)
                    for (s in o) Xt(a, s, o[s]);
                a.xAxis = [], a.yAxis = [], a.animation = !Pt && Kt(r.animation, !0), a.pointCount = a.colorCounter = a.symbolCounter = 0, a.firstRender()
            }
            , initSeries: function (t) {
                var n = this.options.chart;
                return (n = Ft[t.type || n.type || n.defaultSeriesType]) || e(17, !0), n = new n, n.init(this, t), n
            }
            , isInsidePlot: function (t, e, n) {
                var i = n ? e : t
                    , t = n ? t : e;
                return i >= 0 && i <= this.plotWidth && t >= 0 && t <= this.plotHeight
            }
            , redraw: function (t) {
                var e, n, i = this.axes
                    , r = this.series
                    , o = this.pointer
                    , s = this.legend
                    , a = this.isDirtyLegend
                    , l = this.hasCartesianSeries
                    , c = this.isDirtyBox
                    , u = r.length
                    , h = u
                    , f = this.renderer
                    , p = f.isHidden()
                    , d = [];
                for (P(t, this), p && this.cloneRenderTo(), this.layOutTitles(); h--;)
                    if (t = r[h], t.options.stacking && (e = !0, t.isDirty)) {
                        n = !0;
                        break
                    }
                if (n)
                    for (h = u; h--;) t = r[h], t.options.stacking && (t.isDirty = !0);
                zt(r, function (t) {
                    t.isDirty && "point" === t.options.legendType && (t.updateTotals && t.updateTotals(), a = !0), t.isDirtyData && Yt(t, "updatedData")
                }), a && s.options.enabled && (s.render(), this.isDirtyLegend = !1), e && this.getStacks(), l && !this.isResizing && (this.maxTicks = null, zt(i, function (t) {
                    t.setScale()
                })), this.getMargins(), l && (zt(i, function (t) {
                    t.isDirty && (c = !0)
                }), zt(i, function (t) {
                    var n = t.min + "," + t.max;
                    t.extKey !== n && (t.extKey = n, d.push(function () {
                        Yt(t, "afterSetExtremes", Zt(t.eventArgs, t.getExtremes())), delete t.eventArgs
                    })), (c || e) && t.redraw()
                })), c && this.drawChartBox(), zt(r, function (t) {
                    t.isDirty && t.visible && (!t.isCartesian || t.xAxis) && t.redraw()
                }), o && o.reset(!0), f.draw(), Yt(this, "redraw"), p && this.cloneRenderTo(!0), zt(d, function (t) {
                    t.call()
                })
            }
            , get: function (t) {
                var e, n, i = this.axes
                    , r = this.series;
                for (e = 0; e < i.length; e++)
                    if (i[e].options.id === t) return i[e];
                for (e = 0; e < r.length; e++)
                    if (r[e].options.id === t) return r[e];
                for (e = 0; e < r.length; e++)
                    for (n = r[e].points || [], i = 0; i < n.length; i++)
                        if (n[i].id === t) return n[i];
                return null
            }
            , getAxes: function () {
                var t = this
                    , e = this.options
                    , n = e.xAxis = h(e.xAxis || {})
                    , e = e.yAxis = h(e.yAxis || {});
                zt(n, function (t, e) {
                    t.index = e, t.isX = !0
                }), zt(e, function (t, e) {
                    t.index = e
                }), n = n.concat(e), zt(n, function (e) {
                    new oe(t, e)
                })
            }
            , getSelectedPoints: function () {
                var t = [];
                return zt(this.series, function (e) {
                    t = t.concat(Ht(e.points || [], function (t) {
                        return t.selected
                    }))
                }), t
            }
            , getSelectedSeries: function () {
                return Ht(this.series, function (t) {
                    return t.selected
                })
            }
            , setTitle: function (t, e, n) {
                var r, o, s = this
                    , a = s.options;
                o = a.title = i(a.title, t), r = a.subtitle = i(a.subtitle, e), a = r, zt([["title", t, o], ["subtitle", e, a]], function (t) {
                    var e = t[0]
                        , n = s[e]
                        , i = t[1]
                        , t = t[2];
                    n && i && (s[e] = n = n.destroy()), t && t.text && !n && (s[e] = s.renderer.text(t.text, 0, 0, t.useHTML).attr({
                        align: t.align
                        , class: "highcharts-" + e
                        , zIndex: t.zIndex || 4
                    }).css(t.style).add())
                }), s.layOutTitles(n)
            }
            , layOutTitles: function (t) {
                var e = 0
                    , n = this.title
                    , i = this.subtitle
                    , r = this.options
                    , o = r.title
                    , r = r.subtitle
                    , s = this.renderer
                    , a = this.spacingBox;
                !n || (n.css({
                    width: (o.width || a.width + o.widthAdjust) + "px"
                }).align(Zt({
                    y: s.fontMetrics(o.style.fontSize, n).b - 3
                }, o), !1, a), o.floating || o.verticalAlign) || (e = n.getBBox().height), i && (i.css({
                    width: (r.width || a.width + r.widthAdjust) + "px"
                }).align(Zt({
                    y: e + (o.margin - 13) + s.fontMetrics(r.style.fontSize, n).b
                }, r), !1, a), !r.floating && !r.verticalAlign && (e = ct(e + i.getBBox().height))), n = this.titleOffset !== e, this.titleOffset = e, !this.isDirtyBox && n && (this.isDirtyBox = n, this.hasRendered && Kt(t, !0) && this.isDirtyBox && this.redraw())
            }
            , getChartSize: function () {
                var t = this.options.chart
                    , e = t.width
                    , t = t.height
                    , n = this.renderToClone || this.renderTo;
                c(e) || (this.containerWidth = Rt(n, "width")), c(t) || (this.containerHeight = Rt(n, "height")), this.chartWidth = ut(0, e || this.containerWidth || 600), this.chartHeight = ut(0, Kt(t, this.containerHeight > 19 ? this.containerHeight : 400))
            }
            , cloneRenderTo: function (t) {
                var e = this.renderToClone
                    , n = this.container;
                t ? e && (this.renderTo.appendChild(n), A(e), delete this.renderToClone) : (n && n.parentNode === this.renderTo && this.renderTo.removeChild(n), this.renderToClone = e = this.renderTo.cloneNode(0), p(e, {
                    position: "absolute"
                    , top: "-9999px"
                    , display: "block"
                }), e.style.setProperty && e.style.setProperty("display", "block", "important"), ot.body.appendChild(e), n && e.appendChild(n))
            }
            , getContainer: function () {
                var t, n, i, s = this.options
                    , a = s.chart;
                t = this.renderTo;
                var l = "highcharts-" + Mt++;
                t || (this.renderTo = t = a.renderTo), o(t) && (this.renderTo = t = ot.getElementById(t)), t || e(13, !0), n = r(u(t, "data-highcharts-chart")), $t(n) && Ot[n] && Ot[n].hasRendered && Ot[n].destroy(), u(t, "data-highcharts-chart", this.index), t.innerHTML = "", !a.skipClone && !t.offsetWidth && this.cloneRenderTo(), this.getChartSize(), n = this.chartWidth, i = this.chartHeight, this.container = t = d(_t, {
                    className: "highcharts-container" + (a.className ? " " + a.className : "")
                    , id: l
                }, Zt({
                    position: "relative"
                    , overflow: "hidden"
                    , width: n + "px"
                    , height: i + "px"
                    , textAlign: "left"
                    , lineHeight: "normal"
                    , zIndex: 0
                    , "-webkit-tap-highlight-color": "rgba(0,0,0,0)"
                }, a.style), this.renderToClone || t), this._cursor = t.style.cursor, this.renderer = new(rt[a.renderer] || N)(t, n, i, a.style, a.forExport, s.exporting && s.exporting.allowHTML), Pt && this.renderer.create(this, t, n, i), this.renderer.chartIndex = this.index
            }
            , getMargins: function (t) {
                var e = this.spacing
                    , n = this.margin
                    , i = this.titleOffset;
                this.resetMargins(), i && !c(n[0]) && (this.plotTop = ut(this.plotTop, i + this.options.title.margin + e[0])), this.legend.adjustMargins(n, e), this.extraBottomMargin && (this.marginBottom += this.extraBottomMargin), this.extraTopMargin && (this.plotTop += this.extraTopMargin), t || this.getAxisMargins()
            }
            , getAxisMargins: function () {
                var t = this
                    , e = t.axisOffset = [0, 0, 0, 0]
                    , n = t.margin;
                t.hasCartesianSeries && zt(t.axes, function (t) {
                    t.visible && t.getOffset()
                }), zt(Nt, function (i, r) {
                    c(n[r]) || (t[i] += e[r])
                }), t.setChartSize()
            }
            , reflow: function (e) {
                var n = this
                    , i = n.options.chart
                    , r = n.renderTo
                    , o = i.width || Rt(r, "width")
                    , s = i.height || Rt(r, "height")
                    , i = e ? e.target : t;
                n.hasUserSize || n.isPrinting || !o || !s || i !== t && i !== ot || (o === n.containerWidth && s === n.containerHeight || (clearTimeout(n.reflowTimeout), n.reflowTimeout = f(function () {
                    n.container && (n.setSize(o, s, !1), n.hasUserSize = null)
                }, e ? 100 : 0)), n.containerWidth = o, n.containerHeight = s)
            }
            , initReflow: function () {
                var e = this
                    , n = function (t) {
                        e.reflow(t)
                    };
                Xt(t, "resize", n), Xt(e, "destroy", function () {
                    Gt(t, "resize", n)
                })
            }
            , setSize: function (t, e, n) {
                var i, r, o = this
                    , s = o.renderer;
                o.isResizing += 1, P(n, o), o.oldChartHeight = o.chartHeight, o.oldChartWidth = o.chartWidth, c(t) && (o.chartWidth = i = ut(0, at(t)), o.hasUserSize = !!i), c(e) && (o.chartHeight = r = ut(0, at(e))), t = s.globalAnimation, (t ? qt : p)(o.container, {
                    width: i + "px"
                    , height: r + "px"
                }, t), o.setChartSize(!0), s.setSize(i, r, n), o.maxTicks = null, zt(o.axes, function (t) {
                    t.isDirty = !0, t.setScale()
                }), zt(o.series, function (t) {
                    t.isDirty = !0
                }), o.isDirtyLegend = !0, o.isDirtyBox = !0, o.layOutTitles(), o.getMargins(), o.redraw(n), o.oldChartHeight = null, Yt(o, "resize"), f(function () {
                    o && Yt(o, "endResize", null, function () {
                        o.isResizing -= 1
                    })
                }, E(t).duration)
            }
            , setChartSize: function (t) {
                var e, n, i, r, o = this.inverted
                    , s = this.renderer
                    , a = this.chartWidth
                    , l = this.chartHeight
                    , c = this.options.chart
                    , u = this.spacing
                    , h = this.clipOffset;
                this.plotLeft = e = at(this.plotLeft), this.plotTop = n = at(this.plotTop), this.plotWidth = i = ut(0, at(a - e - this.marginRight)), this.plotHeight = r = ut(0, at(l - n - this.marginBottom)), this.plotSizeX = o ? r : i, this.plotSizeY = o ? i : r, this.plotBorderWidth = c.plotBorderWidth || 0, this.spacingBox = s.spacingBox = {
                    x: u[3]
                    , y: u[0]
                    , width: a - u[3] - u[1]
                    , height: l - u[0] - u[2]
                }, this.plotBox = s.plotBox = {
                    x: e
                    , y: n
                    , width: i
                    , height: r
                }, a = 2 * lt(this.plotBorderWidth / 2), o = ct(ut(a, h[3]) / 2), s = ct(ut(a, h[0]) / 2), this.clipBox = {
                    x: o
                    , y: s
                    , width: lt(this.plotSizeX - ut(a, h[1]) / 2 - o)
                    , height: ut(0, lt(this.plotSizeY - ut(a, h[2]) / 2 - s))
                }, t || zt(this.axes, function (t) {
                    t.setAxisSize(), t.setAxisTranslation()
                })
            }
            , resetMargins: function () {
                var t = this;
                zt(Nt, function (e, n) {
                    t[e] = Kt(t.margin[n], t.spacing[n])
                }), t.axisOffset = [0, 0, 0, 0], t.clipOffset = [0, 0, 0, 0]
            }
            , drawChartBox: function () {
                var t, e = this.options.chart
                    , n = this.renderer
                    , i = this.chartWidth
                    , r = this.chartHeight
                    , o = this.chartBackground
                    , s = this.plotBackground
                    , a = this.plotBorder
                    , l = this.plotBGImage
                    , c = e.borderWidth || 0
                    , u = e.backgroundColor
                    , h = e.plotBackgroundColor
                    , f = e.plotBackgroundImage
                    , p = e.plotBorderWidth || 0
                    , d = this.plotLeft
                    , g = this.plotTop
                    , v = this.plotWidth
                    , y = this.plotHeight
                    , m = this.plotBox
                    , x = this.clipRect
                    , b = this.clipBox;
                t = c + (e.shadow ? 8 : 0), (c || u) && (o ? o.animate(o.crisp({
                    width: i - t
                    , height: r - t
                })) : (o = {
                    fill: u || "none"
                }, c && (o.stroke = e.borderColor, o["stroke-width"] = c), this.chartBackground = n.rect(t / 2, t / 2, i - t, r - t, e.borderRadius, c).attr(o).addClass("highcharts-background").add().shadow(e.shadow))), h && (s ? s.animate(m) : this.plotBackground = n.rect(d, g, v, y, 0).attr({
                    fill: h
                }).add().shadow(e.plotShadow)), f && (l ? l.animate(m) : this.plotBGImage = n.image(f, d, g, v, y).add()), x ? x.animate({
                    width: b.width
                    , height: b.height
                }) : this.clipRect = n.clipRect(b), p && (a ? (a.strokeWidth = -p, a.animate(a.crisp({
                    x: d
                    , y: g
                    , width: v
                    , height: y
                }))) : this.plotBorder = n.rect(d, g, v, y, 0, -p).attr({
                    stroke: e.plotBorderColor
                    , "stroke-width": p
                    , fill: "none"
                    , zIndex: 1
                }).add()), this.isDirtyBox = !1
            }
            , propFromSeries: function () {
                var t, e, n, i = this
                    , r = i.options.chart
                    , o = i.options.series;
                zt(["inverted", "angular", "polar"], function (s) {
                    for (t = Ft[r.type || r.defaultSeriesType], n = i[s] || r[s] || t && t.prototype[s], e = o && o.length; !n && e--;)(t = Ft[o[e].type]) && t.prototype[s] && (n = !0);
                    i[s] = n
                })
            }
            , linkSeries: function () {
                var t = this
                    , e = t.series;
                zt(e, function (t) {
                    t.linkedSeries.length = 0
                }), zt(e, function (e) {
                    var n = e.options.linkedTo;
                    o(n) && (n = ":previous" === n ? t.series[e.index - 1] : t.get(n)) && (n.linkedSeries.push(e), e.linkedParent = n, e.visible = Kt(e.options.visible, n.options.visible, e.visible))
                })
            }
            , renderSeries: function () {
                zt(this.series, function (t) {
                    t.translate(), t.render()
                })
            }
            , renderLabels: function () {
                var t = this
                    , e = t.options.labels;
                e.items && zt(e.items, function (n) {
                    var i = Zt(e.style, n.style)
                        , o = r(i.left) + t.plotLeft
                        , s = r(i.top) + t.plotTop + 12;
                    delete i.left, delete i.top, t.renderer.text(n.html, o, s).attr({
                        zIndex: 2
                    }).css(i).add()
                })
            }
            , render: function () {
                var t, e, n, i, r = this.axes
                    , o = this.renderer
                    , s = this.options;
                this.setTitle(), this.legend = new pe(this, s.legend), this.getStacks && this.getStacks(), this.getMargins(!0), this.setChartSize(), t = this.plotWidth, e = this.plotHeight -= 21, zt(r, function (t) {
                    t.setScale()
                }), this.getAxisMargins(), n = t / this.plotWidth > 1.1, i = e / this.plotHeight > 1.05, (n || i) && (this.maxTicks = null, zt(r, function (t) {
                    (t.horiz && n || !t.horiz && i) && t.setTickInterval(!0)
                }), this.getMargins()), this.drawChartBox(), this.hasCartesianSeries && zt(r, function (t) {
                    t.visible && t.render()
                }), this.seriesGroup || (this.seriesGroup = o.g("series-group").attr({
                    zIndex: 3
                }).add()), this.renderSeries(), this.renderLabels(), this.showCredits(s.credits), this.hasRendered = !0
            }
            , showCredits: function (e) {
                e.enabled && !this.credits && (this.credits = this.renderer.text(e.text, 0, 0).on("click", function () {
                    e.href && (t.location.href = e.href)
                }).attr({
                    align: e.position.align
                    , zIndex: 8
                }).css(e.style).add().align(e.position))
            }
            , destroy: function () {
                var t, e = this
                    , n = e.axes
                    , i = e.series
                    , r = e.container
                    , o = r && r.parentNode;
                for (Yt(e, "destroy"), Ot[e.index] = I, Dt--, e.renderTo.removeAttribute("data-highcharts-chart"), Gt(e), t = n.length; t--;) n[t] = n[t].destroy();
                for (t = i.length; t--;) i[t] = i[t].destroy();
                zt("title,subtitle,chartBackground,plotBackground,plotBGImage,plotBorder,seriesGroup,clipRect,credits,pointer,scroller,rangeSelector,legend,resetZoomButton,tooltip,renderer".split(","), function (t) {
                    var n = e[t];
                    n && n.destroy && (e[t] = n.destroy())
                }), r && (r.innerHTML = "", Gt(r), o && A(r));
                for (t in e) delete e[t]
            }
            , isReadyToRender: function () {
                var e = this;
                return !(!At && t == t.top && "complete" !== ot.readyState || Pt && !t.canvg) || (Pt ? re.push(function () {
                    e.firstRender()
                }, e.options.global.canvasToolsURL) : ot.attachEvent("onreadystatechange", function () {
                    ot.detachEvent("onreadystatechange", e.firstRender), "complete" === ot.readyState && e.firstRender()
                }), !1)
            }
            , firstRender: function () {
                var t = this
                    , e = t.options;
                t.isReadyToRender() && (t.getContainer(), Yt(t, "init"), t.resetMargins(), t.setChartSize(), t.propFromSeries(), t.getAxes(), zt(e.series || [], function (e) {
                    t.initSeries(e)
                }), t.linkSeries(), Yt(t, "beforeRender"), rt.Pointer && (t.pointer = new le(t, e)), t.render(), t.renderer.draw(), !t.renderer.imgCount && t.onload && t.onload(), t.cloneRenderTo(!0))
            }
            , onload: function () {
                var t = this;
                zt([this.callback].concat(this.callbacks), function (e) {
                    e && void 0 !== t.index && e.apply(t, [t])
                }), Yt(t, "load"), this.onload = null
            }
            , splashArray: function (t, e) {
                var n = e[t]
                    , n = s(n) ? n : [n, n, n, n];
                return [Kt(e[t + "Top"], n[0]), Kt(e[t + "Right"], n[1]), Kt(e[t + "Bottom"], n[2]), Kt(e[t + "Left"], n[3])]
            }
        };
        var ie = rt.CenteredSeriesMixin = {
                getCenter: function () {
                    var t, e, n = this.options
                        , i = this.chart
                        , r = 2 * (n.slicedOffset || 0)
                        , o = i.plotWidth - 2 * r
                        , i = i.plotHeight - 2 * r
                        , s = n.center
                        , s = [Kt(s[0], "50%"), Kt(s[1], "50%"), n.size || "100%", n.innerSize || 0]
                        , a = ht(o, i);
                    for (t = 0; t < 4; ++t) e = s[t], n = t < 2 || 2 === t && /%$/.test(e), s[t] = (/%$/.test(e) ? [o, i, a, s[2]][t] * parseFloat(e) / 100 : parseFloat(e)) + (n ? r : 0);
                    return s[3] > s[2] && (s[3] = s[2]), s
                }
            }
            , ge = function () {};
        ge.prototype = {
            init: function (t, e, n) {
                return this.series = t, this.color = t.color, this.applyOptions(e, n), this.pointAttr = {}, t.options.colorByPoint && (e = t.options.colors || t.chart.options.colors, this.color = this.color || e[t.colorCounter++], t.colorCounter === e.length) && (t.colorCounter = 0), t.chart.pointCount++, this
            }
            , applyOptions: function (t, e) {
                var n = this.series
                    , i = n.options.pointValKey || n.pointValKey
                    , t = ge.prototype.optionsToObject.call(this, t);
                return Zt(this, t), this.options = this.options ? Zt(this.options, t) : t, i && (this.y = this[i]), this.isNull = null === this.x || null === this.y, void 0 === this.x && n && (this.x = void 0 === e ? n.autoIncrement() : e), this
            }
            , optionsToObject: function (t) {
                var e = {}
                    , n = this.series
                    , i = n.options.keys
                    , r = i || n.pointArrayMap || ["y"]
                    , o = r.length
                    , s = 0
                    , l = 0;
                if ($t(t) || null === t) e[r[0]] = t;
                else if (a(t))
                    for (!i && t.length > o && (n = typeof t[0], "string" === n ? e.name = t[0] : "number" === n && (e.x = t[0]), s++); l < o;) i && void 0 === t[s] || (e[r[l]] = t[s]), s++, l++;
                else "object" == typeof t && (e = t, t.dataLabels && (n._hasPointLabels = !0), t.marker && (n._hasPointMarkers = !0));
                return e
            }
            , destroy: function () {
                var t, e = this.series.chart
                    , n = e.hoverPoints;
                e.pointCount--, n && (this.setState(), l(n, this), !n.length) && (e.hoverPoints = null), this === e.hoverPoint && this.onMouseOut(), (this.graphic || this.dataLabel) && (Gt(this), this.destroyElements()), this.legendItem && e.legend.destroyItem(this);
                for (t in this) this[t] = null
            }
            , destroyElements: function () {
                for (var t, e = ["graphic", "dataLabel", "dataLabelUpper", "connector", "shadowGroup"], n = 6; n--;) t = e[n], this[t] && (this[t] = this[t].destroy())
            }
            , getLabelConfig: function () {
                return {
                    x: this.category
                    , y: this.y
                    , color: this.color
                    , key: this.name || this.category
                    , series: this.series
                    , point: this
                    , percentage: this.percentage
                    , total: this.total || this.stackTotal
                }
            }
            , tooltipFormatter: function (t) {
                var e = this.series
                    , n = e.tooltipOptions
                    , i = Kt(n.valueDecimals, "")
                    , r = n.valuePrefix || ""
                    , o = n.valueSuffix || "";
                return zt(e.pointArrayMap || ["y"], function (e) {
                    e = "{point." + e, (r || o) && (t = t.replace(e + "}", r + e + "}" + o)), t = t.replace(e + "}", e + ":,." + i + "f}")
                }), m(t, {
                    point: this
                    , series: this.series
                })
            }
            , firePointEvent: function (t, e, n) {
                var i = this
                    , r = this.series.options;
                (r.point.events[t] || i.options && i.options.events && i.options.events[t]) && this.importEvents(), "click" === t && r.allowPointSelect && (n = function (t) {
                    i.select && i.select(null, t.ctrlKey || t.metaKey || t.shiftKey)
                }), Yt(this, t, e, n)
            }
            , visible: !0
        };
        var ve = rt.Series = function () {};
        ve.prototype = {
            isCartesian: !0
            , type: "line"
            , pointClass: ge
            , sorted: !0
            , requireSorting: !0
            , pointAttrToOptions: {
                stroke: "lineColor"
                , "stroke-width": "lineWidth"
                , fill: "fillColor"
                , r: "radius"
            }
            , directTouch: !1
            , axisTypes: ["xAxis", "yAxis"]
            , colorCounter: 0
            , parallelArrays: ["x", "y"]
            , init: function (t, e) {
                var n, i, r = this
                    , o = t.series
                    , s = function (t, e) {
                        return Kt(t.options.index, t._i) - Kt(e.options.index, e._i)
                    };
                r.chart = t, r.options = e = r.setOptions(e), r.linkedSeries = [], r.bindAxes(), Zt(r, {
                    name: e.name
                    , state: ""
                    , pointAttr: {}
                    , visible: e.visible !== !1
                    , selected: e.selected === !0
                }), Pt && (e.animation = !1), i = e.events;
                for (n in i) Xt(r, n, i[n]);
                (i && i.click || e.point && e.point.events && e.point.events.click || e.allowPointSelect) && (t.runTrackerClick = !0), r.getColor(), r.getSymbol(), zt(r.parallelArrays, function (t) {
                    r[t + "Data"] = []
                }), r.setData(e.data, !1), r.isCartesian && (t.hasCartesianSeries = !0), o.push(r), r._i = o.length - 1, w(o, s), this.yAxis && w(this.yAxis.series, s), zt(o, function (t, e) {
                    t.index = e, t.name = t.name || "Series " + (e + 1)
                })
            }
            , bindAxes: function () {
                var t, n = this
                    , i = n.options
                    , r = n.chart;
                zt(n.axisTypes || [], function (o) {
                    zt(r[o], function (e) {
                        t = e.options, (i[o] === t.index || i[o] !== I && i[o] === t.id || i[o] === I && 0 === t.index) && (e.series.push(n), n[o] = e, e.isDirty = !0)
                    }), !n[o] && n.optionalAxis !== o && e(18, !0)
                })
            }
            , updateParallelArrays: function (t, e) {
                var n = t.series
                    , i = arguments
                    , r = $t(e) ? function (i) {
                        var r = "y" === i && n.toYData ? n.toYData(t) : t[i];
                        n[i + "Data"][e] = r
                    } : function (t) {
                        Array.prototype[e].apply(n[t + "Data"], Array.prototype.slice.call(i, 2))
                    };
                zt(n.parallelArrays, r)
            }
            , autoIncrement: function () {
                var t, e = this.options
                    , n = this.xIncrement
                    , i = e.pointIntervalUnit
                    , n = Kt(n, e.pointStart, 0);
                return this.pointInterval = t = Kt(this.pointInterval, e.pointInterval, 1), i && (e = new B(n), "day" === i ? e = +e[et](e[U]() + t) : "month" === i ? e = +e[nt](e[Z]() + t) : "year" === i && (e = +e[it](e[$]() + t)), t = e - n), this.xIncrement = n + t, n
            }
            , setOptions: function (t) {
                var e = this.chart
                    , n = e.options.plotOptions
                    , e = e.userOptions || {}
                    , r = e.plotOptions || {}
                    , o = n[this.type];
                return this.userOptions = t, n = i(o, n.series, t), this.tooltipOptions = i(j.tooltip, j.plotOptions[this.type].tooltip, e.tooltip, r.series && r.series.tooltip, r[this.type] && r[this.type].tooltip, t.tooltip), null === o.marker && delete n.marker, this.zoneAxis = n.zoneAxis, t = this.zones = (n.zones || []).slice(), !n.negativeColor && !n.negativeFillColor || n.zones || t.push({
                    value: n[this.zoneAxis + "Threshold"] || n.threshold || 0
                    , color: n.negativeColor
                    , fillColor: n.negativeFillColor
                }), t.length && c(t[t.length - 1].value) && t.push({
                    color: this.color
                    , fillColor: this.fillColor
                }), n
            }
            , getCyclic: function (t, e, n) {
                var i = this.userOptions
                    , r = "_" + t + "Index"
                    , o = t + "Counter";
                e || (c(i[r]) ? e = i[r] : (i[r] = e = this.chart[o] % n.length, this.chart[o] += 1), e = n[e]), this[t] = e
            }
            , getColor: function () {
                this.options.colorByPoint ? this.options.color = null : this.getCyclic("color", this.options.color || Qt[this.type].color, this.chart.options.colors)
            }
            , getSymbol: function () {
                var t = this.options.marker;
                this.getCyclic("symbol", t.symbol, this.chart.options.symbols), /^url/.test(this.symbol) && (t.radius = 0)
            }
            , drawLegendSymbol: ne.drawLineMarker
            , setData: function (t, n, i, r) {
                var s, l = this
                    , u = l.points
                    , h = u && u.length || 0
                    , f = l.options
                    , p = l.chart
                    , d = null
                    , g = l.xAxis
                    , v = g && !!g.categories
                    , y = f.turboThreshold
                    , m = this.xData
                    , x = this.yData
                    , b = (s = l.pointArrayMap) && s.length
                    , t = t || [];
                if (s = t.length, n = Kt(n, !0), r !== !1 && s && h === s && !l.cropped && !l.hasGroupedData && l.visible) zt(t, function (t, e) {
                    u[e].update && t !== f.data[e] && u[e].update(t, !1, null, !1)
                });
                else {
                    if (l.xIncrement = null, l.colorCounter = 0, zt(this.parallelArrays, function (t) {
                            l[t + "Data"].length = 0
                        }), y && s > y) {
                        for (i = 0; null === d && i < s;) d = t[i], i++;
                        if ($t(d)) {
                            for (v = Kt(f.pointStart, 0), d = Kt(f.pointInterval, 1), i = 0; i < s; i++) m[i] = v, x[i] = t[i], v += d;
                            l.xIncrement = v
                        }
                        else if (a(d))
                            if (b)
                                for (i = 0; i < s; i++) d = t[i], m[i] = d[0], x[i] = d.slice(1, b + 1);
                            else
                                for (i = 0; i < s; i++) d = t[i], m[i] = d[0], x[i] = d[1];
                        else e(12)
                    }
                    else
                        for (i = 0; i < s; i++) t[i] !== I && (d = {
                            series: l
                        }, l.pointClass.prototype.applyOptions.apply(d, [t[i]]), l.updateParallelArrays(d, i), v && c(d.name)) && (g.names[d.x] = d.name);
                    for (o(x[0]) && e(14, !0), l.data = [], l.options.data = l.userOptions.data = t, i = h; i--;) u[i] && u[i].destroy && u[i].destroy();
                    g && (g.minRange = g.userMinRange), l.isDirty = l.isDirtyData = p.isDirtyBox = !0, i = !1
                }
                "point" === f.legendType && (this.processData(), this.generatePoints()), n && p.redraw(i)
            }
            , processData: function (t) {
                var n, i = this.xData
                    , r = this.yData
                    , o = i.length;
                n = 0;
                var s, a, l, c = this.xAxis
                    , u = this.options;
                l = u.cropThreshold;
                var h, f, p = this.getExtremesFromAll || u.getExtremesFromAll
                    , d = this.isCartesian
                    , u = c && c.val2lin
                    , g = c && c.isLog;
                if (d && !this.isDirty && !c.isDirty && !this.yAxis.isDirty && !t) return !1;
                for (c && (t = c.getExtremes(), h = t.min, f = t.max), d && this.sorted && !p && (!l || o > l || this.forceCrop) && (i[o - 1] < h || i[0] > f ? (i = [], r = []) : (i[0] < h || i[o - 1] > f) && (n = this.cropData(this.xData, this.yData, h, f), i = n.xData, r = n.yData, n = n.start, s = !0)), l = i.length || 1; --l;) o = g ? u(i[l]) - u(i[l - 1]) : i[l] - i[l - 1], o > 0 && (a === I || o < a) ? a = o : o < 0 && this.requireSorting && e(15);
                this.cropped = s, this.cropStart = n, this.processedXData = i, this.processedYData = r, this.closestPointRange = a
            }
            , cropData: function (t, e, n, i) {
                var r, o = t.length
                    , s = 0
                    , a = o
                    , l = Kt(this.cropShoulder, 1);
                for (r = 0; r < o; r++)
                    if (t[r] >= n) {
                        s = ut(0, r - l);
                        break
                    }
                for (n = r; n < o; n++)
                    if (t[n] > i) {
                        a = n + l;
                        break
                    }
                return {
                    xData: t.slice(s, a)
                    , yData: e.slice(s, a)
                    , start: s
                    , end: a
                }
            }
            , generatePoints: function () {
                var t, e, n, i, r = this.options.data
                    , o = this.data
                    , s = this.processedXData
                    , a = this.processedYData
                    , l = this.pointClass
                    , c = s.length
                    , u = this.cropStart || 0
                    , f = this.hasGroupedData
                    , p = [];
                for (o || f || (o = [], o.length = r.length, o = this.data = o), i = 0; i < c; i++) e = u + i, f ? (p[i] = (new l).init(this, [s[i]].concat(h(a[i]))), p[i].dataGroup = this.groupMap[i]) : (o[e] ? n = o[e] : r[e] !== I && (o[e] = n = (new l).init(this, r[e], s[i])), p[i] = n), p[i].index = e;
                if (o && (c !== (t = o.length) || f))
                    for (i = 0; i < t; i++) i === u && !f && (i += c), o[i] && (o[i].destroyElements(), o[i].plotX = I);
                this.data = o, this.points = p
            }
            , getExtremes: function (t) {
                var e, n = this.yAxis
                    , i = this.processedXData
                    , r = []
                    , o = 0;
                e = this.xAxis.getExtremes();
                var s, a, l, c, u = e.min
                    , h = e.max
                    , t = t || this.stackedYData || this.processedYData || [];
                for (e = t.length, c = 0; c < e; c++)
                    if (a = i[c], l = t[c], s = null !== l && l !== I && (!n.isLog || l.length || l > 0), a = this.getExtremesFromAll || this.options.getExtremesFromAll || this.cropped || (i[c + 1] || a) >= u && (i[c - 1] || a) <= h, s && a)
                        if (s = l.length)
                            for (; s--;) null !== l[s] && (r[o++] = l[s]);
                        else r[o++] = l;
                this.dataMin = k(r), this.dataMax = S(r)
            }
            , translate: function () {
                this.processedXData || this.processData(), this.generatePoints();
                for (var t, n, i, r, o = this.options, s = o.stacking, a = this.xAxis, l = a.categories, u = this.yAxis, h = this.points, f = h.length, p = !!this.modifyValue, d = o.pointPlacement, g = "between" === d || $t(d), v = o.threshold, y = o.startFromThreshold ? v : 0, m = Number.MAX_VALUE, o = 0; o < f; o++) {
                    var x = h[o]
                        , b = x.x
                        , w = x.y;
                    n = x.low;
                    var k = s && u.stacks[(this.negStacks && w < (y ? 0 : v) ? "-" : "") + this.stackKey];
                    u.isLog && null !== w && w <= 0 && (x.y = w = null, e(10)), x.plotX = t = C(ht(ut(-1e5, a.translate(b, 0, 0, 0, 1, d, "flags" === this.type)), 1e5)), s && this.visible && !x.isNull && k && k[b] && (r = this.getStackIndicator(r, b, this.index), k = k[b], w = k.points[r.key], n = w[0], w = w[1], n === y && (n = Kt(v, u.min)), u.isLog && n <= 0 && (n = null), x.total = x.stackTotal = k.total, x.percentage = k.total && x.y / k.total * 100, x.stackY = w, k.setOffset(this.pointXOffset || 0, this.barW || 0)), x.yBottom = c(n) ? u.translate(n, 0, 1, 0, 1) : null, p && (w = this.modifyValue(w, x)), x.plotY = n = "number" == typeof w && w !== 1 / 0 ? ht(ut(-1e5, u.translate(w, 0, 1, 0, 1)), 1e5) : I, x.isInside = n !== I && n >= 0 && n <= u.len && t >= 0 && t <= a.len, x.clientX = g ? a.translate(b, 0, 0, 0, 1) : t, x.negative = x.y < (v || 0), x.category = l && l[x.x] !== I ? l[x.x] : x.x, x.isNull || (void 0 !== i && (m = ht(m, ft(t - i))), i = t)
                }
                this.closestPointRangePx = m
            }
            , getValidPoints: function (t, e) {
                var n = this.chart;
                return Ht(t || this.points || [], function (t) {
                    return !(e && !n.isInsidePlot(t.plotX, t.plotY, n.inverted)) && !t.isNull
                })
            }
            , setClip: function (t) {
                var e = this.chart
                    , n = this.options
                    , i = e.renderer
                    , r = e.inverted
                    , o = this.clipBox
                    , s = o || e.clipBox
                    , a = this.sharedClipKey || ["_sharedClip", t && t.duration, t && t.easing, s.height, n.xAxis, n.yAxis].join(",")
                    , l = e[a]
                    , c = e[a + "m"];
                l || (t && (s.width = 0, e[a + "m"] = c = i.clipRect(-99, r ? -e.plotLeft : -e.plotTop, 99, r ? e.chartWidth : e.chartHeight)), e[a] = l = i.clipRect(s)), t && (l.count += 1), n.clip !== !1 && (this.group.clip(t || o ? l : e.clipRect), this.markerGroup.clip(c), this.sharedClipKey = a), t || (l.count -= 1, l.count <= 0 && a && e[a] && (o || (e[a] = e[a].destroy()), e[a + "m"] && (e[a + "m"] = e[a + "m"].destroy())))
            }
            , animate: function (t) {
                var e, n = this.chart
                    , i = this.options.animation;
                i && !s(i) && (i = Qt[this.type].animation), t ? this.setClip(i) : (e = this.sharedClipKey, (t = n[e]) && t.animate({
                    width: n.plotSizeX
                }, i), n[e + "m"] && n[e + "m"].animate({
                    width: n.plotSizeX + 99
                }, i), this.animate = null)
            }
            , afterAnimate: function () {
                this.setClip(), Yt(this, "afterAnimate")
            }
            , drawPoints: function () {
                var t, e, n, i, r, o, s, a, l, c, u, h, f = this.points
                    , p = this.chart
                    , d = this.options.marker
                    , g = this.pointAttr[""]
                    , v = this.markerGroup
                    , y = Kt(d.enabled, this.xAxis.isRadial, this.closestPointRangePx > 2 * d.radius);
                if (d.enabled !== !1 || this._hasPointMarkers)
                    for (i = f.length; i--;) r = f[i], e = lt(r.plotX), n = r.plotY, l = r.graphic, c = r.marker || {}, u = !!r.marker, t = y && c.enabled === I || c.enabled, h = r.isInside, t && $t(n) && null !== r.y ? (t = r.pointAttr[r.selected ? "select" : ""] || g, o = t.r, s = Kt(c.symbol, this.symbol), a = 0 === s.indexOf("url"), l ? l[h ? "show" : "hide"](!0).attr(t).animate(Zt({
                        x: e - o
                        , y: n - o
                    }, l.symbolName ? {
                        width: 2 * o
                        , height: 2 * o
                    } : {})) : h && (o > 0 || a) && (r.graphic = p.renderer.symbol(s, e - o, n - o, 2 * o, 2 * o, u ? c : d).attr(t).add(v))) : l && (r.graphic = l.destroy())
            }
            , convertAttribs: function (t, e, n, i) {
                var r, o, s = this.pointAttrToOptions
                    , a = {}
                    , t = t || {}
                    , e = e || {}
                    , n = n || {}
                    , i = i || {};
                for (r in s) o = s[r], a[r] = Kt(t[o], e[r], n[r], i[r]);
                return a
            }
            , getAttribs: function () {
                var t, e, n, i = this
                    , r = i.options
                    , o = Qt[i.type].marker ? r.marker : r
                    , s = o.states
                    , a = s.hover
                    , l = i.color
                    , u = i.options.negativeColor
                    , h = {
                        stroke: l
                        , fill: l
                    }
                    , f = i.points || []
                    , p = []
                    , d = i.pointAttrToOptions;
                t = i.hasPointSpecificOptions;
                var g = o.lineColor
                    , v = o.fillColor;
                e = r.turboThreshold;
                var y, m, x = i.zones
                    , b = i.zoneAxis || "y";
                if (r.marker ? (a.radius = a.radius || o.radius + a.radiusPlus, a.lineWidth = a.lineWidth || o.lineWidth + a.lineWidthPlus) : (a.color = a.color || L(a.color || l).brighten(a.brightness).get(), a.negativeColor = a.negativeColor || L(a.negativeColor || u).brighten(a.brightness).get()), p[""] = i.convertAttribs(o, h), zt(["hover", "select"], function (t) {
                        p[t] = i.convertAttribs(s[t], p[""])
                    }), i.pointAttr = p, l = f.length, !e || l < e || t)
                    for (; l--;) {
                        if (e = f[l], (o = e.options && e.options.marker || e.options) && o.enabled === !1 && (o.radius = 0), h = null, x.length) {
                            for (t = 0, h = x[t]; e[b] >= h.value;) h = x[++t];
                            e.color = e.fillColor = h = Kt(h.color, i.color)
                        }
                        if (t = r.colorByPoint || e.color, e.options)
                            for (m in d) c(o[d[m]]) && (t = !0);
                        t ? (o = o || {}, n = [], s = o.states || {}, t = s.hover = s.hover || {}, r.marker && (!e.negative || t.fillColor || a.fillColor) || (t[i.pointAttrToOptions.fill] = t.color || !e.options.color && a[e.negative && u ? "negativeColor" : "color"] || L(e.color).brighten(t.brightness || a.brightness).get()), y = {
                            color: e.color
                        }, v || (y.fillColor = e.color), g || (y.lineColor = e.color), o.hasOwnProperty("color") && !o.color && delete o.color, h && !a.fillColor && (t.fillColor = h), n[""] = i.convertAttribs(Zt(y, o), p[""]), n.hover = i.convertAttribs(s.hover, p.hover, n[""]), n.select = i.convertAttribs(s.select, p.select, n[""])) : n = p, e.pointAttr = n
                    }
            }
            , destroy: function () {
                var t, e, n, i, r = this
                    , o = r.chart
                    , s = /AppleWebKit\/533/.test(yt)
                    , a = r.data || [];
                for (Yt(r, "destroy"), Gt(r), zt(r.axisTypes || [], function (t) {
                        (i = r[t]) && (l(i.series, r), i.isDirty = i.forceRedraw = !0)
                    }), r.legendItem && r.chart.legend.destroyItem(r), t = a.length; t--;)(e = a[t]) && e.destroy && e.destroy();
                r.points = null, clearTimeout(r.animationTimeout);
                for (n in r) r[n] instanceof O && !r[n].survive && (t = s && "group" === n ? "hide" : "destroy", r[n][t]());
                o.hoverSeries === r && (o.hoverSeries = null), l(o.series, r);
                for (n in r) delete r[n]
            }
            , getGraphPath: function (t, e, n) {
                var i, r, o = this
                    , s = o.options
                    , a = s.step
                    , l = []
                    , t = t || o.points;
                return (i = t.reversed) && t.reverse(), (a = {
                    right: 1
                    , center: 2
                }[a] || a && 3) && i && (a = 4 - a), s.connectNulls && !e && !n && (t = this.getValidPoints(t)), zt(t, function (i, u) {
                    var h = i.plotX
                        , f = i.plotY
                        , p = t[u - 1];
                    (i.leftCliff || p && p.rightCliff) && !n && (r = !0), i.isNull && !c(e) && u > 0 ? r = !s.connectNulls : i.isNull && !e ? r = !0 : (0 === u || r ? p = ["M", i.plotX, i.plotY] : o.getPointSpline ? p = o.getPointSpline(t, i, u) : a ? (p = 1 === a ? ["L", p.plotX, f] : 2 === a ? ["L", (p.plotX + h) / 2, p.plotY, "L", (p.plotX + h) / 2, f] : ["L", h, p.plotY], p.push("L", h, f)) : p = ["L", h, f], l.push.apply(l, p), r = !1)
                }), o.graphPath = l
            }
            , drawGraph: function () {
                var t = this
                    , e = this.options
                    , n = [["graph", e.lineColor || this.color, e.dashStyle]]
                    , i = e.lineWidth
                    , r = "square" !== e.linecap
                    , o = (this.gappedPath || this.getGraphPath).call(this)
                    , s = this.fillGraph && this.color || "none";
                zt(this.zones, function (i, r) {
                    n.push(["zoneGraph" + r, i.color || t.color, i.dashStyle || e.dashStyle])
                }), zt(n, function (n, a) {
                    var l = n[0]
                        , c = t[l];
                    c ? c.animate({
                        d: o
                    }) : (i || s) && o.length && (c = {
                        stroke: n[1]
                        , "stroke-width": i
                        , fill: s
                        , zIndex: 1
                    }, n[2] ? c.dashstyle = n[2] : r && (c["stroke-linecap"] = c["stroke-linejoin"] = "round"), t[l] = t.chart.renderer.path(o).attr(c).add(t.group).shadow(a < 2 && e.shadow))
                })
            }
            , applyZones: function () {
                var t, e, n, i, r, o, s, a = this
                    , l = this.chart
                    , c = l.renderer
                    , u = this.zones
                    , h = this.clips || []
                    , f = this.graph
                    , p = this.area
                    , d = ut(l.chartWidth, l.chartHeight)
                    , g = this[(this.zoneAxis || "y") + "Axis"]
                    , v = g.reversed
                    , y = l.inverted
                    , m = g.horiz
                    , x = !1;
                u.length && (f || p) && g.min !== I && (f && f.hide(), p && p.hide(), i = g.getExtremes(), zt(u, function (u, b) {
                    t = v ? m ? l.plotWidth : 0 : m ? 0 : g.toPixels(i.min), t = ht(ut(Kt(e, t), 0), d), e = ht(ut(at(g.toPixels(Kt(u.value, i.max), !0)), 0), d), x && (t = e = g.toPixels(i.max)), r = Math.abs(t - e), o = ht(t, e), s = ut(t, e), g.isXAxis ? (n = {
                        x: y ? s : o
                        , y: 0
                        , width: r
                        , height: d
                    }, m || (n.x = l.plotHeight - n.x)) : (n = {
                        x: 0
                        , y: y ? s : o
                        , width: d
                        , height: r
                    }, m && (n.y = l.plotWidth - n.y)), l.inverted && c.isVML && (n = g.isXAxis ? {
                        x: 0
                        , y: v ? o : s
                        , height: n.width
                        , width: l.chartWidth
                    } : {
                        x: n.y - l.plotLeft - l.spacingBox.x
                        , y: 0
                        , width: n.height
                        , height: l.chartHeight
                    }), h[b] ? h[b].animate(n) : (h[b] = c.clipRect(n), f && a["zoneGraph" + b].clip(h[b]), p && a["zoneArea" + b].clip(h[b])), x = u.value > i.max
                }), this.clips = h)
            }
            , invertGroups: function () {
                function t() {
                    var t = {
                        width: e.yAxis.len
                        , height: e.xAxis.len
                    };
                    zt(["group", "markerGroup"], function (n) {
                        e[n] && e[n].attr(t).invert()
                    })
                }
                var e = this
                    , n = e.chart;
                e.xAxis && (Xt(n, "resize", t), Xt(e, "destroy", function () {
                    Gt(n, "resize", t)
                }), t(), e.invertGroups = t)
            }
            , plotGroup: function (t, e, n, i, r) {
                var o = this[t]
                    , s = !o;
                return s && (this[t] = o = this.chart.renderer.g(e).attr({
                    zIndex: i || .1
                }).add(r), o.addClass("highcharts-series-" + this.index)), o.attr({
                    visibility: n
                })[s ? "attr" : "animate"](this.getPlotBox()), o
            }
            , getPlotBox: function () {
                var t = this.chart
                    , e = this.xAxis
                    , n = this.yAxis;
                return t.inverted && (e = n, n = this.xAxis), {
                    translateX: e ? e.left : t.plotLeft
                    , translateY: n ? n.top : t.plotTop
                    , scaleX: 1
                    , scaleY: 1
                }
            }
            , render: function () {
                var t, e = this
                    , n = e.chart
                    , i = e.options
                    , r = !!e.animate && n.renderer.isSVG && E(i.animation).duration
                    , o = e.visible ? "inherit" : "hidden"
                    , s = i.zIndex
                    , a = e.hasRendered
                    , l = n.seriesGroup;
                t = e.plotGroup("group", "series", o, s, l), e.markerGroup = e.plotGroup("markerGroup", "markers", o, s, l), r && e.animate(!0), e.getAttribs(), t.inverted = !!e.isCartesian && n.inverted, e.drawGraph && (e.drawGraph(), e.applyZones()), zt(e.points, function (t) {
                    t.redraw && t.redraw()
                }), e.drawDataLabels && e.drawDataLabels(), e.visible && e.drawPoints(), e.drawTracker && e.options.enableMouseTracking !== !1 && e.drawTracker(), n.inverted && e.invertGroups(), i.clip !== !1 && !e.sharedClipKey && !a && t.clip(n.clipRect), r && e.animate(), a || (e.animationTimeout = f(function () {
                    e.afterAnimate()
                }, r)), e.isDirty = e.isDirtyData = !1, e.hasRendered = !0
            }
            , redraw: function () {
                var t = this.chart
                    , e = this.isDirty || this.isDirtyData
                    , n = this.group
                    , i = this.xAxis
                    , r = this.yAxis;
                n && (t.inverted && n.attr({
                    width: t.plotWidth
                    , height: t.plotHeight
                }), n.animate({
                    translateX: Kt(i && i.left, t.plotLeft)
                    , translateY: Kt(r && r.top, t.plotTop)
                })), this.translate(), this.render(), e && delete this.kdTree
            }
            , kdDimensions: 1
            , kdAxisArray: ["clientX", "plotY"]
            , searchPoint: function (t, e) {
                var n = this.xAxis
                    , i = this.yAxis
                    , r = this.chart.inverted;
                return this.searchKDTree({
                    clientX: r ? n.len - t.chartY + n.pos : t.chartX - n.pos
                    , plotY: r ? i.len - t.chartX + i.pos : t.chartY - i.pos
                }, e)
            }
            , buildKDTree: function () {
                function t(n, i, r) {
                    var o, s;
                    if (s = n && n.length) return o = e.kdAxisArray[i % r], n.sort(function (t, e) {
                        return t[o] - e[o]
                    }), s = Math.floor(s / 2), {
                        point: n[s]
                        , left: t(n.slice(0, s), i + 1, r)
                        , right: t(n.slice(s + 1), i + 1, r)
                    }
                }
                var e = this
                    , n = e.kdDimensions;
                delete e.kdTree, f(function () {
                    e.kdTree = t(e.getValidPoints(null, !e.directTouch), n, n)
                }, e.options.kdNow ? 0 : 1)
            }
            , searchKDTree: function (t, e) {
                function n(t, e, a, l) {
                    var u, h, f = e.point
                        , p = i.kdAxisArray[a % l]
                        , d = f;
                    return h = c(t[r]) && c(f[r]) ? Math.pow(t[r] - f[r], 2) : null, u = c(t[o]) && c(f[o]) ? Math.pow(t[o] - f[o], 2) : null, u = (h || 0) + (u || 0), f.dist = c(u) ? Math.sqrt(u) : Number.MAX_VALUE, f.distX = c(h) ? Math.sqrt(h) : Number.MAX_VALUE, p = t[p] - f[p], u = p < 0 ? "left" : "right", h = p < 0 ? "right" : "left", e[u] && (u = n(t, e[u], a + 1, l), d = u[s] < d[s] ? u : f), e[h] && Math.sqrt(p * p) < d[s] && (t = n(t, e[h], a + 1, l), d = t[s] < d[s] ? t : d), d
                }
                var i = this
                    , r = this.kdAxisArray[0]
                    , o = this.kdAxisArray[1]
                    , s = e ? "distX" : "dist";
                if (this.kdTree || this.buildKDTree(), this.kdTree) return n(t, this.kdTree, this.kdDimensions, this.kdDimensions)
            }
        }, _.prototype = {
            destroy: function () {
                T(this, this.axis)
            }
            , render: function (t) {
                var e = this.options
                    , n = e.format
                    , n = n ? m(n, this) : e.formatter.call(this);
                this.label ? this.label.attr({
                    text: n
                    , visibility: "hidden"
                }) : this.label = this.axis.chart.renderer.text(n, null, null, e.useHTML).css(e.style).attr({
                    align: this.textAlign
                    , rotation: e.rotation
                    , visibility: "hidden"
                }).add(t)
            }
            , setOffset: function (t, e) {
                var n = this.axis
                    , i = n.chart
                    , r = i.inverted
                    , o = n.reversed
                    , o = this.isNegative && !o || !this.isNegative && o
                    , s = n.translate(n.usePercentage ? 100 : this.total, 0, 0, 0, 1)
                    , n = n.translate(0)
                    , n = ft(s - n)
                    , a = i.xAxis[0].translate(this.x) + t
                    , l = i.plotHeight
                    , o = {
                        x: r ? o ? s : s - n : a
                        , y: r ? l - a - e : o ? l - s - n : l - s
                        , width: r ? n : e
                        , height: r ? e : n
                    };
                (r = this.label) && (r.align(this.alignOptions, null, o), o = r.alignAttr, r[this.options.crop === !1 || i.isInsidePlot(o.x, o.y) ? "show" : "hide"](!0))
            }
        }, de.prototype.getStacks = function () {
            var t = this;
            zt(t.yAxis, function (t) {
                t.stacks && t.hasVisibleSeries && (t.oldStacks = t.stacks)
            }), zt(t.series, function (e) {
                !e.options.stacking || e.visible !== !0 && t.options.chart.ignoreHiddenSeries !== !1 || (e.stackKey = e.type + Kt(e.options.stack, ""))
            })
        }, oe.prototype.buildStacks = function () {
            var t, e, n = this.series
                , i = Kt(this.options.reversedStacks, !0)
                , r = n.length;
            if (!this.isXAxis) {
                for (this.usePercentage = !1, e = r; e--;) n[i ? e : r - e - 1].setStackedPoints();
                for (e = r; e--;) t = n[i ? e : r - e - 1], t.setStackCliffs && t.setStackCliffs();
                if (this.usePercentage)
                    for (e = 0; e < r; e++) n[e].setPercentStacks()
            }
        }, oe.prototype.renderStackTotals = function () {
            var t, e, n = this.chart
                , i = n.renderer
                , r = this.stacks
                , o = this.stackTotalGroup;
            o || (this.stackTotalGroup = o = i.g("stack-labels").attr({
                visibility: "visible"
                , zIndex: 6
            }).add()), o.translate(n.plotLeft, n.plotTop);
            for (t in r)
                for (e in n = r[t]) n[e].render(o)
        }, oe.prototype.resetStacks = function () {
            var t, e, n = this.stacks;
            if (!this.isXAxis)
                for (t in n)
                    for (e in n[t]) n[t][e].touched < this.stacksTouched ? (n[t][e].destroy(), delete n[t][e]) : (n[t][e].total = null, n[t][e].cum = 0)
        }, oe.prototype.cleanStacks = function () {
            var t, e, n;
            if (!this.isXAxis) {
                this.oldStacks && (t = this.stacks = this.oldStacks);
                for (e in t)
                    for (n in t[e]) t[e][n].cum = t[e][n].total
            }
        }, ve.prototype.setStackedPoints = function () {
            if (this.options.stacking && (this.visible === !0 || this.chart.options.chart.ignoreHiddenSeries === !1)) {
                var t, e, n, i, r, o, s, a = this.processedXData
                    , l = this.processedYData
                    , c = []
                    , u = l.length
                    , h = this.options
                    , f = h.threshold
                    , p = h.startFromThreshold ? f : 0
                    , d = h.stack
                    , h = h.stacking
                    , g = this.stackKey
                    , v = "-" + g
                    , y = this.negStacks
                    , m = this.yAxis
                    , x = m.stacks
                    , b = m.oldStacks;
                for (m.stacksTouched += 1, r = 0; r < u; r++) o = a[r], s = l[r], t = this.getStackIndicator(t, o, this.index), i = t.key, n = (e = y && s < (p ? 0 : f)) ? v : g, x[n] || (x[n] = {}), x[n][o] || (b[n] && b[n][o] ? (x[n][o] = b[n][o], x[n][o].total = null) : x[n][o] = new _(m, m.options.stackLabels, e, o, d)), n = x[n][o], null !== s && (n.points[i] = n.points[this.index] = [Kt(n.cum, p)], n.touched = m.stacksTouched, t.index > 0 && this.singleStacks === !1 && (n.points[i][0] = n.points[this.index + "," + o + ",0"][0])), "percent" === h ? (e = e ? g : v, y && x[e] && x[e][o] ? (e = x[e][o], n.total = e.total = ut(e.total, n.total) + ft(s) || 0) : n.total = C(n.total + (ft(s) || 0))) : n.total = C(n.total + (s || 0)), n.cum = Kt(n.cum, p) + (s || 0), null !== s && (n.points[i].push(n.cum), c[r] = n.cum);
                "percent" === h && (m.usePercentage = !0), this.stackedYData = c, m.oldStacks = {}
            }
        }, ve.prototype.setPercentStacks = function () {
            var t, e = this
                , n = e.stackKey
                , i = e.yAxis.stacks
                , r = e.processedXData;
            zt([n, "-" + n], function (n) {
                for (var o, s, a, l = r.length; l--;) s = r[l], t = e.getStackIndicator(t, s, e.index), o = (a = i[n] && i[n][s]) && a.points[t.key], (s = o) && (a = a.total ? 100 / a.total : 0, s[0] = C(s[0] * a), s[1] = C(s[1] * a), e.stackedYData[l] = s[1])
            })
        }, ve.prototype.getStackIndicator = function (t, e, n) {
            return c(t) && t.x === e ? t.index++ : t = {
                x: e
                , index: 0
            }, t.key = [n, e, t.index].join(","), t
        }, Zt(de.prototype, {
            addSeries: function (t, e, n) {
                var i, r = this;
                return t && (e = Kt(e, !0), Yt(r, "addSeries", {
                    options: t
                }, function () {
                    i = r.initSeries(t), r.isDirtyLegend = !0, r.linkSeries(), e && r.redraw(n)
                })), i
            }
            , addAxis: function (t, e, n, r) {
                var o = e ? "xAxis" : "yAxis"
                    , s = this.options
                    , t = i(t, {
                        index: this[o].length
                        , isX: e
                    });
                new oe(this, t), s[o] = h(s[o] || {}), s[o].push(t), Kt(n, !0) && this.redraw(r)
            }
            , showLoading: function (t) {
                var e = this
                    , n = e.options
                    , i = e.loadingDiv
                    , r = n.loading
                    , o = function () {
                        i && p(i, {
                            left: e.plotLeft + "px"
                            , top: e.plotTop + "px"
                            , width: e.plotWidth + "px"
                            , height: e.plotHeight + "px"
                        })
                    };
                i || (e.loadingDiv = i = d(_t, {
                    className: "highcharts-loading"
                }, Zt(r.style, {
                    zIndex: 10
                    , display: "none"
                }), e.container), e.loadingSpan = d("span", null, r.labelStyle, i), Xt(e, "redraw", o)), e.loadingSpan.innerHTML = t || n.lang.loading, e.loadingShown || (p(i, {
                    opacity: 0
                    , display: ""
                }), qt(i, {
                    opacity: r.style.opacity
                }, {
                    duration: r.showDuration || 0
                }), e.loadingShown = !0), o()
            }
            , hideLoading: function () {
                var t = this.options
                    , e = this.loadingDiv;
                e && qt(e, {
                    opacity: 0
                }, {
                    duration: t.loading.hideDuration || 100
                    , complete: function () {
                        p(e, {
                            display: "none"
                        })
                    }
                }), this.loadingShown = !1
            }
        }), Zt(ge.prototype, {
            update: function (t, e, n, i) {
                function r() {
                    l.applyOptions(t), null === l.y && u && (l.graphic = u.destroy()), s(t) && !a(t) && (l.redraw = function () {
                        u && u.element && t && t.marker && t.marker.symbol && (l.graphic = u.destroy()), t && t.dataLabels && l.dataLabel && (l.dataLabel = l.dataLabel.destroy()), l.redraw = null
                    }), o = l.index, c.updateParallelArrays(l, o), p && l.name && (p[l.x] = l.name), f.data[o] = s(f.data[o]) && !a(f.data[o]) ? l.options : t, c.isDirty = c.isDirtyData = !0, !c.fixedBox && c.hasCartesianSeries && (h.isDirtyBox = !0), "point" === f.legendType && (h.isDirtyLegend = !0), e && h.redraw(n)
                }
                var o, l = this
                    , c = l.series
                    , u = l.graphic
                    , h = c.chart
                    , f = c.options
                    , p = c.xAxis && c.xAxis.names
                    , e = Kt(e, !0);
                i === !1 ? r() : l.firePointEvent("update", {
                    options: t
                }, r)
            }
            , remove: function (t, e) {
                this.series.removePoint(jt(this, this.series.data), t, e)
            }
        }), Zt(ve.prototype, {
            addPoint: function (t, e, n, i) {
                var r, o = this
                    , s = o.options
                    , a = o.data
                    , l = o.graph
                    , c = o.area
                    , u = o.chart
                    , h = o.xAxis && o.xAxis.names
                    , f = l && l.shift || 0
                    , p = ["graph", "area"]
                    , l = s.data
                    , d = o.xData;
                if (P(i, u), n) {
                    for (i = o.zones.length; i--;) p.push("zoneGraph" + i, "zoneArea" + i);
                    zt(p, function (t) {
                        o[t] && (o[t].shift = f + (s.step ? 2 : 1))
                    })
                }
                if (c && (c.isArea = !0), e = Kt(e, !0), c = {
                        series: o
                    }, o.pointClass.prototype.applyOptions.apply(c, [t]), p = c.x, i = d.length, o.requireSorting && p < d[i - 1])
                    for (r = !0; i && d[i - 1] > p;) i--;
                o.updateParallelArrays(c, "splice", i, 0, 0), o.updateParallelArrays(c, i), h && c.name && (h[p] = c.name), l.splice(i, 0, t), r && (o.data.splice(i, 0, null), o.processData()), "point" === s.legendType && o.generatePoints(), n && (a[0] && a[0].remove ? a[0].remove(!1) : (a.shift(), o.updateParallelArrays(c, "shift"), l.shift())), o.isDirty = !0, o.isDirtyData = !0, e && (o.getAttribs(), u.redraw())
            }
            , removePoint: function (t, e, n) {
                var i = this
                    , r = i.data
                    , o = r[t]
                    , s = i.points
                    , a = i.chart
                    , l = function () {
                        s && s.length === r.length && s.splice(t, 1), r.splice(t, 1), i.options.data.splice(t, 1), i.updateParallelArrays(o || {
                            series: i
                        }, "splice", t, 1), o && o.destroy(), i.isDirty = !0, i.isDirtyData = !0, e && a.redraw()
                    };
                P(n, a), e = Kt(e, !0), o ? o.firePointEvent("remove", null, l) : l()
            }
            , remove: function (t, e) {
                var n = this
                    , i = n.chart;
                Yt(n, "remove", null, function () {
                    n.destroy(), i.isDirtyLegend = i.isDirtyBox = !0, i.linkSeries(), Kt(t, !0) && i.redraw(e)
                })
            }
            , update: function (t, e) {
                var n, r = this
                    , o = this.chart
                    , s = this.userOptions
                    , a = this.type
                    , l = Ft[a].prototype
                    , c = ["group", "markerGroup", "dataLabelsGroup"];
                (t.type && t.type !== a || void 0 !== t.zIndex) && (c.length = 0), zt(c, function (t) {
                    c[t] = r[t], delete r[t]
                }), t = i(s, {
                    animation: !1
                    , index: this.index
                    , pointStart: this.xData[0]
                }, {
                    data: this.options.data
                }, t), this.remove(!1);
                for (n in l) this[n] = I;
                Zt(this, Ft[t.type || a].prototype), zt(c, function (t) {
                    r[t] = c[t]
                }), this.init(o, t), o.linkSeries(), Kt(e, !0) && o.redraw(!1)
            }
        }), Zt(oe.prototype, {
            update: function (t, e) {
                var n = this.chart
                    , t = n.options[this.coll][this.options.index] = i(this.userOptions, t);
                this.destroy(!0), this._addedPlotLB = this.chart._labelPanes = I, this.init(n, Zt(t, {
                    events: I
                })), n.isDirtyBox = !0, Kt(e, !0) && n.redraw()
            }
            , remove: function (t) {
                for (var e = this.chart, n = this.coll, i = this.series, r = i.length; r--;) i[r] && i[r].remove(!1);
                l(e.axes, this), l(e[n], this), e.options[n].splice(this.options.index, 1), zt(e[n], function (t, e) {
                    t.options.index = e
                }), this.destroy(), e.isDirtyBox = !0, Kt(t, !0) && e.redraw()
            }
            , setTitle: function (t, e) {
                this.update({
                    title: t
                }, e)
            }
            , setCategories: function (t, e) {
                this.update({
                    categories: t
                }, e)
            }
        });
        var ye = g(ve);
        Ft.line = ye, Qt.area = i(te, {
            softThreshold: !1
            , threshold: 0
        });
        var me = g(ve, {
            type: "area"
            , singleStacks: !1
            , getStackPoints: function () {
                var t, e, n, i = []
                    , r = []
                    , o = this.xAxis
                    , s = this.yAxis
                    , a = s.stacks[this.stackKey]
                    , l = {}
                    , c = this.points
                    , u = this.index
                    , h = s.series
                    , f = h.length
                    , p = Kt(s.options.reversedStacks, !0) ? 1 : -1;
                if (this.options.stacking) {
                    for (e = 0; e < c.length; e++) l[c[e].x] = c[e];
                    for (n in a) null !== a[n].total && r.push(n);
                    r.sort(function (t, e) {
                        return t - e
                    }), t = Wt(h, function () {
                        return this.visible
                    }), zt(r, function (n, c) {
                        var h, d, g = 0;
                        if (l[n] && !l[n].isNull) i.push(l[n]), zt([-1, 1], function (i) {
                            var o = 1 === i ? "rightNull" : "leftNull"
                                , s = 0
                                , g = a[r[c + i]];
                            if (g)
                                for (e = u; e >= 0 && e < f;) h = g.points[e], h || (e === u ? l[n][o] = !0 : t[e] && (d = a[n].points[e]) && (s -= d[1] - d[0])), e += p;
                            l[n][1 === i ? "rightCliff" : "leftCliff"] = s
                        });
                        else {
                            for (e = u; e >= 0 && e < f;) {
                                if (h = a[n].points[e]) {
                                    g = h[1];
                                    break
                                }
                                e += p
                            }
                            g = s.toPixels(g, !0), i.push({
                                isNull: !0
                                , plotX: o.toPixels(n, !0)
                                , plotY: g
                                , yBottom: g
                            })
                        }
                    })
                }
                return i
            }
            , getGraphPath: function (t) {
                var e, n, i, r, o = ve.prototype.getGraphPath
                    , s = this.options
                    , a = s.stacking
                    , l = this.yAxis
                    , c = []
                    , u = []
                    , h = this.index
                    , f = l.stacks[this.stackKey]
                    , p = s.threshold
                    , d = l.getThreshold(s.threshold)
                    , s = s.connectNulls || "percent" === a
                    , g = function (e, n, r) {
                        var o, s, g = t[e]
                            , e = a && f[g.x].points[h]
                            , v = g[r + "Null"] || 0
                            , r = g[r + "Cliff"] || 0
                            , g = !0;
                        r || v ? (o = (v ? e[0] : e[1]) + r, s = e[0] + r, g = !!v) : !a && t[n] && t[n].isNull && (o = s = p), void 0 !== o && (u.push({
                            plotX: i
                            , plotY: null === o ? d : l.getThreshold(o)
                            , isNull: g
                        }), c.push({
                            plotX: i
                            , plotY: null === s ? d : l.getThreshold(s)
                        }))
                    }
                    , t = t || this.points;
                for (a && (t = this.getStackPoints()), e = 0; e < t.length; e++) n = t[e].isNull, i = Kt(t[e].rectPlotX, t[e].plotX), r = Kt(t[e].yBottom, d), (!n || s) && (s || g(e, e - 1, "left"), n && !a && s || (u.push(t[e]), c.push({
                    x: e
                    , plotX: i
                    , plotY: r
                })), s || g(e, e + 1, "right"));
                return e = o.call(this, u, !0, !0), c.reversed = !0, n = o.call(this, c, !0, !0), n.length && (n[0] = "L"), e = e.concat(n), o = o.call(this, u, !1, s), this.areaPath = e, o
            }
            , drawGraph: function () {
                this.areaPath = [], ve.prototype.drawGraph.apply(this);
                var t = this
                    , e = this.areaPath
                    , n = this.options
                    , i = [["area", this.color, n.fillColor]];
                zt(this.zones, function (e, r) {
                    i.push(["zoneArea" + r, e.color || t.color, e.fillColor || n.fillColor])
                }), zt(i, function (i) {
                    var r = i[0]
                        , o = t[r];
                    o ? o.animate({
                        d: e
                    }) : (o = {
                        fill: i[2] || i[1]
                        , zIndex: 0
                    }, i[2] || (o["fill-opacity"] = Kt(n.fillOpacity, .75)), t[r] = t.chart.renderer.path(e).attr(o).add(t.group))
                })
            }
            , drawLegendSymbol: ne.drawRectangle
        });
        return Ft.area = me, Qt.spline = i(te), ye = g(ve, {
                type: "spline"
                , getPointSpline: function (t, e, n) {
                    var i, r, o, s, a = e.plotX
                        , l = e.plotY
                        , c = t[n - 1]
                        , n = t[n + 1];
                    if (c && !c.isNull && n && !n.isNull) {
                        t = c.plotY, o = n.plotX;
                        var n = n.plotY
                            , u = 0;
                        i = (1.5 * a + c.plotX) / 2.5, r = (1.5 * l + t) / 2.5, o = (1.5 * a + o) / 2.5, s = (1.5 * l + n) / 2.5, o !== i && (u = (s - r) * (o - a) / (o - i) + l - s), r += u, s += u, r > t && r > l ? (r = ut(t, l), s = 2 * l - r) : r < t && r < l && (r = ht(t, l), s = 2 * l - r), s > n && s > l ? (s = ut(n, l), r = 2 * l - s) : s < n && s < l && (s = ht(n, l), r = 2 * l - s), e.rightContX = o, e.rightContY = s
                    }
                    return e = ["C", Kt(c.rightContX, c.plotX), Kt(c.rightContY, c.plotY), Kt(i, a), Kt(r, l), a, l], c.rightContX = c.rightContY = null, e
                }
            }), Ft.spline = ye, Qt.areaspline = i(Qt.area), me = me.prototype, ye = g(ye, {
                type: "areaspline"
                , getStackPoints: me.getStackPoints
                , getGraphPath: me.getGraphPath
                , setStackCliffs: me.setStackCliffs
                , drawGraph: me.drawGraph
                , drawLegendSymbol: ne.drawRectangle
            }), Ft.areaspline = ye, Qt.column = i(te, {
                borderColor: "#FFFFFF"
                , borderRadius: 0
                , groupPadding: .2
                , marker: null
                , pointPadding: .1
                , minPointLength: 0
                , cropThreshold: 50
                , pointRange: null
                , states: {
                    hover: {
                        brightness: .1
                        , shadow: !1
                        , halo: !1
                    }
                    , select: {
                        color: "#C0C0C0"
                        , borderColor: "#000000"
                        , shadow: !1
                    }
                }
                , dataLabels: {
                    align: null
                    , verticalAlign: null
                    , y: null
                }
                , softThreshold: !1
                , startFromThreshold: !0
                , stickyTracking: !1
                , tooltip: {
                    distance: 6
                }
                , threshold: 0
            }), ye = g(ve, {
                type: "column"
                , pointAttrToOptions: {
                    stroke: "borderColor"
                    , fill: "color"
                    , r: "borderRadius"
                }
                , cropShoulder: 0
                , directTouch: !0
                , trackerGroups: ["group", "dataLabelsGroup"]
                , negStacks: !0
                , init: function () {
                    ve.prototype.init.apply(this, arguments);
                    var t = this
                        , e = t.chart;
                    e.hasRendered && zt(e.series, function (e) {
                        e.type === t.type && (e.isDirty = !0)
                    })
                }
                , getColumnMetrics: function () {
                    var t, e = this
                        , n = e.options
                        , i = e.xAxis
                        , r = e.yAxis
                        , o = i.reversed
                        , s = {}
                        , a = 0;
                    n.grouping === !1 ? a = 1 : zt(e.chart.series, function (n) {
                        var i, o = n.options
                            , l = n.yAxis;
                        n.type === e.type && n.visible && r.len === l.len && r.pos === l.pos && (o.stacking ? (t = n.stackKey, s[t] === I && (s[t] = a++), i = s[t]) : o.grouping !== !1 && (i = a++), n.columnIndex = i)
                    });
                    var l = ht(ft(i.transA) * (i.ordinalSlope || n.pointRange || i.closestPointRange || i.tickInterval || 1), i.len)
                        , c = l * n.groupPadding
                        , u = (l - 2 * c) / a
                        , n = ht(n.maxPointWidth || i.len, Kt(n.pointWidth, u * (1 - 2 * n.pointPadding)));
                    return e.columnMetrics = {
                        width: n
                        , offset: (u - n) / 2 + (c + ((e.columnIndex || 0) + (o ? 1 : 0)) * u - l / 2) * (o ? -1 : 1)
                    }, e.columnMetrics
                }
                , crispCol: function (t, e, n, i) {
                    var r = this.chart
                        , o = this.borderWidth
                        , s = -(o % 2 ? .5 : 0)
                        , o = o % 2 ? .5 : 1;
                    return r.inverted && r.renderer.isVML && (o += 1), n = Math.round(t + n) + s, t = Math.round(t) + s, n -= t, i = Math.round(e + i) + o, s = ft(e) <= .5 && i > .5, e = Math.round(e) + o, i -= e, s && i && (e -= 1, i += 1), {
                        x: t
                        , y: e
                        , width: n
                        , height: i
                    }
                }
                , translate: function () {
                    var t = this
                        , e = t.chart
                        , n = t.options
                        , i = t.borderWidth = Kt(n.borderWidth, t.closestPointRange * t.xAxis.transA < 2 ? 0 : 1)
                        , r = t.yAxis
                        , o = t.translatedThreshold = r.getThreshold(n.threshold)
                        , s = Kt(n.minPointLength, 5)
                        , a = t.getColumnMetrics()
                        , l = a.width
                        , c = t.barW = ut(l, 1 + 2 * i)
                        , u = t.pointXOffset = a.offset;
                    e.inverted && (o -= .5), n.pointPadding && (c = ct(c)), ve.prototype.translate.apply(t), zt(t.points, function (n) {
                        var i, a = ht(Kt(n.yBottom, o), 9e4)
                            , h = 999 + ft(a)
                            , h = ht(ut(-h, n.plotY), r.len + h)
                            , f = n.plotX + u
                            , p = c
                            , d = ht(h, a)
                            , g = ut(h, a) - d;
                        ft(g) < s && s && (g = s, i = !r.reversed && !n.negative || r.reversed && n.negative, d = ft(d - o) > s ? a - s : o - (i ? s : 0)), n.barX = f, n.pointWidth = l, n.tooltipPos = e.inverted ? [r.len + r.pos - e.plotLeft - h, t.xAxis.len - f - p / 2, g] : [f + p / 2, h + r.pos - e.plotTop, g], n.shapeType = "rect", n.shapeArgs = t.crispCol(f, d, p, g)
                    })
                }
                , getSymbol: Lt
                , drawLegendSymbol: ne.drawRectangle
                , drawGraph: Lt
                , drawPoints: function () {
                    var t, e, n = this
                        , r = this.chart
                        , o = n.options
                        , s = r.renderer
                        , a = o.animationLimit || 250;
                    zt(n.points, function (l) {
                        var u, h = l.graphic;
                        $t(l.plotY) && null !== l.y ? (t = l.shapeArgs, u = c(n.borderWidth) ? {
                            "stroke-width": n.borderWidth
                        } : {}, e = l.pointAttr[l.selected ? "select" : ""] || n.pointAttr[""], h ? (Vt(h), h.attr(u).attr(e)[r.pointCount < a ? "animate" : "attr"](i(t))) : l.graphic = s[l.shapeType](t).attr(u).attr(e).add(l.group || n.group).shadow(o.shadow, null, o.stacking && !o.borderRadius)) : h && (l.graphic = h.destroy())
                    })
                }
                , animate: function (t) {
                    var e = this
                        , n = this.yAxis
                        , i = e.options
                        , r = this.chart.inverted
                        , o = {};
                    At && (t ? (o.scaleY = .001, t = ht(n.pos + n.len, ut(n.pos, n.toPixels(i.threshold))), r ? o.translateX = t - n.len : o.translateY = t, e.group.attr(o)) : (o[r ? "translateX" : "translateY"] = n.pos, e.group.animate(o, Zt(E(e.options.animation), {
                        step: function (t, n) {
                            e.group.attr({
                                scaleY: ut(.001, n.pos)
                            })
                        }
                    })), e.animate = null))
                }
                , remove: function () {
                    var t = this
                        , e = t.chart;
                    e.hasRendered && zt(e.series, function (e) {
                        e.type === t.type && (e.isDirty = !0)
                    }), ve.prototype.remove.apply(t, arguments)
                }
            }), Ft.column = ye, Qt.bar = i(Qt.column), me = g(ye, {
                type: "bar"
                , inverted: !0
            }), Ft.bar = me, Qt.scatter = i(te, {
                lineWidth: 0
                , marker: {
                    enabled: !0
                }
                , tooltip: {
                    headerFormat: '<span style="color:{point.color}">●</span> <span style="font-size: 10px;"> {series.name}</span><br/>'
                    , pointFormat: "x: <b>{point.x}</b><br/>y: <b>{point.y}</b><br/>"
                }
            }), me = g(ve, {
                type: "scatter"
                , sorted: !1
                , requireSorting: !1
                , noSharedTooltip: !0
                , trackerGroups: ["group", "markerGroup", "dataLabelsGroup"]
                , takeOrdinalPosition: !1
                , kdDimensions: 2
                , drawGraph: function () {
                    this.options.lineWidth && ve.prototype.drawGraph.call(this)
                }
            }), Ft.scatter = me, Qt.pie = i(te, {
                borderColor: "#FFFFFF"
                , borderWidth: 1
                , center: [null, null]
                , clip: !1
                , colorByPoint: !0
                , dataLabels: {
                    distance: 30
                    , enabled: !0
                    , formatter: function () {
                        return null === this.y ? void 0 : this.point.name
                    }
                    , x: 0
                }
                , ignoreHiddenPoint: !0
                , legendType: "point"
                , marker: null
                , size: null
                , showInLegend: !1
                , slicedOffset: 10
                , states: {
                    hover: {
                        brightness: .1
                        , shadow: !1
                    }
                }
                , stickyTracking: !1
                , tooltip: {
                    followPointer: !0
                }
            }), te = {
                type: "pie"
                , isCartesian: !1
                , pointClass: g(ge, {
                    init: function () {
                        ge.prototype.init.apply(this, arguments);
                        var t, e = this;
                        return e.name = Kt(e.name, "Slice"), t = function (t) {
                            e.slice("select" === t.type)
                        }, Xt(e, "select", t), Xt(e, "unselect", t), e
                    }
                    , setVisible: function (t, e) {
                        var n = this
                            , i = n.series
                            , r = i.chart
                            , o = i.options.ignoreHiddenPoint
                            , e = Kt(e, o);
                        t !== n.visible && (n.visible = n.options.visible = t = t === I ? !n.visible : t, i.options.data[jt(n, i.data)] = n.options, zt(["graphic", "dataLabel", "connector", "shadowGroup"], function (e) {
                            n[e] && n[e][t ? "show" : "hide"](!0)
                        }), n.legendItem && r.legend.colorizeItem(n, t), !t && "hover" === n.state && n.setState(""), o && (i.isDirty = !0), e && r.redraw())
                    }
                    , slice: function (t, e, n) {
                        var i = this.series;
                        P(n, i.chart), Kt(e, !0), this.sliced = this.options.sliced = t = c(t) ? t : !this.sliced, i.options.data[jt(this, i.data)] = this.options, t = t ? this.slicedTranslation : {
                            translateX: 0
                            , translateY: 0
                        }, this.graphic.animate(t), this.shadowGroup && this.shadowGroup.animate(t)
                    }
                    , haloPath: function (t) {
                        var e = this.shapeArgs
                            , n = this.series.chart;
                        return this.sliced || !this.visible ? [] : this.series.chart.renderer.symbols.arc(n.plotLeft + e.x, n.plotTop + e.y, e.r + t, e.r + t, {
                            innerR: this.shapeArgs.r
                            , start: e.start
                            , end: e.end
                        })
                    }
                })
                , requireSorting: !1
                , directTouch: !0
                , noSharedTooltip: !0
                , trackerGroups: ["group", "dataLabelsGroup"]
                , axisTypes: []
                , pointAttrToOptions: {
                    stroke: "borderColor"
                    , "stroke-width": "borderWidth"
                    , fill: "color"
                }
                , animate: function (t) {
                    var e = this
                        , n = e.points
                        , i = e.startAngleRad;
                    t || (zt(n, function (t) {
                        var n = t.graphic
                            , r = t.shapeArgs;
                        n && (n.attr({
                            r: t.startR || e.center[3] / 2
                            , start: i
                            , end: i
                        }), n.animate({
                            r: r.r
                            , start: r.start
                            , end: r.end
                        }, e.options.animation))
                    }), e.animate = null)
                }
                , updateTotals: function () {
                    var t, e, n = 0
                        , i = this.points
                        , r = i.length
                        , o = this.options.ignoreHiddenPoint;
                    for (t = 0; t < r; t++) e = i[t], n += o && !e.visible ? 0 : e.y;
                    for (this.total = n, t = 0; t < r; t++) e = i[t], e.percentage = n > 0 && (e.visible || !o) ? e.y / n * 100 : 0, e.total = n
                }
                , generatePoints: function () {
                    ve.prototype.generatePoints.call(this), this.updateTotals()
                }
                , translate: function (t) {
                    this.generatePoints();
                    var e, n, i, r, o, s = 0
                        , a = this.options
                        , l = a.slicedOffset
                        , c = l + a.borderWidth
                        , u = a.startAngle || 0
                        , h = this.startAngleRad = gt / 180 * (u - 90)
                        , u = (this.endAngleRad = gt / 180 * (Kt(a.endAngle, u + 360) - 90)) - h
                        , f = this.points
                        , p = a.dataLabels.distance
                        , a = a.ignoreHiddenPoint
                        , d = f.length;
                    for (t || (this.center = t = this.getCenter()), this.getX = function (e, n) {
                            return i = st.asin(ht((e - t[1]) / (t[2] / 2 + p), 1)), t[0] + (n ? -1 : 1) * pt(i) * (t[2] / 2 + p)
                        }, r = 0; r < d; r++) o = f[r], e = h + s * u, a && !o.visible || (s += o.percentage / 100), n = h + s * u, o.shapeType = "arc", o.shapeArgs = {
                        x: t[0]
                        , y: t[1]
                        , r: t[2] / 2
                        , innerR: t[3] / 2
                        , start: at(1e3 * e) / 1e3
                        , end: at(1e3 * n) / 1e3
                    }, i = (n + e) / 2, i > 1.5 * gt ? i -= 2 * gt : i < -gt / 2 && (i += 2 * gt), o.slicedTranslation = {
                        translateX: at(pt(i) * l)
                        , translateY: at(dt(i) * l)
                    }, e = pt(i) * t[2] / 2, n = dt(i) * t[2] / 2, o.tooltipPos = [t[0] + .7 * e, t[1] + .7 * n], o.half = i < -gt / 2 || i > gt / 2 ? 1 : 0, o.angle = i, c = ht(c, p / 2), o.labelPos = [t[0] + e + pt(i) * p, t[1] + n + dt(i) * p, t[0] + e + pt(i) * c, t[1] + n + dt(i) * c, t[0] + e, t[1] + n, p < 0 ? "center" : o.half ? "right" : "left", i]
                }
                , drawGraph: null
                , drawPoints: function () {
                    var t, e, n, i, r, o, s = this
                        , a = s.chart.renderer
                        , l = s.options.shadow;
                    l && !s.shadowGroup && (s.shadowGroup = a.g("shadow").add(s.group)), zt(s.points, function (c) {
                        null !== c.y && (e = c.graphic, r = c.shapeArgs, n = c.shadowGroup, i = c.pointAttr[c.selected ? "select" : ""], i.stroke || (i.stroke = i.fill), l && !n && (n = c.shadowGroup = a.g("shadow").add(s.shadowGroup)), t = c.sliced ? c.slicedTranslation : {
                            translateX: 0
                            , translateY: 0
                        }, n && n.attr(t), e ? e.setRadialReference(s.center).attr(i).animate(Zt(r, t)) : (o = {
                            "stroke-linejoin": "round"
                        }, c.visible || (o.visibility = "hidden"), c.graphic = e = a[c.shapeType](r).setRadialReference(s.center).attr(i).attr(o).attr(t).add(s.group).shadow(l, n)))
                    })
                }
                , searchPoint: Lt
                , sortByAngle: function (t, e) {
                    t.sort(function (t, n) {
                        return void 0 !== t.angle && (n.angle - t.angle) * e
                    })
                }
                , drawLegendSymbol: ne.drawRectangle
                , getCenter: ie.getCenter
                , getSymbol: Lt
            }, te = g(ve, te), Ft.pie = te, ve.prototype.drawDataLabels = function () {
                var t, e, n, r, o = this
                    , s = o.options
                    , a = s.cursor
                    , l = s.dataLabels
                    , u = o.points
                    , h = o.hasRendered || 0
                    , f = Kt(l.defer, !0)
                    , p = o.chart.renderer;
                (l.enabled || o._hasPointLabels) && (o.dlProcessOptions && o.dlProcessOptions(l), r = o.plotGroup("dataLabelsGroup", "data-labels", f && !h ? "hidden" : "visible", l.zIndex || 6), f && (r.attr({
                    opacity: +h
                }), h || Xt(o, "afterAnimate", function () {
                    o.visible && r.show(), r[s.animation ? "animate" : "attr"]({
                        opacity: 1
                    }, {
                        duration: 200
                    })
                })), e = l, zt(u, function (u) {
                    var h, f, d, g, v = u.dataLabel
                        , y = u.connector
                        , x = !0
                        , b = {};
                    if (t = u.dlOptions || u.options && u.options.dataLabels, h = Kt(t && t.enabled, e.enabled) && null !== u.y, v && !h) u.dataLabel = v.destroy();
                    else if (h) {
                        if (l = i(e, t), g = l.style, h = l.rotation, f = u.getLabelConfig(), n = l.format ? m(l.format, f) : l.formatter.call(f, l), g.color = Kt(l.color, g.color, o.color, "black"), v) c(n) ? (v.attr({
                            text: n
                        }), x = !1) : (u.dataLabel = v = v.destroy(), y && (u.connector = y.destroy()));
                        else if (c(n)) {
                            v = {
                                fill: l.backgroundColor
                                , stroke: l.borderColor
                                , "stroke-width": l.borderWidth
                                , r: l.borderRadius || 0
                                , rotation: h
                                , padding: l.padding
                                , zIndex: 1
                            }, "contrast" === g.color && (b.color = l.inside || l.distance < 0 || s.stacking ? p.getContrast(u.color || o.color) : "#000000"), a && (b.cursor = a);
                            for (d in v) v[d] === I && delete v[d];
                            v = u.dataLabel = p[h ? "text" : "label"](n, 0, -9999, l.shape, null, null, l.useHTML).attr(v).css(Zt(g, b)).add(r).shadow(l.shadow)
                        }
                        v && o.alignDataLabel(u, v, l, null, x)
                    }
                }))
            }, ve.prototype.alignDataLabel = function (t, e, n, i, r) {
                var o = this.chart
                    , s = o.inverted
                    , a = Kt(t.plotX, -9999)
                    , l = Kt(t.plotY, -9999)
                    , c = e.getBBox()
                    , u = o.renderer.fontMetrics(n.style.fontSize).b
                    , h = n.rotation
                    , f = n.align
                    , p = this.visible && (t.series.forceDL || o.isInsidePlot(a, at(l), s) || i && o.isInsidePlot(a, s ? i.x + 1 : i.y + i.height - 1, s))
                    , d = "justify" === Kt(n.overflow, "justify");
                p && (i = Zt({
                    x: s ? o.plotWidth - l : a
                    , y: at(s ? o.plotHeight - a : l)
                    , width: 0
                    , height: 0
                }, i), Zt(n, {
                    width: c.width
                    , height: c.height
                }), h ? (d = !1, s = o.renderer.rotCorr(u, h), s = {
                    x: i.x + n.x + i.width / 2 + s.x
                    , y: i.y + n.y + {
                        top: 0
                        , middle: .5
                        , bottom: 1
                    }[n.verticalAlign] * i.height
                }, e[r ? "attr" : "animate"](s).attr({
                    align: f
                }), a = (h + 720) % 360, a = a > 180 && a < 360, "left" === f ? s.y -= a ? c.height : 0 : "center" === f ? (s.x -= c.width / 2, s.y -= c.height / 2) : "right" === f && (s.x -= c.width, s.y -= a ? 0 : c.height)) : (e.align(n, null, i), s = e.alignAttr), d ? this.justifyDataLabel(e, n, s, c, i, r) : Kt(n.crop, !0) && (p = o.isInsidePlot(s.x, s.y) && o.isInsidePlot(s.x + c.width, s.y + c.height)), n.shape && !h && e.attr({
                    anchorX: t.plotX
                    , anchorY: t.plotY
                })), p || (Vt(e), e.attr({
                    y: -9999
                }), e.placed = !1)
            }, ve.prototype.justifyDataLabel = function (t, e, n, i, r, o) {
                var s, a, l = this.chart
                    , c = e.align
                    , u = e.verticalAlign
                    , h = t.box ? 0 : t.padding || 0;
                s = n.x + h, s < 0 && ("right" === c ? e.align = "left" : e.x = -s, a = !0), s = n.x + i.width - h, s > l.plotWidth && ("left" === c ? e.align = "right" : e.x = l.plotWidth - s, a = !0), s = n.y + h, s < 0 && ("bottom" === u ? e.verticalAlign = "top" : e.y = -s, a = !0), s = n.y + i.height - h, s > l.plotHeight && ("top" === u ? e.verticalAlign = "bottom" : e.y = l.plotHeight - s, a = !0), a && (t.placed = !o, t.align(e, null, r))
            }, Ft.pie && (Ft.pie.prototype.drawDataLabels = function () {
                var t, e, n, i, r, o, s, a, l, c, u, h = this
                    , f = h.data
                    , p = h.chart
                    , d = h.options.dataLabels
                    , g = Kt(d.connectorPadding, 10)
                    , v = Kt(d.connectorWidth, 1)
                    , y = p.plotWidth
                    , m = p.plotHeight
                    , x = Kt(d.softConnector, !0)
                    , b = d.distance
                    , w = h.center
                    , k = w[2] / 2
                    , T = w[1]
                    , A = b > 0
                    , C = [[], []]
                    , P = [0, 0, 0, 0]
                    , E = function (t, e) {
                        return e.y - t.y
                    };
                if (h.visible && (d.enabled || h._hasPointLabels)) {
                    for (ve.prototype.drawDataLabels.apply(h), zt(f, function (t) {
                            t.dataLabel && t.visible && (C[t.half].push(t), t.dataLabel._pos = null)
                        }), c = 2; c--;) {
                        var M, L = []
                            , O = []
                            , D = C[c]
                            , _ = D.length;
                        if (_) {
                            for (h.sortByAngle(D, c - .5), u = f = 0; !f && D[u];) f = D[u] && D[u].dataLabel && (D[u].dataLabel.getBBox().height || 21), u++;
                            if (b > 0) {
                                for (r = ht(T + k + b, p.plotHeight), u = ut(0, T - k - b); u <= r; u += f) L.push(u);
                                if (r = L.length, _ > r) {
                                    for (t = [].concat(D), t.sort(E), u = _; u--;) t[u].rank = u;
                                    for (u = _; u--;) D[u].rank >= r && D.splice(u, 1);
                                    _ = D.length
                                }
                                for (u = 0; u < _; u++) {
                                    t = D[u], o = t.labelPos, t = 9999;
                                    var I, N;
                                    for (N = 0; N < r; N++) I = ft(L[N] - o[1]), I < t && (t = I, M = N);
                                    if (M < u && null !== L[u]) M = u;
                                    else
                                        for (r < _ - u + M && null !== L[u] && (M = r - _ + u); null === L[M];) M++;
                                    O.push({
                                        i: M
                                        , y: L[M]
                                    }), L[M] = null
                                }
                                O.sort(E)
                            }
                            for (u = 0; u < _; u++) t = D[u], o = t.labelPos, i = t.dataLabel, l = t.visible === !1 ? "hidden" : "inherit", t = o[1], b > 0 ? (r = O.pop(), M = r.i, a = r.y, (t > a && null !== L[M + 1] || t < a && null !== L[M - 1]) && (a = ht(ut(0, t), p.plotHeight))) : a = t, s = d.justify ? w[0] + (c ? -1 : 1) * (k + b) : h.getX(a === T - k - b || a === T + k + b ? t : a, c), i._attr = {
                                visibility: l
                                , align: o[6]
                            }, i._pos = {
                                x: s + d.x + ({
                                    left: g
                                    , right: -g
                                }[o[6]] || 0)
                                , y: a + d.y - 10
                            }, i.connX = s, i.connY = a, null === this.options.size && (r = i.width, s - r < g ? P[3] = ut(at(r - s + g), P[3]) : s + r > y - g && (P[1] = ut(at(s + r - y + g), P[1])), a - f / 2 < 0 ? P[0] = ut(at(-a + f / 2), P[0]) : a + f / 2 > m && (P[2] = ut(at(a + f / 2 - m), P[2])))
                        }
                    }(0 === S(P) || this.verifyDataLabelOverflow(P)) && (this.placeDataLabels(), A && v && zt(this.points, function (t) {
                        e = t.connector, o = t.labelPos, (i = t.dataLabel) && i._pos && t.visible ? (l = i._attr.visibility, s = i.connX, a = i.connY, n = x ? ["M", s + ("left" === o[6] ? 5 : -5), a, "C", s, a, 2 * o[2] - o[4], 2 * o[3] - o[5], o[2], o[3], "L", o[4], o[5]] : ["M", s + ("left" === o[6] ? 5 : -5), a, "L", o[2], o[3], "L", o[4], o[5]], e ? (e.animate({
                            d: n
                        }), e.attr("visibility", l)) : t.connector = e = h.chart.renderer.path(n).attr({
                            "stroke-width": v
                            , stroke: d.connectorColor || t.color || "#606060"
                            , visibility: l
                        }).add(h.dataLabelsGroup)) : e && (t.connector = e.destroy())
                    }))
                }
            }, Ft.pie.prototype.placeDataLabels = function () {
                zt(this.points, function (t) {
                    var e = t.dataLabel;
                    e && t.visible && ((t = e._pos) ? (e.attr(e._attr), e[e.moved ? "animate" : "attr"](t), e.moved = !0) : e && e.attr({
                        y: -9999
                    }))
                })
            }, Ft.pie.prototype.alignDataLabel = Lt, Ft.pie.prototype.verifyDataLabelOverflow = function (t) {
                var e, n = this.center
                    , i = this.options
                    , r = i.center
                    , o = i.minSize || 80
                    , s = o;
                return null !== r[0] ? s = ut(n[2] - ut(t[1], t[3]), o) : (s = ut(n[2] - t[1] - t[3], o), n[0] += (t[3] - t[1]) / 2), null !== r[1] ? s = ut(ht(s, n[2] - ut(t[0], t[2])), o) : (s = ut(ht(s, n[2] - t[0] - t[2]), o), n[1] += (t[0] - t[2]) / 2), s < n[2] ? (n[2] = s, n[3] = Math.min(/%$/.test(i.innerSize || 0) ? s * parseFloat(i.innerSize || 0) / 100 : parseFloat(i.innerSize || 0), s), this.translate(n), this.drawDataLabels && this.drawDataLabels()) : e = !0, e
            }), Ft.column && (Ft.column.prototype.alignDataLabel = function (t, e, n, r, o) {
                var s = this.chart.inverted
                    , a = t.series
                    , l = t.dlBox || t.shapeArgs
                    , c = Kt(t.below, t.plotY > Kt(this.translatedThreshold, a.yAxis.len))
                    , u = Kt(n.inside, !!this.options.stacking);
                l && (r = i(l), r.y < 0 && (r.height += r.y, r.y = 0), l = r.y + r.height - a.yAxis.len, l > 0 && (r.height -= l), s && (r = {
                    x: a.yAxis.len - r.y - r.height
                    , y: a.xAxis.len - r.x - r.width
                    , width: r.height
                    , height: r.width
                }), u || (s ? (r.x += c ? 0 : r.width, r.width = 0) : (r.y += c ? r.height : 0, r.height = 0))), n.align = Kt(n.align, !s || u ? "center" : c ? "right" : "left"), n.verticalAlign = Kt(n.verticalAlign, s || u ? "middle" : c ? "top" : "bottom"), ve.prototype.alignDataLabel.call(this, t, e, n, r, o)
            })
            , function (t) {
                var e = t.Chart
                    , n = t.each
                    , i = t.pick
                    , r = t.addEvent;
                e.prototype.callbacks.push(function (t) {
                    function e() {
                        var e = [];
                        n(t.series, function (t) {
                            var r = t.options.dataLabels
                                , o = t.dataLabelCollections || ["dataLabel"];
                            (r.enabled || t._hasPointLabels) && !r.allowOverlap && t.visible && n(o, function (r) {
                                n(t.points, function (t) {
                                    t[r] && (t[r].labelrank = i(t.labelrank, t.shapeArgs && t.shapeArgs.height), e.push(t[r]))
                                })
                            })
                        }), t.hideOverlappingLabels(e)
                    }
                    e(), r(t, "redraw", e)
                }), e.prototype.hideOverlappingLabels = function (t) {
                    var e, i, r, o, s, a, l, c, u, h = t.length;
                    for (i = 0; i < h; i++)(e = t[i]) && (e.oldOpacity = e.opacity, e.newOpacity = 1);
                    for (t.sort(function (t, e) {
                            return (e.labelrank || 0) - (t.labelrank || 0)
                        }), i = 0; i < h; i++)
                        for (r = t[i], e = i + 1; e < h; ++e) o = t[e], r && o && r.placed && o.placed && 0 !== r.newOpacity && 0 !== o.newOpacity && (s = r.alignAttr, a = o.alignAttr, l = r.parentGroup, c = o.parentGroup, u = 2 * (r.box ? 0 : r.padding), s = !(a.x + c.translateX > s.x + l.translateX + (r.width - u) || a.x + c.translateX + (o.width - u) < s.x + l.translateX || a.y + c.translateY > s.y + l.translateY + (r.height - u) || a.y + c.translateY + (o.height - u) < s.y + l.translateY)) && ((r.labelrank < o.labelrank ? r : o).newOpacity = 0);
                    n(t, function (t) {
                        var e, n;
                        t && (n = t.newOpacity, t.oldOpacity !== n && t.placed && (n ? t.show(!0) : e = function () {
                            t.hide()
                        }, t.alignAttr.opacity = n, t[t.isOld ? "animate" : "attr"](t.alignAttr, null, e)), t.isOld = !0)
                    })
                }
            }(rt), te = rt.TrackerMixin = {
                drawTrackerPoint: function () {
                    var t = this
                        , e = t.chart
                        , n = e.pointer
                        , i = t.options.cursor
                        , r = i && {
                            cursor: i
                        }
                        , o = function (t) {
                            for (var n, i = t.target; i && !n;) n = i.point, i = i.parentNode;
                            n !== I && n !== e.hoverPoint && n.onMouseOver(t)
                        };
                    zt(t.points, function (t) {
                        t.graphic && (t.graphic.element.point = t), t.dataLabel && (t.dataLabel.element.point = t)
                    }), t._hasTracking || (zt(t.trackerGroups, function (e) {
                        t[e] && (t[e].addClass("highcharts-tracker").on("mouseover", o).on("mouseout", function (t) {
                            n.onTrackerMouseOut(t)
                        }).css(r), F) && t[e].on("touchstart", o)
                    }), t._hasTracking = !0)
                }
                , drawTrackerGraph: function () {
                    var t = this
                        , e = t.options
                        , n = e.trackByArea
                        , i = [].concat(n ? t.areaPath : t.graphPath)
                        , r = i.length
                        , o = t.chart
                        , s = o.pointer
                        , a = o.renderer
                        , l = o.options.tooltip.snap
                        , c = t.tracker
                        , u = e.cursor
                        , h = u && {
                            cursor: u
                        }
                        , f = function () {
                            o.hoverSeries !== t && t.onMouseOver()
                        }
                        , p = "rgba(192,192,192," + (At ? 1e-4 : .002) + ")";
                    if (r && !n)
                        for (u = r + 1; u--;) "M" === i[u] && i.splice(u + 1, 0, i[u + 1] - l, i[u + 2], "L"), (u && "M" === i[u] || u === r) && i.splice(u, 0, "L", i[u - 2] + l, i[u - 1]);
                    c ? c.attr({
                        d: i
                    }) : (t.tracker = a.path(i).attr({
                        "stroke-linejoin": "round"
                        , visibility: t.visible ? "visible" : "hidden"
                        , stroke: p
                        , fill: n ? p : "none"
                        , "stroke-width": e.lineWidth + (n ? 0 : 2 * l)
                        , zIndex: 2
                    }).add(t.group), zt([t.tracker, t.markerGroup], function (t) {
                        t.addClass("highcharts-tracker").on("mouseover", f).on("mouseout", function (t) {
                            s.onTrackerMouseOut(t)
                        }).css(h), F && t.on("touchstart", f)
                    }))
                }
            }, Ft.column && (ye.prototype.drawTracker = te.drawTrackerPoint), Ft.pie && (Ft.pie.prototype.drawTracker = te.drawTrackerPoint), Ft.scatter && (me.prototype.drawTracker = te.drawTrackerPoint), Zt(pe.prototype, {
                setItemEvents: function (t, e, n, i, r) {
                    var o = this;
                    (n ? e : t.legendGroup).on("mouseover", function () {
                        t.setState("hover"), e.css(o.options.itemHoverStyle)
                    }).on("mouseout", function () {
                        e.css(t.visible ? i : r), t.setState()
                    }).on("click", function (e) {
                        var n = function () {
                                t.setVisible && t.setVisible()
                            }
                            , e = {
                                browserEvent: e
                            };
                        t.firePointEvent ? t.firePointEvent("legendItemClick", e, n) : Yt(t, "legendItemClick", e, n)
                    })
                }
                , createCheckboxForItem: function (t) {
                    t.checkbox = d("input", {
                        type: "checkbox"
                        , checked: t.selected
                        , defaultChecked: t.selected
                    }, this.options.itemCheckboxStyle, this.chart.container), Xt(t.checkbox, "click", function (e) {
                        Yt(t.series || t, "checkboxClick", {
                            checked: e.target.checked
                            , item: t
                        }, function () {
                            t.select()
                        })
                    })
                }
            }), j.legend.itemStyle.cursor = "pointer", Zt(de.prototype, {
                showResetZoom: function () {
                    var t = this
                        , e = j.lang
                        , n = t.options.chart.resetZoomButton
                        , i = n.theme
                        , r = i.states
                        , o = "chart" === n.relativeTo ? null : "plotBox";
                    this.resetZoomButton = t.renderer.button(e.resetZoom, null, null, function () {
                        t.zoomOut()
                    }, i, r && r.hover).attr({
                        align: n.position.align
                        , title: e.resetZoomTitle
                    }).add().align(n.position, !1, o)
                }
                , zoomOut: function () {
                    var t = this;
                    Yt(t, "selection", {
                        resetSelection: !0
                    }, function () {
                        t.zoom()
                    })
                }
                , zoom: function (t) {
                    var e, n, i = this.pointer
                        , r = !1;
                    !t || t.resetSelection ? zt(this.axes, function (t) {
                        e = t.zoom()
                    }) : zt(t.xAxis.concat(t.yAxis), function (t) {
                        var n = t.axis
                            , o = n.isXAxis;
                        (i[o ? "zoomX" : "zoomY"] || i[o ? "pinchX" : "pinchY"]) && (e = n.zoom(t.min, t.max), n.displayBtn && (r = !0))
                    }), n = this.resetZoomButton, r && !n ? this.showResetZoom() : !r && s(n) && (this.resetZoomButton = n.destroy()), e && this.redraw(Kt(this.options.chart.animation, t && t.animation, this.pointCount < 100))
                }
                , pan: function (t, e) {
                    var n, i = this
                        , r = i.hoverPoints;
                    r && zt(r, function (t) {
                        t.setState()
                    }), zt("xy" === e ? [1, 0] : [1], function (e) {
                        var e = i[e ? "xAxis" : "yAxis"][0]
                            , r = e.horiz
                            , o = t[r ? "chartX" : "chartY"]
                            , r = r ? "mouseDownX" : "mouseDownY"
                            , s = i[r]
                            , a = (e.pointRange || 0) / 2
                            , l = e.getExtremes()
                            , c = e.toValue(s - o, !0) + a
                            , a = e.toValue(s + e.len - o, !0) - a
                            , s = s > o;
                        e.series.length && (s || c > ht(l.dataMin, l.min)) && (!s || a < ut(l.dataMax, l.max)) && (e.setExtremes(c, a, !1, !1, {
                            trigger: "pan"
                        }), n = !0), i[r] = o
                    }), n && i.redraw(!1), p(i.container, {
                        cursor: "move"
                    })
                }
            }), Zt(ge.prototype, {
                select: function (t, e) {
                    var n = this
                        , i = n.series
                        , r = i.chart
                        , t = Kt(t, !n.selected);
                    n.firePointEvent(t ? "select" : "unselect", {
                        accumulate: e
                    }, function () {
                        n.selected = n.options.selected = t, i.options.data[jt(n, i.data)] = n.options, n.setState(t && "select"), e || zt(r.getSelectedPoints(), function (t) {
                            t.selected && t !== n && (t.selected = t.options.selected = !1, i.options.data[jt(t, i.data)] = t.options, t.setState(""), t.firePointEvent("unselect"))
                        })
                    })
                }
                , onMouseOver: function (t, e) {
                    var n = this.series
                        , i = n.chart
                        , r = i.tooltip
                        , o = i.hoverPoint;
                    i.hoverSeries !== n && n.onMouseOver(), o && o !== this && o.onMouseOut(), this.series && (this.firePointEvent("mouseOver"), r && (!r.shared || n.noSharedTooltip) && r.refresh(this, t), this.setState("hover"), !e) && (i.hoverPoint = this)
                }
                , onMouseOut: function () {
                    var t = this.series.chart
                        , e = t.hoverPoints;
                    this.firePointEvent("mouseOut"), e && jt(this, e) !== -1 || (this.setState(), t.hoverPoint = null)
                }
                , importEvents: function () {
                    if (!this.hasImportedEvents) {
                        var t, e = i(this.series.options.point, this.options).events;
                        this.events = e;
                        for (t in e) Xt(this, t, e[t]);
                        this.hasImportedEvents = !0
                    }
                }
                , setState: function (t, e) {
                    var n, r = lt(this.plotX)
                        , o = this.plotY
                        , s = this.series
                        , a = s.options.states
                        , l = Qt[s.type].marker && s.options.marker
                        , c = l && !l.enabled
                        , u = l && l.states[t]
                        , h = u && u.enabled === !1
                        , f = s.stateMarkerGraphic
                        , p = this.marker || {}
                        , d = s.chart
                        , g = s.halo
                        , t = t || "";
                    n = this.pointAttr[t] || s.pointAttr[t], t === this.state && !e || this.selected && "select" !== t || a[t] && a[t].enabled === !1 || t && (h || c && u.enabled === !1) || t && p.states && p.states[t] && p.states[t].enabled === !1 || (this.graphic ? (l = l && this.graphic.symbolName && n.r, this.graphic.attr(i(n, l ? {
                        x: r - l
                        , y: o - l
                        , width: 2 * l
                        , height: 2 * l
                    } : {})), f && f.hide()) : (t && u && (l = u.radius, p = p.symbol || s.symbol, f && f.currentSymbol !== p && (f = f.destroy()), f ? f[e ? "animate" : "attr"]({
                        x: r - l
                        , y: o - l
                    }) : p && (s.stateMarkerGraphic = f = d.renderer.symbol(p, r - l, o - l, 2 * l, 2 * l).attr(n).add(s.markerGroup), f.currentSymbol = p)), f && (f[t && d.isInsidePlot(r, o, d.inverted) ? "show" : "hide"](), f.element.point = this)), (r = a[t] && a[t].halo) && r.size ? (g || (s.halo = g = d.renderer.path().add(d.seriesGroup)), g.attr(Zt({
                        fill: this.color || s.color
                        , "fill-opacity": r.opacity
                        , zIndex: -1
                    }, r.attributes))[e ? "animate" : "attr"]({
                        d: this.haloPath(r.size)
                    })) : g && g.attr({
                        d: []
                    }), this.state = t)
                }
                , haloPath: function (t) {
                    var e = this.series
                        , n = e.chart
                        , i = e.getPlotBox()
                        , r = n.inverted
                        , o = Math.floor(this.plotX);
                    return n.renderer.symbols.circle(i.translateX + (r ? e.yAxis.len - this.plotY : o) - t, i.translateY + (r ? e.xAxis.len - o : this.plotY) - t, 2 * t, 2 * t)
                }
            }), Zt(ve.prototype, {
                onMouseOver: function () {
                    var t = this.chart
                        , e = t.hoverSeries;
                    e && e !== this && e.onMouseOut(), this.options.events.mouseOver && Yt(this, "mouseOver"), this.setState("hover"), t.hoverSeries = this
                }
                , onMouseOut: function () {
                    var t = this.options
                        , e = this.chart
                        , n = e.tooltip
                        , i = e.hoverPoint;
                    e.hoverSeries = null, i && i.onMouseOut(), this && t.events.mouseOut && Yt(this, "mouseOut"), n && !t.stickyTracking && (!n.shared || this.noSharedTooltip) && n.hide(), this.setState()
                }
                , setState: function (t) {
                    var e = this.options
                        , n = this.graph
                        , i = e.states
                        , r = e.lineWidth
                        , e = 0
                        , t = t || "";
                    if (this.state !== t && (this.state = t, !(i[t] && i[t].enabled === !1) && (t && (r = i[t].lineWidth || r + (i[t].lineWidthPlus || 0)), n && !n.dashstyle)))
                        for (t = {
                                "stroke-width": r
                            }, n.attr(t); this["zoneGraph" + e];) this["zoneGraph" + e].attr(t), e += 1
                }
                , setVisible: function (t, e) {
                    var n, i = this
                        , r = i.chart
                        , o = i.legendItem
                        , s = r.options.chart.ignoreHiddenSeries
                        , a = i.visible;
                    n = (i.visible = t = i.userOptions.visible = t === I ? !a : t) ? "show" : "hide", zt(["group", "dataLabelsGroup", "markerGroup", "tracker"], function (t) {
                        i[t] && i[t][n]()
                    }), r.hoverSeries !== i && (r.hoverPoint && r.hoverPoint.series) !== i || i.onMouseOut(), o && r.legend.colorizeItem(i, t), i.isDirty = !0, i.options.stacking && zt(r.series, function (t) {
                        t.options.stacking && t.visible && (t.isDirty = !0)
                    }), zt(i.linkedSeries, function (e) {
                        e.setVisible(t, !1)
                    }), s && (r.isDirtyBox = !0), e !== !1 && r.redraw(), Yt(i, n)
                }
                , show: function () {
                    this.setVisible(!0)
                }
                , hide: function () {
                    this.setVisible(!1)
                }
                , select: function (t) {
                    this.selected = t = t === I ? !this.selected : t, this.checkbox && (this.checkbox.checked = t), Yt(this, t ? "select" : "unselect")
                }
                , drawTracker: te.drawTrackerGraph
            }), Zt(rt, {
                Color: L
                , Point: ge
                , Tick: D
                , Renderer: N
                , SVGElement: O
                , SVGRenderer: ee
                , arrayMin: k
                , arrayMax: S
                , charts: Ot
                , correctFloat: C
                , dateFormat: z
                , error: e
                , format: m
                , pathAnim: void 0
                , getOptions: function () {
                    return j
                }
                , hasBidiBug: Ct
                , isTouchDevice: St
                , setOptions: function (t) {
                    return j = i(!0, j, t), M(), j
                }
                , addEvent: Xt
                , removeEvent: Gt
                , createElement: d
                , discardElement: A
                , css: p
                , each: zt
                , map: Wt
                , merge: i
                , splat: h
                , stableSort: w
                , extendClass: g
                , pInt: r
                , svg: At
                , canvas: Pt
                , vml: !At && !Pt
                , product: "Highcharts"
                , version: "4.2.5"
            }), rt
    });