(ns new-website.static-views
  (:require [om.core :as om :include-macros true]
            [om-tools.dom :as dom :include-macros true]
            [om-tools.core :refer-macros [defcomponent defcomponentmethod]]

            [clojure.string :as str]

            [ajax.core :refer [GET POST]]
            [ajax.edn :refer [edn-response-format]]

            [new-website.mixins :refer [math-mixin]]

            [new-website.utility :as util]
            [new-website.talks :as talks]
            [new-website.routes :as rs]))

(def courses
  {:computer-science
   (str/join
    ", "
    ["Computer Organization and Systems"
     "Algorithms"
     "Optimization and Graduate Algorithms"
     "Data Mining"
     "Data Mining for Cyber Security"
     "Linear Dynamical Systems"])
   :physics
   (str/join
    ", "
    ["Quantum Field Theory I"
     "General Relativity"
     "Low Temperature Physics Lab"
     "Lasers Laboratory"
     "Statistical Mechanics and Thermodynamics I + II"
     "Hamiltonian Mechanics"
     "Electricity and Magnetism"
     "Quantum Mechanics"
     "Introduction to Particle Physics"
     "Introduction to Cosmology"
     "Electrons and Photons"])
   :math
   (str/join
    ", "
    ["Graduate Algebra I + II"
     "Functional Analysis"
     "Convex Optimization I + II"])})

(defcomponent resume-paragraphs-section [paragraphs _]
  (render
   [_]
   (dom/div
    {:class "resume-paragraphs"}
    (map dom/p paragraphs))))

(defcomponent resume-education-section [{:keys [school gpa content]} _]
  (render
   [_]
   (dom/div
    (dom/div
     {:class "table"}
     (dom/i school)
     (dom/div {:class "right"} (dom/p (str "GPA " gpa))))
    (dom/div
     (map dom/p content)))))

(defcomponent resume-experience-item [{:keys [title for start end content]} _]
  (render
   [_]
   (dom/div
    (dom/div
     {:class "table experience-header"}
     (dom/p
      (dom/strong title)
      (dom/span (str " " for)))
     (dom/p
      {:class "right"}
      (dom/span
       (str start " - " (or end "present")))))
    (om/build resume-paragraphs-section content))))

(defcomponent resume-experience-section [content _]
  (render
   [_]
   (dom/div
    {:class "experience-sections"}
    (om/build-all resume-experience-item content))))

(defcomponent resume-skills-section [{:keys [proficient experienced]} _]
  (render
   [_]
   (dom/div
    (dom/div
     {:class "table"}
     (dom/p (dom/i "Proficient"))
     (dom/p {:class "right"} (dom/span (str/join ", " proficient))))
    (dom/div
     {:class "table"}
     (dom/p (dom/i "Experienced"))
     (dom/p {:class "right"} (dom/span (str/join ", " experienced)))))))

(defcomponent resume-talks-section [talks-for-resume _]
  (render
   [_]
   (dom/div
    (om/build-all talks/talk-view talks-for-resume))))

