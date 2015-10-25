(ns new-website.mixins
  (:require [om.core :as om :include-macros true]
            [om-tools.dom :as dom :include-macros true]
            [om-tools.mixin :refer-macros [defmixin]]

            [dommy.core :as dommy :refer-macros [sel sel1]]))

(def standard-controls
  {:controls true
   :progress false
   :slideNumber true
   :history false
   :embedded true
   :fragments true
   :center true
   :transition "none"
   :dependencies
   ;; Use KaTeX manually, not through reveal.js
   [{:src "/plugin/markdown/marked.js"}
    {:src "/plugin/markdown/markdown.js"}
    {:src "/plugin/highlight/highlight.js"
     :callback (fn []
                 (.initHighlightingOnLoad js/hljs))}]})

(defmixin set-interval-mixin
  (will-mount [owner]
              (set! (. owner -intervals) #js []))
  (will-unmount [owner]
                (.. owner -intervals (map js/clearInterval)))
  (set-interval [owner f t]
                (.. owner -intervals (push (js/setInterval f t)))))

(defmixin math-mixin
  ;;
  (did-mount
   [_]
   ;; Synchronously render math
  (mapv
    (fn [elem]
      (let [text (dommy/text elem)
            new-text (str "\\(" text "\\)")]
        (dommy/set-text! elem new-text)))
    (sel :.formula))
   (js/renderMathInElement (sel1 :#app))))

(defmixin reveal-mixin
  ;; hacks to get reveal working
  (will-mount
   [_]
   (dommy/add-class! (sel1 :html) :reveal-html))
  (will-unmount [_] (dommy/remove-class! (sel1 :html) :reveal-html))
  (did-mount
   [_]
   ;; initialize reveal
   (.initialize js/Reveal (clj->js standard-controls))

   ;; Synchronously render math
   (mapv
    (fn [elem]
      (let [text (dommy/text elem)
            new-text (str "\\(" text "\\)")]
        (dommy/set-text! elem new-text)))
    (sel :.formula))
   (js/renderMathInElement (sel1 :#app))

   ;; Reset reveal in case this is a reload
   ;;(.slide js/Reveal 0)
   ))

(defmixin highlight-mixin
  (did-mount
   [owner]
   (.configure js/hljs (clj->js {:languages ["clojure"]}))
   (mapv
    (fn [elem]
      (.highlightBlock js/hljs elem))
    (sel (om/get-node owner) :pre)))

  (did-update
   [owner _ _]
   (mapv
    (fn [elem]
      (.highlightBlock js/hljs elem))
    (sel (om/get-node owner) :pre))))
