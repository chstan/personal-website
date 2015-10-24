(defproject new-website "0.1.0-SNAPSHOT"
  :description "FIXME: write description"
  :url "http://example.com/FIXME"
  :license {:name "Eclipse Public License"
            :url "http://www.eclipse.org/legal/epl-v10.html"}

  :source-paths ["src/clj"]

  :test-paths ["test/clj"]

  :dependencies [;; Clojure
                 [org.clojure/clojure "1.6.0"]
                 [org.clojure/core.async "0.1.346.0-17112a-alpha"]

                 [http-kit "2.1.19"]

                 [ring "1.3.2"]
                 [ring/ring-defaults "0.1.4"]
                 [compojure "1.3.2"]

                 [enlive "1.1.6"]
                 [environ "1.0.0"]

                 ;; Clojurescript
                 [org.clojure/clojurescript "0.0-3058" :scope "provided"]

                 [org.omcljs/om "0.8.8"]
                 [prismatic/om-tools "0.3.11"]

                 [prismatic/dommy "1.1.0"]

                 [cljs-ajax "0.3.11"]
                 [secretary "1.2.3"]

                 [markdown-clj "0.9.67"]

                 [cljsjs/highlight "8.4-0"]]

  :plugins [[lein-cljsbuild "1.0.5"]
            [lein-environ "1.0.0"]
            [lein-less "1.7.3"]]

  :min-lein-version "2.5.0"

  :uberjar-name "new-website.jar"

  :cljsbuild {:builds {:app {:source-paths ["src/cljs"]
                             :compiler {:output-to     "resources/public/js/app.js"
                                        :output-dir    "resources/public/js/out"
                                        :source-map    "resources/public/js/out.js.map"
                                        :preamble      ["react/react.min.js"]
                                        :optimizations :none
                                        :pretty-print  true}}}}


  :less {:source-paths ["src/less"]
         :target-path "resources/public/css"}

  :profiles {:dev {:source-paths ["env/dev/clj"]
                   :test-paths ["test/clj"]

                   :dependencies [[figwheel "0.2.5"]
                                  [figwheel-sidecar "0.2.5"]
                                  [com.cemerick/piggieback "0.1.5"]
                                  [weasel "0.6.0"]]

                   :repl-options {:init-ns new-website.server
                                  :nrepl-middleware [cemerick.piggieback/wrap-cljs-repl]}

                   :plugins [[lein-figwheel "0.2.5"]]

                   :figwheel {:http-server-root "public"
                              :server-port 3449
                              :css-dirs ["resources/public/css"]
                              :ring-handler new-website.server/http-handler}

                   :env {:is-dev true}

                   :cljsbuild {:test-commands { "test" ["phantomjs" "env/test/js/unit-test.js" "env/test/unit-test.html"] }
                               :builds {:app {:source-paths ["env/dev/cljs"]}
                                        :test {:source-paths ["src/cljs" "test/cljs"]
                                               :compiler {:output-to     "resources/public/js/app_test.js"
                                                          :output-dir    "resources/public/js/test"
                                                          :source-map    "resources/public/js/test.js.map"
                                                          :preamble      ["react/react.min.js"]
                                                          :optimizations :whitespace
                                                          :pretty-print  false}}}}}

             :uberjar {:source-paths ["env/prod/clj"]
                       :hooks [leiningen.cljsbuild leiningen.less]
                       :env {:production true}
                       :omit-source true
                       :aot :all
                       :main new-website.server
                       :cljsbuild {:builds {:app
                                            {:source-paths ["env/prod/cljs"]
                                             :compiler
                                             {:optimizations :advanced
                                              :pretty-print false}}}}}})
