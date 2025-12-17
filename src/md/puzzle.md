# Source, currently animating the SVG

```
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
                           :color color})
                  (find-slides-for-piece squares others)))
   (into #{} (map (fn [x] {:rotate x
                           :color color})
                  (find-rotations-for-piece squares others)))))

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
```
