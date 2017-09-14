(ns new-website.utility
  (:require [om.core :as om :include-macros true]
            [om-tools.dom :as dom :include-macros true]
            [om-tools.core :refer-macros [defcomponent defcomponentmethod]]

            [dommy.core :as dommy :refer-macros [sel sel1]]

            [markdown.core :refer [md->html]]

            [new-website.mixins :refer [highlight-mixin math-mixin]]))

(defn static-endpoint [type label]
  (str "/" type "/" label "." type))

(def edn-endpoint (partial static-endpoint "edn"))
(def md-endpoint (partial static-endpoint "md"))
(def txt-endpoint (partial static-endpoint "txt"))

(defcomponent render-md [md _]
  (:mixins highlight-mixin math-mixin)
  (did-mount
   [_]
   ;; Synchronously render math
   (mapv
    (fn [elem]
      (let [text (dommy/text elem)
            new-text (str "\\(" text "\\)")]
        (dommy/set-text! elem new-text)))
    (sel :.formula))
   (js/renderMathInElement (sel1 :#app)))
  (render
   [_]
   (dom/div
    {:class "markdown"}
    (if (not (empty? md))
      (dom/div #js {:dangerouslySetInnerHTML #js
                    {:__html (md->html md)}})
      nil))))
