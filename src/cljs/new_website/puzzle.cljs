(ns new-website.puzzle
  (:require [om.core :as om :include-macros true]
            [om-tools.dom :as dom :include-macros true]
            [om-tools.core :refer-macros [defcomponent defcomponentmethod]]

            [clojure.set]

            [ajax.core :refer [GET POST]]

            [new-website.mixins :refer [set-interval-mixin highlight-mixin]]
            [new-website.utility :as util]))

(defn find-index [pred coll]
  (let [[e idx]
        (first (filter (fn [[e _]] (pred e))
                       (map list coll (range))))]
    idx))

(defn maximum-movement-in-direction
  [d squares others]
  (let [can-move-i
        (fn [i]
          (every?
           (fn [square]
             (not (contains?
                   others
                   (mapv + square (mapv (partial * i) d)))))
           squares))]
    (cond
      ;; piece can't move in this direction
      (not (can-move-i 1))
      0

      ;; piece can be freely moved in this direction
      (let [index (find-index #(not (zero? %)) d)
            o-coords (map #(get % index) others)
            s-coords (map #(get % index) squares)
            [fs ss] (if (pos? (get d index))
                      [o-coords s-coords]
                      [s-coords o-coords])
            moves-to-disentangle (- (apply max fs) (apply min ss))]
        (every? (fn [i]
                  (can-move-i i))
                (range 2 moves-to-disentangle)))
      :free

      ;; piece can only be moved a finite number of squares
      :else :finite)))

(defn find-slides-in-direction
  [d squares others]
  (case (maximum-movement-in-direction d squares others)
    0 #{}
    :free #{:free}
    #{d}))

(defn find-slides-for-piece [squares others]
  (apply clojure.set/union
         (for [direction [[0 1] [1 0] [-1 0] [0 -1]]]
           (find-slides-in-direction direction squares others))))

(def find-rotations-for-piece (constantly #{}))

(defn find-moves-for-piece
  [[color squares] others]
  (clojure.set/union
   (into #{} (map (fn [x] {:slide x
                           :color color}) (find-slides-for-piece squares others)))
   (into #{} (map (fn [x] {:rotate x
                           :color color}) (find-rotations-for-piece squares others)))))

(defn find-moves
  [pieces]
  (apply clojure.set/union
         (for [[color _ :as piece] pieces]
           (find-moves-for-piece
            piece
            (apply clojure.set/union (vals (dissoc pieces color)))))))

(defn apply-transition
  [{:keys [color slide]} state]
  (if (= :free slide)
    (dissoc state color)
    (update-in state [color]
               (fn [squares]
                 (into #{} (map (partial mapv + slide) squares))))))

(defn dfs
  [gen-edges transition finished?]
  (fn run [state path visited]
    (cond (finished? state) path
          (contains? visited state) nil
          :else
          (let [edges (gen-edges state)]
            (first
             (filter coll?
                     (map (fn [edge]
                            (run
                              (transition edge state)
                              (conj path edge)
                              (conj visited state))) edges)))))))

(defcomponent slide-puzzle-view [state owner]
  (:mixins set-interval-mixin)
  (will-mount
   [_]
   (if-not (get-in @state [:static :puzzle :body])
     (GET (util/md-endpoint "puzzle")
          {:headers {"Accept" "text/plain"}
           :handler
           (fn [resp]
             (om/update! state [:static :puzzle :body] resp))}))
   (if-not (get-in @state [:static :puzzle :header])
     (GET (util/md-endpoint "puzzle_header")
          {:headers {"Accept" "text/plain"}
           :handler
           (fn [resp]
             (om/update! state [:static :puzzle :header] resp))})))
  (did-mount
   [_]
   (.set-interval
    owner
    (fn []
      (om/update-state!
       owner
       (fn [{:keys [pieces initial solution initial-solution] :as state}]
         (if (seq solution)
           (-> state
               (assoc :pieces (apply-transition (first solution) pieces))
               (update-in [:solution] rest))
           (-> state
               (assoc :pieces initial)
               (assoc :solution initial-solution))))))
    1000))
  (init-state
   [_]
   (let [initial-pieces
         {:red #{[0 0] [0 1] [0 2] [1 2] [2 2] [2 1] [1 -3]}
          :blue #{[1 0] [1 1]}}

         solution
         ((dfs find-moves apply-transition #(= 1 (count %)))
          initial-pieces [] #{})]
     {:initial initial-pieces
      :pieces initial-pieces
      :solution solution
      :initial-solution solution}))
  (render-state
   [_ {:keys [pieces path visited] :as owner}]
   (dom/div
    (dom/section
     {:class "no-indent"}
     (util/->render-md (get-in @state [:static :puzzle :header])))
    (dom/div
     {:style {:width "600px"
              :height "600px"}}
     (dom/svg
      {:width "100%" :height "100%"
       :style {:border "1px solid rgba(0,0,0,0.1)"}
       :viewBox "-5 -5 10 10"}
      (dom/g
       {:transform "scale(1, -1)"}
       (for [[color piece-set] pieces
             [x y] piece-set]
         (dom/rect {:x x :y y :width "1" :height "1" :fill (name color)})))))
    (dom/section
     {:class "no-indent wide" :style {:margin-top "30px"}}
     (util/->render-md (get-in @state [:static :puzzle :body]))))))

(defcomponent slide-puzzle-wrapper
  [state _]
  (render
   [_]
   (->slide-puzzle-view state)))
