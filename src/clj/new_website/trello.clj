(ns new-website.trello
  (:require [environ.core :as environ]
            [compojure.core :refer [POST defroutes]]
            [clj-http.client :as client]))

(defn- post-card [req]
  (let [api-endpoint "https://api.trello.com"
        api-version 1
        params (:params req)
        target-list "56e0e91ed298192e73abd2a8"
        meeting-label "56e0e910152c3f92fd5b8e13"
        name (if (empty? (:name params))
                "Schedule a meeting"
                (str "Schedule a meeting with " (:name params)))
        desc (:description params)
        resp (client/post (str api-endpoint "/" api-version "/cards")
              {:query-params
                {:token (environ/env :trello-api-token)
                 :key (environ/env :trello-api-key)
                 :idList target-list
                 :idLabels [meeting-label]
                 :pos "top"
                 :name name
                 :desc desc}})]
    {:status 200 :body (str resp)}))

(defroutes trello-routes
  (POST "/create-card" [req] post-card))
