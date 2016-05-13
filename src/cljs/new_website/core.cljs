(ns new-website.core
  (:require [om.core :as om :include-macros true]
            [om-tools.dom :as dom :include-macros true]
            [om-tools.core :refer-macros [defcomponent]]
            [om-tools.mixin :refer-macros [defmixin]]

            [ajax.core :refer [GET POST]]

            [new-website.routes :as rs :refer [app-state]]
            [new-website.static-views :as static-views]
            [new-website.puzzle :as puzzle]
            [new-website.talks :as talks]
            [new-website.dominion :as dominion]
            [new-website.go :as go]
            [new-website.utility :as util]))

(enable-console-print!)

;; Components
;;;;;;;;;;;;;

(defcomponent unimplemented-view [_ _]
  (render
   [_]
   (dom/p
    "Website migration in progress, this page has not been moved. You can visit the old version at "
    (dom/a {:href "http://historical.conradstansbury.com"} "the archived copy."))))



(defcomponent navbar-view [state _]
  (render
   [_]
   (dom/nav
    (dom/h3 {:id "name-header"} "Conrad Stansbury")
    (dom/ul
     (map (fn [[link label]]
            (dom/li (dom/a {:href link} label)))
          [[(rs/welcome-page) "/"]
           [(rs/resume-page) "resume"]
           [(rs/projects-page) "projects"]
           [(rs/talks-page) "talks"]
           [(rs/papers-page) "papers"]
           ["http://github.com/chstan" "github"]
           [(rs/contact-page) "contact"]
           [(rs/writing-page) "writing"]
           [(rs/reading-page) "reading"]
           [(rs/scheme-page) "scheme"]
           [(rs/dominion-page) "dominion"]
           [(rs/go-page) "go"]
           [(rs/chess-page) "chess"]
           [(rs/puzzle-page) "slide puzzles"]])))))


;; Om navigation hooks
;;;;;;;;;;;;;;;;;;;;;;

(def views-map
  {:welcome #'static-views/welcome-page-view
   :contact #'static-views/contact-view
   :talks #'talks/talks-view
   :papers #'static-views/papers-view
   :reading #'static-views/reading-view
   :writing #'static-views/writing-view
   :resume #'static-views/resume-view
   :projects #'static-views/projects-view
   :dominion #'dominion/dominion-view
   :go #'go/go-view
   :blog #'static-views/blog-item-view

   :puzzle #'puzzle/slide-puzzle-wrapper

   ;; Misc
   :a-cute-cat #'static-views/super-secret-cat-view

   ;; Talks
   :subgradient-talk #'talks/subgradient-talk-wrapper
   :knockout-datasync-talk #'talks/knockout-datasync-talk-wrapper

   ;; Still unimplemented
   :scheme #'unimplemented-view
   :chess #'unimplemented-view})

(defcomponent root-view [state _]
  (render
   [_]
   (let [nav-switch (get-in @state [:navigation :view])
         component (nav-switch views-map)]
     (if (contains? #{:subgradient-talk :knockout-datasync-talk} nav-switch)
       (om/build component state)
       (dom/div
        {:class "container"}
        (dom/div
         {:class "nav-container"}
         (om/build navbar-view state))
        (dom/div
         {:class "content-container"}
         (om/build component state)))))))




(om/root
 root-view
 app-state
 {:target (js/document.getElementById "app")})
