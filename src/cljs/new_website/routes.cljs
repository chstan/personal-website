(ns new-website.routes
  (:require [om.core :as om :include-macros true]
            [om-tools.dom :as dom :include-macros true]
            [secretary.core :as sec
             :include-macros true]
            [goog.events :as events]
            [goog.history.EventType :as EventType])
  (:import goog.History))

;; -------------------------
;; Application state, defined here so that
;; routing can set the navigation component

(defonce app-state
  (atom
   {:navigation {:view :welcome}}))

;; -------------------------
;; Routes
(sec/set-config! :prefix "#")

(let [app-state-cur (om/ref-cursor (om/root-cursor app-state))]
  (sec/defroute welcome-page "/" []
    (om/update! app-state-cur [:navigation :view] :welcome))
  (sec/defroute resume-page "/resume" []
    (om/update! app-state-cur [:navigation :view] :resume))
  (sec/defroute projects-page "/projects" []
    (om/update! app-state-cur [:navigation :view] :projects))
  (sec/defroute talks-page "/talks" []
    (om/update! app-state-cur [:navigation :view] :talks))
  (sec/defroute papers-page "/papers" []
    (om/update! app-state-cur [:navigation :view] :papers))
  (sec/defroute contact-page "/contact" []
    (om/update! app-state-cur [:navigation :view] :contact))
  (sec/defroute blog-page "/writing/:page" [page]
    (om/update! app-state-cur [:navigation] {:view :blog :args page}))
  (sec/defroute writing-page "/writing" []
    (om/update! app-state-cur [:navigation :view] :writing))
  (sec/defroute reading-page "/reading" []
    (om/update! app-state-cur [:navigation :view] :reading))
  (sec/defroute scheme-page "/scheme" []
    (om/update! app-state-cur [:navigation :view] :scheme))
  (sec/defroute dominion-page "/dominion" []
    (om/update! app-state-cur [:navigation :view] :dominion))
  (sec/defroute go-page "/go" []
    (om/update! app-state-cur [:navigation :view] :go))
  (sec/defroute chess-page "/chess" []
    (om/update! app-state-cur [:navigation :view] :chess))
  (sec/defroute puzzle-page "/puzzle" []
    (om/update! app-state-cur [:navigation :view] :puzzle))

  ;; Misc
  ;;;;;;;;;;;;;;;;;;;;;;;;;;
  (sec/defroute super-secret-cat-page "/super/secret/cat" []
    (om/update! app-state-cur [:navigation :view] :a-cute-cat))

  ;; Talks
  ;;;;;;;;;;;;;;;;;;;;;;;;;;
  (sec/defroute data-engineering-talk-page "/data-engineering" []
    (om/update! app-state-cur [:navigation :view] :data-engineering-talk))
  (sec/defroute subgradient-talk-page "/subgradient-iteration" []
    (om/update! app-state-cur [:navigation :view] :subgradient-talk))
  (sec/defroute knockout-datasync-talk-page "/knockout-datasync" []
    (om/update! app-state-cur [:navigation :view] :knockout-datasync-talk)))


;; -------------------------
;; History
;; must be called after routes have been defined
(defn hook-browser-navigation! []
  (doto (History.)
    (events/listen
     EventType/NAVIGATE
     (fn [event]
       (sec/dispatch! (.-token event))))
    (.setEnabled true)))

;; actually hook, this isn't great for code reloading, but
;; hook-browser-navigation! shouldn't change much
(hook-browser-navigation!)
