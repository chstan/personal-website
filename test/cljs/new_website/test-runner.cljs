(ns new_website.test-runner
  (:require
   [cljs.test :refer-macros [run-tests]]
   [new_website.core-test]))

(enable-console-print!)

(defn runner []
  (if (cljs.test/successful?
       (run-tests
        'new_website.core-test))
    0
    1))
