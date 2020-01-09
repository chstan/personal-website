(defproject new-website "0.1.0-SNAPSHOT"
  :description "FIXME: write description"
  :url "http://example.com/FIXME"
  :license {:name "Eclipse Public License"
            :url "http://www.eclipse.org/legal/epl-v10.html"}

  :dependencies [[org.clojure/clojure "1.9.0"]
                 [org.clojure/core.async "0.2.374"]
                 [org.flatland/ordered "1.5.7"]

                 [org.clojure/clojurescript "1.10.238" :scope "provided"]

                 [ring "1.4.0"]
                 [ring-middleware-format "0.7.0"]
                 [ring/ring-defaults "0.2.0"]
                 [bk/ring-gzip "0.1.1"]
                 [ring.middleware.logger "0.5.0"]
                 [compojure "1.5.0"]
                 [environ "1.0.2"]
                 [org.omcljs/om "1.0.0-beta1"]
                 [clj-http "2.2.0"]
                 [cljs-ajax "0.5.4"]
                 [secretary "1.2.3"]
                 [markdown-clj "1.10.1"]
                 [cljsjs/highlight "9.12.0-2"]]

  :plugins [[lein-cljsbuild "1.1.7"]
            [lein-environ "1.1.0"]
            [lein-less "1.7.5"]]

  :min-lein-version "2.9.1"

  :clean-targets ^{:protect false} [:target-path :compile-path "resources/public/js"]
  :uberjar-name "new-website.jar"
  :main new-website.server
  :repl-options {:init-ns user}

  :source-paths ["src/clj" "src/cljs" "dev"]

  :less {:source-paths ["src/less"]
         :target-path "resources/public/css"}

  ; :foreign-libs [{:file "https://raw.githubusercontent.com/chstan/react-baduk/master/dist/react-baduk.js"
  ;                 :file-min "https://raw.githubusercontent.com/chstan/react-baduk/master/dist/react-baduk.js"
  ;                 :provides ["react-baduk"]}]
  ; :externs ["extern.js"]

  :cljsbuild {:builds
              {:app
               {:source-paths ["src/cljs"]

                :figwheel true
                :compiler {:main new-website.core
                           :asset-path "js/compiled/out"
                           :output-to "resources/public/js/compiled/new_website.js"
                           :output-dir "resources/public/js/compiled/out"
                           :source-map-timestamp true}}}}

  :figwheel {:http-server-root "public"          ;; serve static assets from resources/public/
             :server-port 3449
             :server-ip "127.0.0.1"
             :css-dirs ["resources/public/css"]  ;; watch and update CSS

             ;; make sure to call lein run too
             :server-logfile "log/figwheel.log"}

  :profiles {:dev
             {:dependencies [[figwheel "0.5.18"]
                             [figwheel-sidecar "0.5.18"]
                             [com.cemerick/piggieback "0.2.1"]
                             [org.clojure/tools.nrepl "0.2.12"]]

              :plugins [[lein-figwheel "0.5.18"]
                        [lein-doo "0.1.6"]]

              :cljsbuild {:builds
                          {:app
                           {:source-paths ["src/cljs" "test/cljs"]
                            :compiler {:main new-website.core
                                       :asset-path "js/compiled/out"
                                       :output-to "resources/public/js/compiled/new_website.js"
                                       :output-dir "resources/public/js/compiled/out"
                                       :source-map-timestamp true}
                            }}}}

             :uberjar
             {:source-paths ^:replace ["src/clj"]
              :hooks [leiningen.cljsbuild leiningen.less]
              :omit-source true
              :aot :all
              :cljsbuild {:builds
                          {:app
                           {:source-paths ^:replace ["src/cljs"]
                            :compiler
                            {:optimizations :advanced
                             :pretty-print false}}}}}})
