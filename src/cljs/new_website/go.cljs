(ns new-website.go
  (:require [om.core :as om :include-macros true]
            [om-tools.dom :as dom :include-macros true]
            [om-tools.core :refer-macros [defcomponent]]

            [new-website.utility :as util]))

;; TODO implement this
(defcomponent go-view [_ _]
  (render [_]
    (dom/section {:class "markdown"}
      (dom/header (dom/h1 "Go Board React Component"))
      ;; (dom/div) ;; board here eventually
      (dom/p
        (dom/span
          "'react-baduk' is a npm distributed library for React components and
          utilities for the game of Go. There are a few examples to play with,
          but many more uses and future directions for the project are described on the ")
        (dom/a {:href "http://github.com/chstan/react-baduk"} "project website")
        (dom/span ".")))))
