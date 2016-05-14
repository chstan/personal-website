(ns new-website.talks
  (:require [om.core :as om :include-macros true]
            [om-tools.dom :as dom :include-macros true]
            [om-tools.core :refer-macros [defcomponent defcomponentmethod]]

            [dommy.core :as dommy :refer-macros [sel sel1]]

            [clojure.string :as str]

            [ajax.core :refer [GET POST]]
            [ajax.edn :refer [edn-response-format]]

            [goog.string :as gstring]
            [goog.string.format]

            [new-website.utility :as util]
            [new-website.mixins :refer [set-interval-mixin reveal-mixin]]))

(defmulti talk-view
  (fn [talk _] (:kind talk)))

(defcomponentmethod talk-view :zanbato-tech-talk
  [talk _]
  (render
   [_]
   (dom/div
    {:class "talks-wrapper"}
    (dom/p
     (dom/strong (str (:presentation-title talk)))
     (str ", " (:date talk) ".  ")
     (if (= "#" (:presentation-url talk))
       (dom/a {:href "#"} "[upcoming]")
       (dom/a {:href (:presentation-url talk)} "[slides]"))))))

(defcomponentmethod talk-view :default
  [talk _]
  (render
   [_]
   (dom/div
    {:class "talks-wrapper"}
    (dom/p
     (dom/strong (str (:presentation-title talk)))
     (str  " at " (:name talk) ", " (:location talk) ". " (:date talk) ". ")
     (if (= "#" (:presentation-url talk))
       (dom/a {:href "#"} "[upcoming]")
       (dom/a {:href (:presentation-url talk)} "[slides]"))))))

