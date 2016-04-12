(ns new-website.test-runner
  (:require
   [doo.runner :refer-macros [doo-tests]]
   [new-website.core-test]))

(enable-console-print!)

(doo-tests 'new-website.core-test)
