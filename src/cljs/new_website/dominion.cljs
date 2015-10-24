(ns new-website.dominion
  (:require-macros [cljs.core.async.macros :refer [go]])
  (:require [om.core :as om :include-macros true]
            [om-tools.dom :as dom :include-macros true]
            [om-tools.core :refer-macros [defcomponent]]

            [cljs.core.async :refer [chan <! put!]]

            [clojure.string :as str]

            [ajax.core :refer [GET POST]]

            [dommy.core :as dommy :refer-macros [sel sel1]]

            [new-website.mixins :refer [highlight-mixin]]
            [new-website.utility :as util]))

(defonce *ace* (atom nil))

(defn set-value! [value]
  (let [ace-instance (deref *ace*)
        cursor (.getCursorPositionScreen ace-instance)]
    (.setValue ace-instance value cursor)))

(defn change-handler [owner]
  (om/set-state-nr! owner :edited-value
                    (.getValue (deref *ace*))))

(defcomponent editor-area [data owner]
  (render
   [_]
   (dom/div
    {:id "editor-container" :style {:height "400px"}}))
  (will-mount
   [_]
   (let [editor-chan (om/get-state owner :editor-chan)]
     (go
       (while true
         (when (= :save! (<! editor-chan))
           (when-let [edited-value
                      (om/get-state owner :edited-value)]
             (om/update! data :value edited-value)
             (om/update! data :AI-state :running)))))))
  (did-mount
   [_]
   (let [ace-instance (.edit js/ace
                             (.getDOMNode owner))]
     (reset! *ace* ace-instance)
     (.. ace-instance
         getSession
         (on "change" #(change-handler owner)))
     (set-value! (:value data))))
  (will-update
   [_ next-data next-state]
   (set-value! (:value next-data))))

(defcomponent editor [state owner]
  (init-state [_] {:editor-chan (chan)})
  (render-state
   [_ {:keys [editor-chan]}]
   (let [AI-state (:AI-state state)
         running (= AI-state :running)]
     (.log js/console (str AI-state))
     (dom/div
      (->editor-area
       state {:init-state {:editor-chan editor-chan}})
      (dom/button
       {:type "button" :id "run-button"
        :disabled running
        :onClick (fn []
                   (put! editor-chan :save!)
                   nil)} (if running "Running..." "Run"))))))

(defcomponent -dominion-view [state owner]
  (:mixins highlight-mixin)
  (will-mount
   [_]
   (if-not (get-in @state [:static :dominion :body])
     (GET (util/md-endpoint "dominion")
          {:headers {"Accept" "text/plain"}
           :handler
           (fn [resp]
             (om/update! state [:static :dominion :body] resp))}))
   (if-not (get-in @state [:static :dominion :header])
     (GET (util/md-endpoint "dominion_header")
          {:headers {"Accept" "text/plain"}
           :handler
           (fn [resp]
             (om/update! state [:static :dominion :header] resp))}))
   (if-not (get-in @state [:dominion :value])
     (GET (util/txt-endpoint "dominion_default")
          {:headers {"Accept" "text/plain"}
           :handler
           (fn [resp]
             (om/update! state [:dominion :value] resp))}))
   (if-not (get-in @state [:dominion :AI-state])
     (om/update! state [:dominion :AI-state] :idle)))

  (render-state
   [_ owner]
  (dom/div
   {:id "dominion"}
   (dom/section
    {:class "no-indent"}
    (util/->render-md (get-in @state [:static :dominion :header])))
   (if (get-in @state [:dominion :value])
     (dom/section
      {:id "dominion-widget"}
      (->editor (:dominion state))))
   (dom/section
    {:class "no-indent"}
    (util/->render-md (get-in @state [:static :dominion :body]))))))

(defcomponent dominion-view [state owner]
  (render
   [_]
   (->-dominion-view state)))