(defcomponent talks-view [state owner]
  (will-mount
   [_]
   (if-not (:talks @state)
     (GET (util/edn-endpoint "talks")
          {:headers {"Accept" "application/edn"}
           :response-format (edn-response-format)
           :handler
           (fn [resp]
             (om/transact! state :talks (constantly resp)))})))
  (render
   [_]
   (dom/div
    (for [[kind label] [[:zanbato-tech-talk "Tech talks at Zanbato"]
                        [:invited "Invited talks"]
                        [:other "Other talks"]]]
      (dom/div
       {:class "talks-container"}
       (dom/div
        {:class "talks-section-header"}
        (dom/p label))
       (om/build-all talk-view (filter #(= kind (:kind %)) (:talks @state))))))))

(defcomponent graph [{:keys [xy-range fns]} owner]
  (:mixins set-interval-mixin)
  (init-state
   [_]
   {:idx 0
    :step 0.02
    :x-start -1
    :cx -1
    :theta 0
    :interval-id nil})
  (did-mount
   [_]
   (.set-interval
    owner
    (fn []
      (om/update-state!
       owner
       (fn [{:keys [x-start idx step cx] :as o-state}]
         (->
          o-state
          (update-in [:idx] (if (> cx 1.3) (constantly 0) inc))
          (update-in [:cx] (constantly (+ x-start (* idx step))))
          (update-in [:theta] (constantly  (if (> cx 1.3)
                                             0
                                             (/ (- cx x-start) 2.3))))))))
    40))
  (render-state
   [_ {:keys [cx theta]}]
   (let [[[xl xu] [yl yu]] xy-range
         scale 100
         test-fn (first fns)]
     (dom/div
      {:style {:width "100%" :height "100%"}}
      (dom/div
       (dom/span {:class "formula" :style {:color "red"}} "f(")
       (dom/span {:class "formula" :style {:color "green"}} "x(\\theta)")
       (dom/span {:class "formula" :style {:color "red"}} ")")
       (dom/span {:class "formula"} "\\leq")
       (dom/span {:class "formula" :style {:color "blue"}} "(1 - ")
       (dom/span {:class "formula" :style {:color "green"}} "\\theta")
       (dom/span {:class "formula" :style {:color "blue"}} ")\\cdot f(-1) + ")
       (dom/span {:class "formula" :style {:color "green"}} "\\theta")
       (dom/span {:class "formula" :style {:color "blue"}} "\\cdot f(1.3)"))
      (dom/svg {:width "100%" :height "100%"
                :style {:border "none"}
                :viewBox (str/join " " (map (partial * scale) [xl yl (- xu xl) (- yu yl)]))}
               (dom/g
                {:transform "scale(1, -1)"}
                (dom/g
                 {:transform "translate(0, -400)"}
                 (let [delta 0.1]
                   (for [x (range xl xu delta)]
                     (dom/line {:x1 (* 100 x) :x2 (* 100 (+ x delta))
                                :y1 (* 100 (test-fn x)) :y2 (* 100 (test-fn (+ x delta)))
                                :stroke (cond
                                         (> x 1.3) "black"
                                         (< x -1) "black"
                                         :else "red")
                                :stroke-width 3})))
                 (dom/line
                  {:x1 (* 100 -1) :x2 (* 100 1.3)
                   :y1 (* 100 (test-fn -1)) :y2 (* 100 (test-fn 1.3))
                   :stroke "blue"
                   :stroke-width "5"})
                 (dom/line
                  {:x1 (* 100 -1) :x2 (* 100 1.3)
                   :y1 -50 :y2 -50
                   :stroke "green"
                   :stroke-width "3"})
                 (dom/circle
                  {:cx (* 100 cx)
                   :cy (* 100 (test-fn cx))
                   :r "15"
                   :fill "red"})
                 (dom/circle
                  {:cx (* 100 cx)
                   :cy (* 100 (+ (* (- 1 theta) (test-fn -1))
                                 (* theta (test-fn 1.3))))
                   :r "15"
                   :fill "blue"})
                 (dom/circle
                  {:cx (* 100 cx)
                   :cy -50
                   :r "15"
                   :fill "green"}))))))))

(defcomponent knockout-datasync-talk-view [_ _]
  (:mixins reveal-mixin)
  (render
   [_]
   (dom/div
    {:class "reveal"}
    (dom/div
     {:class "slides"}
     (dom/section
      (dom/h3 "Data Synchronization in Knockout")
      (dom/p {:style {:margin-top "150px"}} "Conrad"))
     (dom/section
      (dom/span {:style {:margin-bottom "40px"}} "Some things reactive frameworks do well..."))
     (dom/section
      (dom/span {:style {:margin-bottom "40px"}} "... and some pains of keeping the client and server updated"))

     (dom/section
      (dom/div
       (dom/span "Knockout"))
      (dom/p "MVVM")
      (dom/p {:class "fragment"}
             "Don't think about view-state manipulations that occur when data changes")
      (dom/p {:class "fragment"}
             "Continuous updates as the single source of truth")
      (dom/p {:class "fragment"}
             "But Knockout and React are really only view layers"))

     (dom/section
      (dom/span "What are the implications of this?"))
     (dom/section
      (dom/span "... It's a good thing, but it leaves the question of how we keep the client and server in sync pretty open"))
     (dom/section
      (dom/div
       (dom/span "Huge number of ideas about how to address this"))
      (dom/div {:class "fragment" :style {:margin-top "40px"}}
               (dom/strong "Lightweight: ")
               (dom/p "In view-model AJAX")
               (dom/p "ko.mapping"))
      (dom/div {:class "fragment" :style {:margin-top "40px"}}
               (dom/strong "Not so lightweight: ")
               (dom/p "Falcor (Netflix)")
               (dom/p "Relay (Facebook)")
               (dom/p "Seems like a billion others")))

     (dom/section
      (dom/div
       (dom/span "Can gain nice properties: "))
      (dom/p "Maximally decouple view-logic from sync-logic")
      (dom/p {:class "fragment"} "Optimistic updates become trivial to implement")
      (dom/p {:class "fragment"} "Impose structure on dependencies in the view model"))

     (dom/section
      (dom/div
       (dom/span "Knockout provides two powerful utilities:"))
      (dom/p {:class "fragment"} "Binding handlers")
      (dom/p {:class "fragment"} "Extenders"))

     (dom/section
      (dom/span "Wanted to see what it would take to build a sync layer on top of observables..."))))))


(defcomponent data-engineering-talk-view [_ _]
  (:mixins reveal-mixin)
  (render
    [_]
    (dom/div
      {:class "reveal"}
      (dom/div
        {:class "slides"}
        (dom/section
          (dom/h3 "What's Data Engineering? (And what have we been doing?)")
          (dom/p {:style {:margin-top "150px"}} "Conrad"))

        (dom/section
          (dom/p "As a first thought...")
          (dom/p {:class "fragment"}
            "\"Scale\""))

        (dom/section
          (dom/h4 "\"I've been doing a lot with big data recently!\"")
          (dom/p {:class "fragment"}
            "(Overhead at the Palo Alto Blue Bottle of a psychology study with "
            (dom/span {:class "formula"} "n=20000")
            ")"))

        (dom/section
          (dom/p "On the other hand..."))

        (dom/section
          (dom/p "Google has on order of {{ mind bogglingly large number }} bytes of data"))

        (dom/section
          (dom/p "I'm not going to focus on these
                  because they're relatively uninteresting")
          (dom/p {:class "fragment"} "Zanbato doesn't have big data (yet?)"))

        (dom/section
          (dom/p "There are relatively good tools to deal with data \"at scale\"")
          (dom/p {:class "fragment"} "(Thanks Google)"))

        (dom/section
          (dom/p "That doesn't prevent people from pursuing ridiculous ideas")
          (dom/a {:href "https://algorithmia.com/"} "https://algorithmia.com/"))

        (dom/section
          (dom/span "Critical: Instead of moving data around, ")
          (dom/span {:class "fragment"} "move code around"))

        (dom/section
          (dom/h3 "So what's data engineering?"))

        (dom/section
          (dom/p "As a short answer: preparing data for use in some analaysis or product"))

        (dom/section
          (dom/p
            (dom/span {:style {:font-weight 500}} "AKA: ")
            "Your data science project consumes vectors but you have to feed it pictures,
             blog post comment threads, paper shipping logs, toxicity records of decomposing leaves found
             around your Cupertino headquarters sent to you by a third party lab in a proprietary (semi-corrupted) format,
             turnstile counts from the Library of Congress, and a steady stream of Twitter mentions
             where people spelled your name slightly wrong"))

        (dom/section
          (dom/p "This is just to say that there's a lot of work that
                  goes into preparing data for use in a substantial project"))

        (dom/section
         (dom/h4 "Schema Matching")
         (dom/span {:class "fragment"}
          "We need to impose stucture onto different sources"))

        (dom/section
         (dom/h4 "Entity Recognition")
         (dom/span {:class "fragment"} "Need to be able to reason about different sources when they're describing the same 'thing'"))

        (dom/section
          (dom/h4 "Pipelines")
          (dom/p {:class "fragment"} "Compositional and simple to understand")
          (dom/p {:class "fragment"} "De-and-re-constructible approach almost necessary to deal with flexibiity inherent in data science/engineering"))

        (dom/section
          (dom/h4 "Data science is exploratory but...")
          (dom/p {:class "fragment"} "Need to be able to ask questions of data, have a dialog"))

        (dom/section
          (dom/h4 "...rate of change is inverse to length of the feedback cycle")
          (dom/p {:class "fragment"} "Fine when you have a few MB of JSON data, use a REPL")
          (dom/p {:class "fragment"} "Harder when you're dealing with 100s of GBs of data that's changing and fetched over FTP"))

        (dom/section
          (dom/h4 "One of the most important goals of data engineering is to enable fast feedback")
          (dom/p {:class "fragment"} "Build software to provide a fast and consistent way to access data for heterogenous sources"))

        (dom/section
          (dom/p "This stuff's a pain, can a computer do it for me?"))

        (dom/section
          (dom/h4 "Some belief that software might be able to do this automatically")
          (dom/p {:class "fragment"} "Likely what will happen is that tooling will improve in ways that make technical aspects simpler")
          (dom/p {:class "fragment"} "If you're data is already in a form that a computer can automatically understand it's probably pretty close to 'integrated'"))

        (dom/section
          (dom/h4 "Questions?"))))))

(defcomponent subgradient-talk-view [_ _]
  (:mixins reveal-mixin)
  (render
   [_]
   (dom/div
    {:class "reveal"}
    (dom/div
     {:class "slides"}
     (dom/section
      (dom/h3 "Subgradient Iteration + DCP")
      (dom/p {:style {:margin-top "150px"}} "Conrad"))

     (dom/section
      (dom/span {:style {:margin-bottom "40px"}} "...an excuse to talk about convex optimization..."))
     (dom/section
      (dom/span {:style {:margin-bottom "40px"}} "...structural features in problem solving."))

     (dom/section
      (dom/span "Convex?")
      (dom/div {:class "fragment"
                :style {:width "800px" :height "300px" :margin "auto" :padding-top "50px"}}
               (->graph
                {:xy-range [[-2 2] [-1 5]]
                 :fns [(fn [x] (* x x))]})))

     (dom/section
      (dom/div
       {:class "table-div" :style {:text-align "left" :margin "auto"}}
       (dom/div
        (dom/div
         (dom/span {:class "formula" :style {:padding-right "20px"}} "\\text{minimize:}"))
        (dom/div
         (dom/span {:class "formula" :style {:padding-right "20px"}} "\\text{subject to:}")))
       (dom/div
        (dom/div
         (dom/span {:class "formula"} "f(x)"))
        (dom/div
         (dom/div (dom/span {:class "formula"} "x \\in A")))))
      (dom/div
       {:style {:margin-top "80px"}}
       (dom/span {:class "formula"} "f, A")
       (dom/span {:style {:padding-left "10px"
                          :font-weight "300"}} " convex (in their respective meanings)")))

     (dom/section
      (dom/span "Why bother with C optimization?")

      (dom/p {:style {:margin-top "50px"} :class "fragment"}
             "Convex and spectral optimization can be done globally")
      (dom/p {:style {:margin-top "50px"} :class "fragment"}
             "Convex is simpler"))

     (dom/section
      (dom/span {:style {:margin-bottom "60px"}} "Why bother with C optimization?")
      (dom/ul
       (dom/li {:style {:margin-top "50px"
                        :font-weight "300"} :class "fragment"}
               "Linear programming")
       (dom/li {:style {:margin-top "50px"
                        :font-weight "300"} :class "fragment"}
               "Least squares")
       (dom/li {:style {:margin-top "50px"
                        :font-weight "300"} :class "fragment"}
               "Regularizations of many important problems")
       (dom/li {:style {:margin-top "50px"
                        :font-weight "normal"} :class "fragment"}
               "Controls (autonomous vehicles, drones, rockets)")))

     (dom/section
      (dom/span "Solving the general problem")
      (dom/p {:style {:margin-top "50px"}}
             "Weirdly simple solutions exist")
      (dom/p {:class "fragment" :style {:margin-top "50px"}}
             "(even without differentiability)")
      (dom/p {:class "fragment" :style {:margin-top "50px"}}
             "(but this one requires something like it)"))

     (dom/section
      (dom/span "Subgradient Iteration")
      (dom/p "Idea is to follow the slope of the function down...")
      (dom/p "...in a \"generous\" enough interpretation of \"slope\" and \"down\""))

     (dom/section
      (dom/span "Subgradient")
      (dom/p "Even if a function isn't differentiable, it can be subdifferentiable")
      (dom/img {:style {:border "none" :box-shadow "none" :width "80%"}
                :src "/img/subdifferential.png"}))

     (dom/section
      (dom/span "Optimizing")
      (dom/div {:style {:margin-top "80px"}}
               (dom/span {:class "formula" :style {:font-weight 300}}
                 "x^{(k+1)} = x^{(k)} - \\alpha_k g^{(k)}"))
      (dom/div
       (dom/span {:class "formula" :style {:font-weight 300}} "g")
       (dom/span {:style {:font-weight 300}}
                 " can be any subgradient"))
      (dom/div
       {:style {:margin-top "40px" :font-weight 300}}
       (dom/span
        "Requires approximately ")
       (dom/span
        {:class "formula"}
        "(\\frac{R G}{\\epsilon})^2")
       (dom/span
        " steps")))

     (dom/section
      (dom/span "Optimizing")
      (dom/div
       (dom/img {:style {:border "none"
                         :box-shadow "none"
                         :padding-left "10%"
                         :padding-top "70px"
                         :width "80%"}
                 :src "/img/descent.png"}))
      (dom/p "Not descent!"))

     (dom/section
      (dom/span "Symbolic subdifferentiation")
      (dom/p "How do we find these things?")
      (let [sexprs '(subdifferential
                     [:abs :x]
                     {:x 0})]
        (dom/div {:class "fragment"}
                 (dom/pre
                  (dom/code {:class "clojure"} (str sexprs)))
                 (dom/span {:class "formula"} "\\Downarrow")

                 (dom/pre
                  (dom/code {:class "clojure"} "[{:range [-1 1]}]")))))

     (dom/section
      (dom/div
       (dom/span "Subgradient Rules"))
      (dom/p "For expressions made up of pieces with computable subgradients, we can use")
      (dom/ul {:class "fragment" :style {:font-weight 300}}
              (dom/li "Supremum")
              (dom/li "Expectation")
              (dom/li "Chain rule (much like the calculus one)")
              (dom/li "Duality")
              (dom/li "+ many others")))

     (dom/section
      (dom/div
       (dom/span "Disciplined Convex Programming"))
      (dom/p "Can use similar methods to study the curvature of functions"))

     (dom/section
      (dom/img {:style {:border "none"
                        :box-shadow "none"
                        :width "80%"}
                :src "/img/dcp.png"}))

     (dom/section
      (dom/div
       (dom/span "Disciplined Convex Programming"))
      (dom/p "CVX and others are compilers for the grammar of convex problems")
      (dom/p {:class "fragment"}
             "Their machine ops are high level algorithms,")
      (dom/p {:class "fragment"}
             "SOCP solver runs"))

     (dom/section
      (dom/div
       (dom/span "Disciplined Convex Programming"))
      (dom/p "Targets are drones and embedded systems,")
      (dom/p {:class "fragment"}
       "but also distributed systems like Spark + Kafka"))))))

(defcomponent subgradient-talk-wrapper [_ _]
  (render
   [_]
   (->subgradient-talk-view {})))

(defcomponent knockout-datasync-talk-wrapper [_ _]
  (render
   [_]
   (->knockout-datasync-talk-view {})))

(defcomponent data-engineering-talk-wrapper [_ _]
  (render
    [_]
    (->data-engineering-talk-view {})))
