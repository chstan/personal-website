import React from "react";
import {useParams} from 'react-router';
import {WRITING} from "./data";
import raw from "raw.macro";
import {Markdown,} from "./common";
import {Link} from "react-router-dom";

const FULL_POSTS = {
  arpes_1_data_prep: raw('./md/arpes_1_data_prep.md'),
  curietemp: raw('./md/curietemp.md'),
};


const Breadcrumb: React.FC<{crumbs: Array<[string, string]>}> = ({crumbs}) =>
  <header className="breadcrumb">
    ← / {crumbs.map(([to, label]) => <Link to={to}>{label}</Link>)} /
  </header>;


const BlogItem = () => {
  const { blogId } = useParams() as { blogId: string,};

  if (!FULL_POSTS.hasOwnProperty(blogId)) {
    return <p>Not Found.</p>
  }

  // @ts-ignore
  const currentItem = FULL_POSTS[blogId] as any;
  return <div className="blog-item">
    <Breadcrumb crumbs={[['/writing', 'Writing']]}/>
    <article>
      <Markdown source={currentItem}/>
    </article>
  </div>
};

const BlogPage = () => <div className="project-container">
  {WRITING.map(w => {
    return (
      <div className="project-content">
        {w.label ? <a href={`/writing/${w.label}`}><h2>{w.title}</h2></a> : <h2>{w.title}</h2>}
        <p className="project-description">{w.short}</p>
      </div>
    );
  })}
</div>;

export {
  BlogPage,
  BlogItem,
};