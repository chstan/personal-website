(ns new-website.server
  (:require [clojure.java.io :as io]
            [compojure.core :refer [ANY GET PUT POST DELETE defroutes routes]]
            [compojure.route :refer [resources]]
            [ring.middleware.defaults :refer [wrap-defaults site-defaults]]
            [ring.middleware.gzip :refer [wrap-gzip]]
            [ring.middleware.logger :refer [wrap-with-logger]]
            [ring.middleware.params :refer [wrap-params]]
            [ring.middleware.format :refer [wrap-restful-format]]
            [ring.middleware.anti-forgery :refer [*anti-forgery-token*]]
            [environ.core :refer [env]]
            [ring.adapter.jetty :refer [run-jetty]]
            [new-website.trello :refer [trello-routes]])
  (:gen-class))

(defroutes core-routes
  (GET "/anti_forgery.js" [req]
    {:status 200
     :headers {"Content-Type" "application/javascript"}
     :body (str "var csrf = '" *anti-forgery-token* "';")})
  (GET "/" _
    {:status 200
     :headers {"Content-Type" "text/html; charset=utf-8"}
     :body (io/input-stream (io/resource "public/index.html"))})
  (resources "/"))

(def http-handler
  (routes
    (-> core-routes
        (wrap-defaults site-defaults)
        wrap-with-logger
        wrap-gzip)
    (-> trello-routes
        (wrap-restful-format :formats [:json :transit-json :edn])
        wrap-with-logger)))

(defn -main [& [port]]
  (let [port (Integer. (or port (env :port) 10555))]
    (run-jetty http-handler {:port port :join? false})))