(defcomponent resume-row [{:keys [title row-type content]} _]
  (render
   [_]
   (dom/div
    {:class "table resume-row"}
    (dom/div
     (dom/h2 title))
    (let [components {:education #'resume-education-section
                      :paragraphs #'resume-paragraphs-section
                      :experience #'resume-experience-section
                      :skills #'resume-skills-section
                      :talks #'resume-talks-section}
          component (row-type components)]
       (om/build component content)))))

(defcomponent resume-view [state _]
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
   (dom/article
    {:id "resume"}
    (dom/div
     {:id "resume-header" :class "hruled"}
     (dom/h1 "Conrad Stansbury")
     (dom/p "2235 California St. Apt 233")
     (dom/p "Mountain View, CA 94040"))
    (om/build-all
     resume-row
     [{:title "Education"
       :row-type :education
       :content {:school "Stanford University"
                 :content ["Graduated Jun 2015, BS Physics with Distinction and Honors, "
                           "concentration in theoretical physics"]
                 :gpa 4.01}}
      {:title "Coursework"
       :row-type :paragraphs
       :content
       (-> courses
           (select-keys [:computer-science :math])
           vals)}
      {:title "Experience"
       :row-type :experience
       :content [{:title "Research Intern"
                  :for "SLAC National Laboratory"
                  :start "June 2013"
                  :end "June 2015"
                  :content
                  [(str
                    "Working with the ATLAS group on two data analysis projects "
                    "to improve the resolution of Large Hadron Collier "
                    "experiments. Investigated several machine learning "
                    "techniques for jet finding and developed a jet classifier "
                    "competitive with state of the art.")
                   (str
                    "Since June 2014, researched model based clustering "
                    "for jet finding. Wrote 10k+ lines of algorithmic C++ to "
                    "conduct and automate statistical analyses that handle TBs of data "
                    "and generate plots and histograms to communicate results.")]}
                 {:title "Instructor,"
                  :for "Stanford Physics 91SI"
                  :start "March 2015"
                  :end "June 2015"
                  :content
                  [(str
                    "Designed and created lecture materials, met with faculty "
                    "to plan the curriculum, and lectured weekly for Physics 91SI, "
                    "scientific computing in Python, at Stanford.")]}
                 {:title "FEA"
                  :start "February 2015"
                  :content
                  [(str
                    "Wrote a finite element analysis in C as well as a Scheme "
                    "interpreter to generate meshes and provide high level problem "
                    "definitions to the solver. Also implemented a lexer and "
                    "a recursive descent parser combinator for reading Scheme.")]}
                 {:title "Web Server"
                  :start "September 2014"
                  :end "June 2015"
                  :content
                  [(str
                    "Created a web server from the "
                    "ground up using Haskell + HTML5/CSS + JS. The site "
                    "running on it hosts completed and ongoing projects, "
                    "research, public documents, and papers. You're looking "
                    "at it! (or you were until recently, I've recently moved to "
                    "an SPA running on nginx/Clojure/ClojureScript/LESS due "
                    "more dynamic content accumulating on my site)")]}
                 {:title "Chess Engine"
                  :start "June 2012"
                  :end "December 2014"
                  :content
                  [(str
                    "Designed and built a chess engine in C + x86 assembly. "
                    "The engine uses alpha-beta pruning with aspiration windows, "
                    "a variety of advanced data structures, and multithreading "
                    "to assess millions of positions per second. Ran Python-"
                    "scripted tournaments to tune engine parameters with "
                    "machine learning.")]}]}
      {:title "Talks"
       :row-type :talks
       :content (filterv #(not= (:kind %) :zanbato-tech-talk) (:talks @state))}
      {:title "Skills"
       :row-type :skills
       :content {:proficient ["C{++}" "Python" "Clojure/ClojureScript"
                              "HTML/CSS" "JavaScript"
                              "UNIX" "LaTeX" "ROOT"]
                 :experienced ["Ruby" "Mathematica/Matlab" "Haskell"]}}
      {:title "Activities + Interests"
       :row-type :paragraphs
       :content [(str/join
                  ", "
                  ["Hiking" "running" "biking" "writing short stories" "cooking"])]}]))))

(defcomponent welcome-page-view [state _]
  (render
   [_]
   (dom/div
    {:class "content-header statement"}
    (dom/p "Hi, I'm Conrad.")
    (dom/p (str  "I'm recent Stanford physics graduate and a software engineer "
                 "working at Zanbato in Mountain View to build efficient "
                 "private markets."))
    (dom/p (str "To see some of what I've been working on, take a look around "
                "or head over to my GitHub. Alternatively, if you want to get "
                "in touch, send me an email and I'll get back to you quickly."))
    (dom/p "Thanks for visiting."))))

(defcomponent contact-view [state _]
  (render
   [_]
   (dom/div
    {:class "contact-table contact-container"}
    (dom/div
     {:class "table"}
     (dom/div {:class "heading-left"} (dom/p "Phone"))
     (dom/div {:class "right"} (dom/p {:class "phone-number"} "703 317 7012")))
    (dom/div
     {:class "table"}
     (dom/div {:class "heading-left"} (dom/p "Email"))
     (dom/div
      {:class "right"}
      (dom/p "chstansbury at gmail.com")
      (dom/p "conrad.stansbury at zanbato.com"))))))

(defcomponent book-component [book _]
  (render
   [_]
   (dom/div
    {:class "book"}
    (dom/cite (:title book))
    (dom/div
     {:class "table"}
     (dom/p (:author book))
     (dom/p {:class "right"} (if (:finished book) (:completion-date book) "-"))))))

(defmulti paper-view
  (fn [paper _] (:kind paper)))

(defcomponentmethod paper-view :thesis
  [thesis _]
  (render
   [_]
   (dom/div
    {:class "talks-wrapper"} ;; My CSS needs cleaning up clearly
    (dom/p
     (dom/a {:href (:url thesis)} (:name thesis))
     (str ", " (:date thesis) ".  ")))))

(defcomponentmethod paper-view :preprint
  [preprint _]
  (render
   [_]
   (dom/div
    {:class "talks-wrapper"} ;; My CSS needs cleaning up clearly
    (dom/p
     (str/join ", " (:authors preprint))
     ", " (dom/a {:href (:url preprint)} (:name preprint))
     (str ", " (:arxiv-id preprint))
     (str ", " (:date preprint) ".  ")))))

(defcomponent papers-view [state _]
  (will-mount
   [_]
   (if-not (:papers @state)
     (GET (util/edn-endpoint "papers")
          {:headers {"Accept" "application/edn"}
           :response-format (edn-response-format)
           :handler
           (fn [resp]
             (om/transact! state :papers (constantly resp)))})))
  (render
   [_]
   (dom/div
    (for [[kind label] [[:preprint "Preprints"]
                        [:published "Published"]
                        [:thesis "Theses"]]]
      (let [papers (filter #(= kind (:kind %)) (:papers @state))]
        (if (seq papers)
          (dom/div
           {:class "talks-container"}
           (dom/div
            {:class "talks-section-header"}
            (dom/p label))
           (om/build-all paper-view papers))))))))

(defcomponent reading-view [state _]
  (will-mount
   [_]
   (if-not (:reading @state)
     (GET (util/edn-endpoint "reading")
          {:headers {"Accept" "application/edn"}
           :response-format (edn-response-format)
           :handler
           (fn [resp]
             (om/update! state :reading resp))})))
  (render
   [_]
   (dom/div
    (dom/div
      {:class "books-header"}
      (dom/p "A record of books I've read lately, to come back to later."))
    (om/build-all book-component
                  (sort (fn [x] (not (:finished x))) (:reading @state))))))

(defcomponent writing-view [state _]
  (will-mount
   [_]
   (if-not (:writing @state)
     (GET (util/edn-endpoint "writing")
          {:headers {"Accept" "application/edn"}
           :response-format (edn-response-format)
           :handler
           (fn [resp]
             (om/update! state :writing resp))})))
  (render
   [_]
   (dom/div
    (let [gen-link (fn [t l]
                     (if-not l
                       (dom/h2 t)
                       (dom/a {:href (rs/blog-page {:page l})} (dom/h2 t))))]
      (for [{:keys [title label short]} (:writing @state)]
        (dom/div
         {:class "project-container"}
         (dom/div
          {:class "project-content"}
          (gen-link title label)
          (dom/p
           {:class "project-description"}
           short))))))))

(defcomponent project-view [{:keys [title picture-url description label]} _]
  (render
   [_]
   (let [picture-url (or picture-url "/img/gray.png")]
     (dom/div
      {:class "table-div"}
      (dom/div
       (dom/div
        {:class "project-image"
         :style {:background-size "140px 140px"
                 :background (str "url('" picture-url "') no-repeat center 0")}}))
      (dom/div
       {:class "project-content"}
       (if label
         (dom/a {:href label} title)
         (dom/h1 title))

       (dom/p description))))))

(defcomponent projects-view [state _]
  (will-mount
   [_]
   (if-not (:projects @state)
     (GET (util/edn-endpoint "projects")
          {:headers {"Accept" "application/edn"}
           :response-format (edn-response-format)
           :handler
           (fn [resp]
             (om/update! state :projects resp))})))
  (render
   [_]
   (dom/div
    {:id "project-description-list"}
    (om/build-all project-view (:projects @state)))))

(defcomponent blog-item-view [state owner]
 (will-mount
   [_]
   (let [item-name (get-in @state [:navigation :args])]
     (if-not (get-in @state [:blog-items item-name])
       (GET (util/md-endpoint item-name)
            {:headers {"Accept" "text/plain"}
             :handler
             (fn [resp]
               (om/update! state [:blog-items item-name] resp))}))))
 (render
  [_]
  (dom/div
   (util/->render-md (get-in @state [:blog-items (get-in @state [:navigation :args])])))))
